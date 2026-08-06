#![no_std]

use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, symbol_short, token, Address, Env, String,
    Symbol, Vec,
};

// ── Storage Keys ───────────────────────────────────────────────
const PAYMENT_COUNT: Symbol = symbol_short!("PAY_CNT");
const ESCROW_COUNT: Symbol = symbol_short!("ESC_CNT");
const STREAM_COUNT: Symbol = symbol_short!("STR_CNT");
const BATCH_COUNT: Symbol = symbol_short!("BAT_CNT");
const OWNER: Symbol = symbol_short!("OWNER");
const PAUSED: Symbol = symbol_short!("PAUSED");
const VERSION: Symbol = symbol_short!("VERSION");
const UPGRADE_HASH: Symbol = symbol_short!("UPG_HASH");
const UPGRADE_TIMELOCK: Symbol = symbol_short!("UPG_LOCK");
const STATS: Symbol = symbol_short!("STATS");
const MULTISIG_CONFIG: Symbol = symbol_short!("MULTI_CF");
const APPROVAL_COUNT: Symbol = symbol_short!("APPR_CNT");
const SPEND_LIMIT_KEY: Symbol = symbol_short!("SPNDLIM");
const ESCALATION_KEY: Symbol = symbol_short!("ESCLATN");

// ── Contract Version ───────────────────────────────────────────
const CONTRACT_VERSION: u32 = 2;

// ── Data Types ─────────────────────────────────────────────────

#[contracttype]
#[derive(Clone)]
pub struct Payment {
    pub id: u64,
    pub payer: Address,
    pub payee: Address,
    pub amount: i128,
    pub asset: Address, // SAC token address, or native XLM sentinel
    pub tx_hash: String,
    pub timestamp: u64,
    pub metadata: String,
    pub cancelled: bool,
}

/// An escrow that locks funds until released by the owner, claimed after
/// deadline, or released by an optional third-party arbiter for disputes.
#[contracttype]
#[derive(Clone)]
pub struct Escrow {
    pub id: u64,
    pub depositor: Address,
    pub beneficiary: Address,
    pub arbiter: Option<Address>,
    pub amount: i128,
    pub asset: Address,
    pub deadline: u64, // ledger timestamp when beneficiary can claim
    pub released: bool,
    pub claimed: bool,
    pub metadata: String,
}

/// A payment stream that vests tokens over time.
#[contracttype]
#[derive(Clone)]
pub struct Stream {
    pub id: u64,
    pub creator: Address,
    pub recipient: Address,
    pub total_amount: i128,
    pub claimed_amount: i128,
    pub asset: Address,
    pub start_time: u64,
    pub end_time: u64,
    pub cancelled: bool,
    pub metadata: String,
}

/// A batch of payments executed atomically.
#[contracttype]
#[derive(Clone)]
pub struct BatchPayment {
    pub id: u64,
    pub creator: Address,
    pub total_recipients: u32,
    pub total_amount: i128,
    pub asset: Address,
    pub timestamp: u64,
    pub tx_hash: String,
    pub payment_ids: Vec<u64>,
}

/// Result of a batch creation with success/failure counts.
#[contracttype]
#[derive(Clone)]
pub struct BatchCreateResult {
    pub batch_id: u64,
    pub total_requests: u32,
    pub successful: u32,
    pub failed: u32,
    pub total_amount: i128,
}

/// Aggregate statistics across all contract activity.
#[contracttype]
#[derive(Clone)]
pub struct ContractStats {
    pub total_payments_recorded: u64,
    pub total_escrows_created: u64,
    pub total_escrows_released: u64,
    pub total_escrows_claimed: u64,
    pub total_streams_created: u64,
    pub total_streams_claimed: u64,
    pub total_streams_cancelled: u64,
    pub total_batches_processed: u64,
    pub total_amount_escrowed: i128,
    pub total_amount_streamed: i128,
    pub total_amount_batched: i128,
}

/// Multisig configuration for high-value payment approvals.
#[contracttype]
#[derive(Clone)]
pub struct MultisigConfig {
    pub threshold: u32,
    pub signers: Vec<Address>,
    pub enabled: bool,
}

/// A payment proposal awaiting multisig approval.
#[contracttype]
#[derive(Clone)]
pub struct ApprovalRequest {
    pub id: u64,
    pub proposer: Address,
    pub payee: Address,
    pub amount: i128,
    pub asset: Address,
    pub tx_hash: String,
    pub approvals: Vec<Address>,
    pub executed: bool,
    pub created_at: u64,
}

/// Per-user spending limit configuration.
#[contracttype]
#[derive(Clone)]
pub struct SpendingLimit {
    pub daily_limit: i128,
    pub monthly_limit: i128,
    pub current_daily_spend: i128,
    pub current_monthly_spend: i128,
    pub last_reset_day: u64,
    pub last_reset_month: u64,
    pub is_active: bool,
}

/// Escalation rules for spending enforcement.
#[contracttype]
#[derive(Clone)]
pub struct EscalationRules {
    pub small_threshold: i128,  // auto-approve below this
    pub medium_threshold: i128, // log above this
    pub enabled: bool,          // above medium → requires admin approval
}

/// Result of a spending limit check.
#[contracttype]
#[derive(Clone)]
pub enum SpendCheckResult {
    Approved,
    Escalated,
    Rejected,
}

#[contracterror]
#[derive(Clone, Debug, PartialEq, Eq)]
#[repr(u32)]
pub enum PaymentError {
    NotInitialized = 1,
    AlreadyInitialized = 2,
    PaymentNotFound = 3,
    Unauthorized = 4,
    InvalidAmount = 5,
    EscrowNotDue = 6,
    EscrowAlreadyReleased = 7,
    EscrowNotFound = 8,
    StreamNotStarted = 9,
    StreamAlreadyCancelled = 10,
    StreamNotFound = 11,
    StreamFullyClaimed = 12,
    BatchTooLarge = 13,
    BatchEmpty = 14,
    TokenTransferFailed = 15,
    InsufficientBalance = 16,
    PaymentAlreadyCancelled = 17,
    ContractPaused = 18,
    NoTokensToWithdraw = 19,
    UpgradeNotProposed = 20,
    UpgradeTimelockActive = 21,
    MultisigNotConfigured = 22,
    NotASigner = 23,
    AlreadyApproved = 24,
    ThresholdNotMet = 25,
    AlreadyExecuted = 26,
}

// ── Native Events ──────────────────────────────────────────────

fn emit_payment_event(env: &Env, payer: &Address, payee: &Address, amount: &i128) {
    env.events()
        .publish((Symbol::new(env, "payment"), payer.clone(), payee.clone()), *amount);
}

fn emit_escrow_event(env: &Env, depositor: &Address, beneficiary: &Address, amount: &i128) {
    env.events().publish(
        (Symbol::new(env, "escrow"), depositor.clone(), beneficiary.clone()),
        *amount,
    );
}

fn emit_stream_event(env: &Env, creator: &Address, recipient: &Address, amount: &i128) {
    env.events().publish(
        (Symbol::new(env, "stream"), creator.clone(), recipient.clone()),
        *amount,
    );
}

/// Increment a u64 stat field.
fn inc_stat_u64(env: &Env, get: fn(&ContractStats) -> u64, set: fn(&mut ContractStats, u64)) {
    let mut stats: ContractStats = env.storage().instance().get(&STATS).unwrap_or(ContractStats {
        total_payments_recorded: 0, total_escrows_created: 0, total_escrows_released: 0,
        total_escrows_claimed: 0, total_streams_created: 0, total_streams_claimed: 0,
        total_streams_cancelled: 0, total_batches_processed: 0,
        total_amount_escrowed: 0, total_amount_streamed: 0, total_amount_batched: 0,
    });
    set(&mut stats, get(&stats).saturating_add(1));
    env.storage().instance().set(&STATS, &stats);
    env.storage().instance().extend_ttl(5000, 50000);
}

/// Add an amount to an i128 stat field.
fn add_stat_amount(env: &Env, get: fn(&ContractStats) -> i128, set: fn(&mut ContractStats, i128), delta: i128) {
    let mut stats: ContractStats = env.storage().instance().get(&STATS).unwrap_or(ContractStats {
        total_payments_recorded: 0, total_escrows_created: 0, total_escrows_released: 0,
        total_escrows_claimed: 0, total_streams_created: 0, total_streams_claimed: 0,
        total_streams_cancelled: 0, total_batches_processed: 0,
        total_amount_escrowed: 0, total_amount_streamed: 0, total_amount_batched: 0,
    });
    set(&mut stats, get(&stats).saturating_add(delta));
    env.storage().instance().set(&STATS, &stats);
    env.storage().instance().extend_ttl(5000, 50000);
}

/// Guard: reject all write operations while the contract is paused.
fn require_not_paused(env: &Env) -> Result<(), PaymentError> {
    let paused: bool = env.storage().instance().get(&PAUSED).unwrap_or(false);
    if paused {
        return Err(PaymentError::ContractPaused);
    }
    Ok(())
}

/// Calculate linearly vested amount with overflow protection.
fn compute_vested(total_amount: i128, start_time: u64, end_time: u64, now: u64) -> i128 {
    if now >= end_time {
        return total_amount;
    }
    if now <= start_time {
        return 0;
    }
    let elapsed = (now - start_time) as i128;
    let total_duration = (end_time - start_time) as i128;
    if total_duration == 0 {
        return total_amount;
    }
    // Checked multiply to prevent overflow; return 0 on overflow (safe default)
    total_amount
        .checked_mul(elapsed)
        .map(|product| product / total_duration)
        .unwrap_or(0)
}

// ── Contract ───────────────────────────────────────────────────

#[contract]
pub struct OphirPayContract;

#[contractimpl]
impl OphirPayContract {
    // ═══════════════════════════════════════════════════════════
    //  ADMIN
    // ═══════════════════════════════════════════════════════════

    /// Initialize the contract with owner address.
    pub fn init(env: Env, owner: Address) -> Result<u32, PaymentError> {
        if env.storage().instance().has(&OWNER) {
            return Err(PaymentError::AlreadyInitialized);
        }
        owner.require_auth();
        env.storage().instance().set(&OWNER, &owner);
        env.storage().instance().set(&VERSION, &CONTRACT_VERSION);
        env.storage().instance().set(&PAYMENT_COUNT, &0u64);
        env.storage().instance().set(&ESCROW_COUNT, &0u64);
        env.storage().instance().set(&STREAM_COUNT, &0u64);
        env.storage().instance().set(&BATCH_COUNT, &0u64);
        let stats = ContractStats {
            total_payments_recorded: 0,
            total_escrows_created: 0,
            total_escrows_released: 0,
            total_escrows_claimed: 0,
            total_streams_created: 0,
            total_streams_claimed: 0,
            total_streams_cancelled: 0,
            total_batches_processed: 0,
            total_amount_escrowed: 0,
            total_amount_streamed: 0,
            total_amount_batched: 0,
        };
        env.storage().instance().set(&STATS, &stats);
        env.storage().instance().extend_ttl(5000, 50000);
        Ok(CONTRACT_VERSION)
    }

    /// Get the owner
    pub fn get_owner(env: Env) -> Result<Address, PaymentError> {
        env.storage()
            .instance()
            .get(&OWNER)
            .ok_or(PaymentError::NotInitialized)
    }

    /// Get contract version
    pub fn get_version(env: Env) -> u32 {
        env.storage().instance().get(&VERSION).unwrap_or(0)
    }

    /// Get aggregate contract statistics.
    pub fn get_stats(env: Env) -> ContractStats {
        env.storage()
            .instance()
            .get(&STATS)
            .unwrap_or(ContractStats {
                total_payments_recorded: 0,
                total_escrows_created: 0,
                total_escrows_released: 0,
                total_escrows_claimed: 0,
                total_streams_created: 0,
                total_streams_claimed: 0,
                total_streams_cancelled: 0,
                total_batches_processed: 0,
                total_amount_escrowed: 0,
                total_amount_streamed: 0,
                total_amount_batched: 0,
            })
    }

    // ═══════════════════════════════════════════════════════════
    //  MULTISIG APPROVALS — N-of-M signers for large payments
    // ═══════════════════════════════════════════════════════════

    /// Configure multisig (owner only). Set threshold and signer list.
    pub fn set_multisig_config(
        env: Env,
        caller: Address,
        threshold: u32,
        signers: Vec<Address>,
        enabled: bool,
    ) -> Result<(), PaymentError> {
        caller.require_auth();
        let owner: Address = env
            .storage()
            .instance()
            .get(&OWNER)
            .ok_or(PaymentError::NotInitialized)?;
        if caller != owner {
            return Err(PaymentError::Unauthorized);
        }
        if threshold == 0 || threshold > signers.len() as u32 {
            return Err(PaymentError::InvalidAmount);
        }
        let config = MultisigConfig { threshold, signers, enabled };
        env.storage().instance().set(&MULTISIG_CONFIG, &config);
        env.storage().instance().extend_ttl(5000, 50000);
        Ok(())
    }

    /// Get current multisig config.
    pub fn get_multisig_config(env: Env) -> Option<MultisigConfig> {
        env.storage().instance().get(&MULTISIG_CONFIG)
    }

    /// Propose a payment that requires multisig approval.
    pub fn propose_payment(
        env: Env,
        proposer: Address,
        payee: Address,
        amount: i128,
        asset: Address,
        tx_hash: String,
    ) -> Result<u64, PaymentError> {
        proposer.require_auth();
        require_not_paused(&env)?;

        let config: MultisigConfig = env
            .storage()
            .instance()
            .get(&MULTISIG_CONFIG)
            .ok_or(PaymentError::MultisigNotConfigured)?;
        if !config.enabled {
            return Err(PaymentError::MultisigNotConfigured);
        }

        let mut count: u64 = env.storage().instance().get(&APPROVAL_COUNT).unwrap_or(0);
        count += 1;

        let approvals: Vec<Address> = Vec::new(&env);
        let request = ApprovalRequest {
            id: count,
            proposer,
            payee,
            amount,
            asset,
            tx_hash,
            approvals,
            executed: false,
            created_at: env.ledger().timestamp(),
        };

        env.storage().persistent().set(&count, &request);
        env.storage().persistent().extend_ttl(&count, 5000, 50000);
        env.storage().instance().set(&APPROVAL_COUNT, &count);
        env.storage().instance().extend_ttl(5000, 50000);

        env.events().publish(
            (Symbol::new(&env, "approval"), Symbol::new(&env, "proposed")),
            count,
        );

        Ok(count)
    }

    /// Signer approves a pending payment proposal.
    pub fn approve_payment(
        env: Env,
        signer: Address,
        request_id: u64,
    ) -> Result<bool, PaymentError> {
        signer.require_auth();
        require_not_paused(&env)?;

        let config: MultisigConfig = env
            .storage()
            .instance()
            .get(&MULTISIG_CONFIG)
            .ok_or(PaymentError::MultisigNotConfigured)?;

        // Verify signer is in the list
        let is_signer = config.signers.iter().any(|s| *s == signer);
        if !is_signer {
            return Err(PaymentError::NotASigner);
        }

        let mut request: ApprovalRequest = env
            .storage()
            .persistent()
            .get(&request_id)
            .ok_or(PaymentError::PaymentNotFound)?;

        if request.executed {
            return Err(PaymentError::AlreadyExecuted);
        }

        // Check for duplicate approval
        if request.approvals.iter().any(|a| *a == signer) {
            return Err(PaymentError::AlreadyApproved);
        }

        request.approvals.push_back(signer.clone());
        env.storage().persistent().set(&request_id, &request);
        env.storage().persistent().extend_ttl(&request_id, 5000, 50000);

        let threshold_met = request.approvals.len() >= config.threshold as u32;

        env.events().publish(
            (Symbol::new(&env, "approval"), Symbol::new(&env, "approved")),
            (request_id, signer),
        );

        Ok(threshold_met)
    }

    /// Execute a fully-approved payment (any signer can trigger).
    pub fn execute_approved_payment(
        env: Env,
        caller: Address,
        request_id: u64,
    ) -> Result<u64, PaymentError> {
        caller.require_auth();
        require_not_paused(&env)?;

        let config: MultisigConfig = env
            .storage()
            .instance()
            .get(&MULTISIG_CONFIG)
            .ok_or(PaymentError::MultisigNotConfigured)?;

        let mut request: ApprovalRequest = env
            .storage()
            .persistent()
            .get(&request_id)
            .ok_or(PaymentError::PaymentNotFound)?;

        if request.executed {
            return Err(PaymentError::AlreadyExecuted);
        }
        if (request.approvals.len() as u32) < config.threshold {
            return Err(PaymentError::ThresholdNotMet);
        }

        // Record the payment
        let mut pay_count: u64 = env.storage().instance().get(&PAYMENT_COUNT).unwrap_or(0);
        pay_count += 1;

        let payment = Payment {
            id: pay_count,
            payer: request.proposer.clone(),
            payee: request.payee.clone(),
            amount: request.amount,
            asset: request.asset.clone(),
            tx_hash: request.tx_hash.clone(),
            timestamp: env.ledger().timestamp(),
            metadata: String::from_str(&env, "multisig"),
            cancelled: false,
        };

        env.storage().persistent().set(&pay_count, &payment);
        env.storage().persistent().extend_ttl(&pay_count, 5000, 50000);
        env.storage().instance().set(&PAYMENT_COUNT, &pay_count);
        env.storage().instance().extend_ttl(5000, 50000);

        request.executed = true;
        env.storage().persistent().set(&request_id, &request);
        env.storage().persistent().extend_ttl(&request_id, 5000, 50000);

        inc_stat_u64(&env, |s| s.total_payments_recorded, |s, v| s.total_payments_recorded = v);

        env.events().publish(
            (Symbol::new(&env, "approval"), Symbol::new(&env, "executed")),
            (request_id, pay_count),
        );

        Ok(pay_count)
    }

    /// Get an approval request by ID.
    pub fn get_approval_request(env: Env, request_id: u64) -> Option<ApprovalRequest> {
        env.storage().persistent().get(&request_id)
    }

    // ═══════════════════════════════════════════════════════════
    //  SPENDING LIMITS — Per-user caps with escalation tiers
    // ═══════════════════════════════════════════════════════════

    /// Set spending limits for a user (owner only).
    pub fn set_spending_limit(
        env: Env,
        caller: Address,
        user: Address,
        daily_limit: i128,
        monthly_limit: i128,
        is_active: bool,
    ) -> Result<(), PaymentError> {
        caller.require_auth();
        let owner: Address = env
            .storage()
            .instance()
            .get(&OWNER)
            .ok_or(PaymentError::NotInitialized)?;
        if caller != owner {
            return Err(PaymentError::Unauthorized);
        }
        let limit = SpendingLimit {
            daily_limit,
            monthly_limit,
            current_daily_spend: 0,
            current_monthly_spend: 0,
            last_reset_day: env.ledger().timestamp(),
            last_reset_month: env.ledger().timestamp(),
            is_active,
        };
        let key = (SPEND_LIMIT_KEY, user);
        env.storage().persistent().set(&key, &limit);
        env.storage().persistent().extend_ttl(&key, 5000, 50000);
        Ok(())
    }

    /// Get spending limit for a user.
    pub fn get_spending_limit(env: Env, user: Address) -> Option<SpendingLimit> {
        let key = (SPEND_LIMIT_KEY, user);
        env.storage().persistent().get(&key)
    }

    /// Configure escalation rules (owner only).
    pub fn configure_escalation(
        env: Env,
        caller: Address,
        small_threshold: i128,
        medium_threshold: i128,
        enabled: bool,
    ) -> Result<(), PaymentError> {
        caller.require_auth();
        let owner: Address = env
            .storage()
            .instance()
            .get(&OWNER)
            .ok_or(PaymentError::NotInitialized)?;
        if caller != owner {
            return Err(PaymentError::Unauthorized);
        }
        if small_threshold <= 0 || medium_threshold <= small_threshold {
            return Err(PaymentError::InvalidAmount);
        }
        let rules = EscalationRules { small_threshold, medium_threshold, enabled };
        env.storage().instance().set(&ESCALATION_KEY, &rules);
        env.storage().instance().extend_ttl(5000, 50000);
        Ok(())
    }

    /// Check if a spend is within limits and escalation rules.
    /// Returns Approved, Escalated, or Rejected.
    pub fn check_spending(
        env: Env,
        user: Address,
        amount: i128,
    ) -> SpendCheckResult {
        // Check escalation rules
        if let Some(rules) = env.storage().instance().get::<EscalationRules>(&ESCALATION_KEY) {
            if rules.enabled {
                if amount >= rules.medium_threshold {
                    return SpendCheckResult::Escalated;
                }
                if amount >= rules.small_threshold {
                    // Logged but auto-approved — could emit an event here
                }
            }
        }

        // Check per-user spending limits
        let key = (SPEND_LIMIT_KEY, user.clone());
        if let Some(mut limit) = env.storage().persistent().get::<SpendingLimit>(&key) {
            if !limit.is_active {
                return SpendCheckResult::Rejected;
            }

            let now = env.ledger().timestamp();
            let day_seconds: u64 = 86400;
            let month_seconds: u64 = 30 * 86400;

            // Reset daily counter if a day has passed
            if now.saturating_sub(limit.last_reset_day) >= day_seconds {
                limit.current_daily_spend = 0;
                limit.last_reset_day = now;
            }
            // Reset monthly counter if 30 days have passed
            if now.saturating_sub(limit.last_reset_month) >= month_seconds {
                limit.current_monthly_spend = 0;
                limit.last_reset_month = now;
            }

            // Check limits
            if limit.current_daily_spend.saturating_add(amount) > limit.daily_limit {
                return SpendCheckResult::Rejected;
            }
            if limit.current_monthly_spend.saturating_add(amount) > limit.monthly_limit {
                return SpendCheckResult::Rejected;
            }

            // Update spending counters
            limit.current_daily_spend = limit.current_daily_spend.saturating_add(amount);
            limit.current_monthly_spend = limit.current_monthly_spend.saturating_add(amount);
            env.storage().persistent().set(&key, &limit);
            env.storage().persistent().extend_ttl(&key, 5000, 50000);
        }

        SpendCheckResult::Approved
    }

    /// Pause all state-changing operations (owner only).
    pub fn pause(env: Env, caller: Address) -> Result<(), PaymentError> {
        caller.require_auth();
        let owner: Address = env
            .storage()
            .instance()
            .get(&OWNER)
            .ok_or(PaymentError::NotInitialized)?;
        if caller != owner {
            return Err(PaymentError::Unauthorized);
        }
        env.storage().instance().set(&PAUSED, &true);
        env.storage().instance().extend_ttl(5000, 50000);
        Ok(())
    }

    /// Unpause all state-changing operations (owner only).
    pub fn unpause(env: Env, caller: Address) -> Result<(), PaymentError> {
        caller.require_auth();
        let owner: Address = env
            .storage()
            .instance()
            .get(&OWNER)
            .ok_or(PaymentError::NotInitialized)?;
        if caller != owner {
            return Err(PaymentError::Unauthorized);
        }
        env.storage().instance().set(&PAUSED, &false);
        env.storage().instance().extend_ttl(5000, 50000);
        Ok(())
    }

    /// Check if the contract is paused.
    pub fn is_paused(env: Env) -> bool {
        env.storage().instance().get(&PAUSED).unwrap_or(false)
    }

    /// Emergency withdraw: owner can rescue tokens accidentally sent directly
    /// to this contract (bypassing escrow/stream creation). Only withdraws
    /// tokens NOT locked in active escrows or streams.
    pub fn emergency_withdraw(
        env: Env,
        caller: Address,
        asset: Address,
        amount: i128,
    ) -> Result<(), PaymentError> {
        caller.require_auth();
        let owner: Address = env
            .storage()
            .instance()
            .get(&OWNER)
            .ok_or(PaymentError::NotInitialized)?;
        if caller != owner {
            return Err(PaymentError::Unauthorized);
        }
        if amount <= 0 {
            return Err(PaymentError::NoTokensToWithdraw);
        }

        let token_client = token::Client::new(&env, &asset);
        let contract_addr = env.current_contract_address();
        token_client.transfer(&contract_addr, &owner, &amount);
        Ok(())
    }

    /// Propose a contract upgrade (owner only). Sets a 24-hour timelock.
    /// After the timelock expires, anyone can call `execute_upgrade`.
    pub fn propose_upgrade(
        env: Env,
        caller: Address,
        new_wasm_hash: soroban_sdk::BytesN<32>,
    ) -> Result<(), PaymentError> {
        caller.require_auth();
        let owner: Address = env
            .storage()
            .instance()
            .get(&OWNER)
            .ok_or(PaymentError::NotInitialized)?;
        if caller != owner {
            return Err(PaymentError::Unauthorized);
        }
        let unlock_at = env.ledger().timestamp() + 86400; // 24 hours
        env.storage().instance().set(&UPGRADE_HASH, &new_wasm_hash);
        env.storage().instance().set(&UPGRADE_TIMELOCK, &unlock_at);
        env.storage().instance().extend_ttl(5000, 50000);
        Ok(())
    }

    /// Execute a previously proposed upgrade after the timelock expires.
    pub fn execute_upgrade(env: Env) -> Result<(), PaymentError> {
        let new_wasm_hash: soroban_sdk::BytesN<32> = env
            .storage()
            .instance()
            .get(&UPGRADE_HASH)
            .ok_or(PaymentError::UpgradeNotProposed)?;

        let unlock_at: u64 = env
            .storage()
            .instance()
            .get(&UPGRADE_TIMELOCK)
            .unwrap_or(0);

        if env.ledger().timestamp() < unlock_at {
            return Err(PaymentError::UpgradeTimelockActive);
        }

        // Clear the pending upgrade
        env.storage().instance().remove(&UPGRADE_HASH);
        env.storage().instance().remove(&UPGRADE_TIMELOCK);
        env.storage().instance().extend_ttl(5000, 50000);

        env.deployer().update_current_contract_wasm(new_wasm_hash);
        Ok(())
    }

    /// Cancel a pending upgrade (owner only).
    pub fn cancel_upgrade(env: Env, caller: Address) -> Result<(), PaymentError> {
        caller.require_auth();
        let owner: Address = env
            .storage()
            .instance()
            .get(&OWNER)
            .ok_or(PaymentError::NotInitialized)?;
        if caller != owner {
            return Err(PaymentError::Unauthorized);
        }
        env.storage().instance().remove(&UPGRADE_HASH);
        env.storage().instance().remove(&UPGRADE_TIMELOCK);
        env.storage().instance().extend_ttl(5000, 50000);
        Ok(())
    }

    /// Transfer ownership.
    pub fn transfer_ownership(
        env: Env,
        caller: Address,
        new_owner: Address,
    ) -> Result<(), PaymentError> {
        caller.require_auth();
        let owner: Address = env
            .storage()
            .instance()
            .get(&OWNER)
            .ok_or(PaymentError::NotInitialized)?;
        if caller != owner {
            return Err(PaymentError::Unauthorized);
        }
        env.storage().instance().set(&OWNER, &new_owner);
        env.storage().instance().extend_ttl(5000, 50000);
        Ok(())
    }

    // ═══════════════════════════════════════════════════════════
    //  PAYMENT RECORDS (for Horizon-based XLM payments)
    // ═══════════════════════════════════════════════════════════

    /// Record an off-chain payment on the Soroban ledger.
    /// Anyone can call — this just stores a record, no tokens move.
    pub fn record_payment(
        env: Env,
        payer: Address,
        payee: Address,
        amount: i128,
        asset: Address,
        tx_hash: String,
        metadata: String,
    ) -> Result<u64, PaymentError> {
        payer.require_auth();
        require_not_paused(&env)?;
        if amount <= 0 {
            return Err(PaymentError::InvalidAmount);
        }

        let mut count: u64 = env.storage().instance().get(&PAYMENT_COUNT).unwrap_or(0);
        count += 1;

        let payment = Payment {
            id: count,
            payer: payer.clone(),
            payee: payee.clone(),
            amount,
            asset,
            tx_hash: tx_hash.clone(),
            timestamp: env.ledger().timestamp(),
            metadata,
            cancelled: false,
        };

        env.storage().persistent().set(&count, &payment);
        env.storage().persistent().extend_ttl(&count, 5000, 50000);
        env.storage().instance().set(&PAYMENT_COUNT, &count);
        env.storage().instance().extend_ttl(5000, 50000);

        // Native event
        emit_payment_event(&env, &payer, &payee, &amount);

        inc_stat_u64(&env, |s| s.total_payments_recorded, |s, v| s.total_payments_recorded = v);

        Ok(count)
    }

    /// Get a payment by ID
    pub fn get_payment(env: Env, payment_id: u64) -> Result<Payment, PaymentError> {
        env.storage()
            .persistent()
            .get(&payment_id)
            .ok_or(PaymentError::PaymentNotFound)
    }

    /// Get total payment count
    pub fn get_payment_count(env: Env) -> u64 {
        env.storage().instance().get(&PAYMENT_COUNT).unwrap_or(0)
    }

    /// Get range of payments
    pub fn get_payments_range(env: Env, start_id: u64, end_id: u64) -> Vec<Payment> {
        let mut payments = Vec::new(&env);
        for id in start_id..=end_id {
            if let Some(p) = env.storage().persistent().get(&id) {
                payments.push_back(p);
            }
        }
        payments
    }

    /// Cancel a payment record (owner only). Idempotent — re-cancelling is an error.
    pub fn cancel_payment(
        env: Env,
        caller: Address,
        payment_id: u64,
    ) -> Result<(), PaymentError> {
        caller.require_auth();
        let owner: Address = env
            .storage()
            .instance()
            .get(&OWNER)
            .ok_or(PaymentError::NotInitialized)?;
        if caller != owner {
            return Err(PaymentError::Unauthorized);
        }

        let mut payment: Payment = env
            .storage()
            .persistent()
            .get(&payment_id)
            .ok_or(PaymentError::PaymentNotFound)?;

        if payment.cancelled {
            return Err(PaymentError::PaymentAlreadyCancelled);
        }

        payment.cancelled = true;
        env.storage().persistent().set(&payment_id, &payment);
        env.storage().persistent().extend_ttl(&payment_id, 5000, 50000);
        Ok(())
    }

    // ═══════════════════════════════════════════════════════════
    //  ESCROW — Lock funds, release on command or deadline
    // ═══════════════════════════════════════════════════════════

    /// Create an escrow. Tokens are transferred from depositor to this contract.
    /// The beneficiary can claim after `deadline`; owner can release early;
    /// optional arbiter can resolve disputes.
    pub fn create_escrow(
        env: Env,
        depositor: Address,
        beneficiary: Address,
        arbiter: Option<Address>,
        amount: i128,
        asset: Address,
        deadline: u64,
        metadata: String,
    ) -> Result<u64, PaymentError> {
        depositor.require_auth();
        require_not_paused(&env)?;
        if amount <= 0 {
            return Err(PaymentError::InvalidAmount);
        }

        // Transfer tokens from depositor to this contract
        let token_client = token::Client::new(&env, &asset);
        let contract_addr = env.current_contract_address();
        token_client.transfer(&depositor, &contract_addr, &amount);

        let mut count: u64 = env.storage().instance().get(&ESCROW_COUNT).unwrap_or(0);
        count += 1;

        let escrow = Escrow {
            id: count,
            depositor,
            beneficiary: beneficiary.clone(),
            arbiter: arbiter.clone(),
            amount,
            asset,
            deadline,
            released: false,
            claimed: false,
            metadata,
        };

        env.storage().persistent().set(&count, &escrow);
        env.storage().persistent().extend_ttl(&count, 5000, 50000);
        env.storage().instance().set(&ESCROW_COUNT, &count);
        env.storage().instance().extend_ttl(5000, 50000);

        emit_escrow_event(&env, &env.current_contract_address(), &beneficiary, &amount);

        inc_stat_u64(&env, |s| s.total_escrows_created, |s, v| s.total_escrows_created = v);
        add_stat_amount(&env, |s| s.total_amount_escrowed, |s, v| s.total_amount_escrowed = v, amount);

        Ok(count)
    }

    /// Owner releases escrow to the beneficiary (anytime).
    pub fn release_escrow(
        env: Env,
        owner: Address,
        escrow_id: u64,
    ) -> Result<(), PaymentError> {
        owner.require_auth();
        require_not_paused(&env)?;
        let stored_owner: Address = env
            .storage()
            .instance()
            .get(&OWNER)
            .ok_or(PaymentError::NotInitialized)?;
        if owner != stored_owner {
            return Err(PaymentError::Unauthorized);
        }

        let mut escrow: Escrow = env
            .storage()
            .persistent()
            .get(&escrow_id)
            .ok_or(PaymentError::EscrowNotFound)?;

        if escrow.released || escrow.claimed {
            return Err(PaymentError::EscrowAlreadyReleased);
        }

        // Transfer tokens to beneficiary
        let token_client = token::Client::new(&env, &escrow.asset);
        let contract_addr = env.current_contract_address();
        token_client.transfer(&contract_addr, &escrow.beneficiary, &escrow.amount);

        escrow.released = true;
        escrow.claimed = true;
        env.storage().persistent().set(&escrow_id, &escrow);
        env.storage().persistent().extend_ttl(&escrow_id, 5000, 50000);

        inc_stat_u64(&env, |s| s.total_escrows_released, |s, v| s.total_escrows_released = v);

        Ok(())
    }

    /// Arbiter releases escrow to either party (dispute resolution).
    /// Only the escrow's designated arbiter can call this.
    pub fn release_by_arbiter(
        env: Env,
        arbiter: Address,
        escrow_id: u64,
        release_to_beneficiary: bool,
    ) -> Result<(), PaymentError> {
        arbiter.require_auth();
        require_not_paused(&env)?;

        let mut escrow: Escrow = env
            .storage()
            .persistent()
            .get(&escrow_id)
            .ok_or(PaymentError::EscrowNotFound)?;

        // Verify caller is the designated arbiter
        match &escrow.arbiter {
            Some(a) if *a == arbiter => {}
            _ => return Err(PaymentError::Unauthorized),
        }

        if escrow.released || escrow.claimed {
            return Err(PaymentError::EscrowAlreadyReleased);
        }

        let recipient = if release_to_beneficiary {
            escrow.beneficiary.clone()
        } else {
            escrow.depositor.clone()
        };

        let token_client = token::Client::new(&env, &escrow.asset);
        let contract_addr = env.current_contract_address();
        token_client.transfer(&contract_addr, &recipient, &escrow.amount);

        escrow.released = true;
        escrow.claimed = true;
        env.storage().persistent().set(&escrow_id, &escrow);
        env.storage().persistent().extend_ttl(&escrow_id, 5000, 50000);

        inc_stat_u64(&env, |s| s.total_escrows_released, |s, v| s.total_escrows_released = v);

        Ok(())
    }

    /// Beneficiary claims escrow after deadline.
    pub fn claim_escrow(env: Env, beneficiary: Address, escrow_id: u64) -> Result<(), PaymentError> {
        beneficiary.require_auth();
        require_not_paused(&env)?;

        let mut escrow: Escrow = env
            .storage()
            .persistent()
            .get(&escrow_id)
            .ok_or(PaymentError::EscrowNotFound)?;

        if beneficiary != escrow.beneficiary {
            return Err(PaymentError::Unauthorized);
        }
        if escrow.released || escrow.claimed {
            return Err(PaymentError::EscrowAlreadyReleased);
        }
        if env.ledger().timestamp() < escrow.deadline {
            return Err(PaymentError::EscrowNotDue);
        }

        let token_client = token::Client::new(&env, &escrow.asset);
        let contract_addr = env.current_contract_address();
        token_client.transfer(&contract_addr, &beneficiary, &escrow.amount);

        escrow.claimed = true;
        env.storage().persistent().set(&escrow_id, &escrow);
        env.storage().persistent().extend_ttl(&escrow_id, 5000, 50000);

        inc_stat_u64(&env, |s| s.total_escrows_claimed, |s, v| s.total_escrows_claimed = v);

        Ok(())
    }

    /// Get escrow by ID
    pub fn get_escrow(env: Env, escrow_id: u64) -> Result<Escrow, PaymentError> {
        env.storage()
            .persistent()
            .get(&escrow_id)
            .ok_or(PaymentError::EscrowNotFound)
    }

    /// Get escrow count
    pub fn get_escrow_count(env: Env) -> u64 {
        env.storage().instance().get(&ESCROW_COUNT).unwrap_or(0)
    }

    // ═══════════════════════════════════════════════════════════
    //  PAYMENT STREAMING — Vest tokens linearly over time
    // ═══════════════════════════════════════════════════════════

    /// Create a payment stream. Tokens are locked and vest linearly.
    pub fn create_stream(
        env: Env,
        creator: Address,
        recipient: Address,
        total_amount: i128,
        asset: Address,
        start_time: u64,
        end_time: u64,
        metadata: String,
    ) -> Result<u64, PaymentError> {
        creator.require_auth();
        require_not_paused(&env)?;
        if total_amount <= 0 {
            return Err(PaymentError::InvalidAmount);
        }
        if end_time <= start_time {
            return Err(PaymentError::InvalidAmount);
        }

        // Transfer total amount from creator to contract
        let token_client = token::Client::new(&env, &asset);
        let contract_addr = env.current_contract_address();
        token_client.transfer(&creator, &contract_addr, &total_amount);

        let mut count: u64 = env.storage().instance().get(&STREAM_COUNT).unwrap_or(0);
        count += 1;

        let stream = Stream {
            id: count,
            creator,
            recipient: recipient.clone(),
            total_amount,
            claimed_amount: 0,
            asset,
            start_time,
            end_time,
            cancelled: false,
            metadata,
        };

        env.storage().persistent().set(&count, &stream);
        env.storage().persistent().extend_ttl(&count, 5000, 50000);
        env.storage().instance().set(&STREAM_COUNT, &count);
        env.storage().instance().extend_ttl(5000, 50000);

        emit_stream_event(&env, &env.current_contract_address(), &recipient, &total_amount);

        inc_stat_u64(&env, |s| s.total_streams_created, |s, v| s.total_streams_created = v);
        add_stat_amount(&env, |s| s.total_amount_streamed, |s, v| s.total_amount_streamed = v, total_amount);

        Ok(count)
    }

    /// Claim vested tokens from a stream. Can be called any time.
    pub fn claim_stream(env: Env, recipient: Address, stream_id: u64) -> Result<i128, PaymentError> {
        recipient.require_auth();
        require_not_paused(&env)?;

        let mut stream: Stream = env
            .storage()
            .persistent()
            .get(&stream_id)
            .ok_or(PaymentError::StreamNotFound)?;

        if recipient != stream.recipient {
            return Err(PaymentError::Unauthorized);
        }
        if stream.cancelled {
            return Err(PaymentError::StreamAlreadyCancelled);
        }

        let now = env.ledger().timestamp();
        if now < stream.start_time {
            return Err(PaymentError::StreamNotStarted);
        }

        // Calculate vested amount linearly with overflow protection
        let vested = compute_vested(
            stream.total_amount,
            stream.start_time,
            stream.end_time,
            now,
        );

        let claimable = vested - stream.claimed_amount;
        if claimable <= 0 {
            return Err(PaymentError::StreamFullyClaimed);
        }

        // Transfer claimable amount to recipient
        let token_client = token::Client::new(&env, &stream.asset);
        let contract_addr = env.current_contract_address();
        token_client.transfer(&contract_addr, &recipient, &claimable);

        stream.claimed_amount += claimable;
        env.storage().persistent().set(&stream_id, &stream);
        env.storage().persistent().extend_ttl(&stream_id, 5000, 50000);

        inc_stat_u64(&env, |s| s.total_streams_claimed, |s, v| s.total_streams_claimed = v);

        Ok(claimable)
    }

    /// Creator cancels a stream. Unvested tokens are returned to creator.
    pub fn cancel_stream(
        env: Env,
        creator: Address,
        stream_id: u64,
    ) -> Result<i128, PaymentError> {
        creator.require_auth();
        require_not_paused(&env)?;

        let mut stream: Stream = env
            .storage()
            .persistent()
            .get(&stream_id)
            .ok_or(PaymentError::StreamNotFound)?;

        if creator != stream.creator {
            return Err(PaymentError::Unauthorized);
        }
        if stream.cancelled {
            return Err(PaymentError::StreamAlreadyCancelled);
        }

        let now = env.ledger().timestamp();
        let vested = compute_vested(
            stream.total_amount,
            stream.start_time,
            stream.end_time,
            now,
        );

        let unvested = stream
            .total_amount
            .saturating_sub(vested)
            .saturating_sub(stream.claimed_amount);

        stream.cancelled = true;
        env.storage().persistent().set(&stream_id, &stream);
        env.storage().persistent().extend_ttl(&stream_id, 5000, 50000);

        if unvested > 0 {
            let token_client = token::Client::new(&env, &stream.asset);
            let contract_addr = env.current_contract_address();
            token_client.transfer(&contract_addr, &creator, &unvested);
        }

        inc_stat_u64(&env, |s| s.total_streams_cancelled, |s, v| s.total_streams_cancelled = v);

        Ok(unvested)
    }

    /// Get a stream by ID
    pub fn get_stream(env: Env, stream_id: u64) -> Result<Stream, PaymentError> {
        env.storage()
            .persistent()
            .get(&stream_id)
            .ok_or(PaymentError::StreamNotFound)
    }

    /// Get stream count
    pub fn get_stream_count(env: Env) -> u64 {
        env.storage().instance().get(&STREAM_COUNT).unwrap_or(0)
    }

    // ═══════════════════════════════════════════════════════════
    //  BATCH PAYMENTS — Record multiple payments atomically
    // ═══════════════════════════════════════════════════════════

    /// Record a batch of payments with partial failure support.
    /// Valid entries are processed; invalid (zero amount, out-of-range index)
    /// entries are skipped and counted as failures. The batch succeeds as
    /// long as at least one payment was recorded.
    pub fn create_batch(
        env: Env,
        creator: Address,
        payees: Vec<Address>,
        amounts: Vec<i128>,
        asset: Address,
        tx_hash: String,
    ) -> Result<BatchCreateResult, PaymentError> {
        creator.require_auth();
        require_not_paused(&env)?;

        let len = payees.len();
        if len == 0 {
            return Err(PaymentError::BatchEmpty);
        }
        if len > 100 {
            return Err(PaymentError::BatchTooLarge);
        }

        let mut total_amount: i128 = 0;
        let mut pay_count: u64 = env.storage().instance().get(&PAYMENT_COUNT).unwrap_or(0);
        let mut payment_ids: Vec<u64> = Vec::new(&env);
        let mut actual_recipients: u32 = 0;
        let successful: u32;
        let failed: u32;

        // Two-pass: collect valid entries, then execute
        for i in 0..len {
            let amount = if i < amounts.len() as u32 {
                amounts.get(i).unwrap_or(0)
            } else {
                0 // out-of-range → skip
            };
            let payee = payees.get(i);

            // Skip invalid entries (zero/negative amount or missing payee)
            if amount <= 0 {
                continue;
            }
            total_amount += amount;
            pay_count += 1;
            actual_recipients += 1;
            payment_ids.push_back(pay_count);

            let payment = Payment {
                id: pay_count,
                payer: creator.clone(),
                payee: payee.clone(),
                amount,
                asset: asset.clone(),
                tx_hash: tx_hash.clone(),
                timestamp: env.ledger().timestamp(),
                metadata: String::from_str(&env, "batch"),
                cancelled: false,
            };

            env.storage().persistent().set(&pay_count, &payment);
            env.storage().persistent().extend_ttl(&pay_count, 5000, 50000);

            emit_payment_event(&env, &creator, &payee, &amount);
        }

        successful = actual_recipients;
        failed = len - successful;

        // Fail only if zero payments were recorded
        if successful == 0 {
            return Err(PaymentError::BatchEmpty);
        }

        env.storage().instance().set(&PAYMENT_COUNT, &pay_count);
        env.storage().instance().extend_ttl(5000, 50000);

        let mut batch_count: u64 = env.storage().instance().get(&BATCH_COUNT).unwrap_or(0);
        batch_count += 1;

        let batch = BatchPayment {
            id: batch_count,
            creator,
            total_recipients: actual_recipients,
            total_amount,
            asset,
            timestamp: env.ledger().timestamp(),
            tx_hash,
            payment_ids,
        };

        env.storage().persistent().set(&batch_count, &batch);
        env.storage().persistent().extend_ttl(&batch_count, 5000, 50000);
        env.storage().instance().set(&BATCH_COUNT, &batch_count);
        env.storage().instance().extend_ttl(5000, 50000);

        inc_stat_u64(&env, |s| s.total_batches_processed, |s, v| s.total_batches_processed = v);
        add_stat_amount(&env, |s| s.total_amount_batched, |s, v| s.total_amount_batched = v, total_amount);

        Ok(BatchCreateResult {
            batch_id: batch_count,
            total_requests: len,
            successful,
            failed,
            total_amount,
        })
    }

    /// Get a batch by ID
    pub fn get_batch(env: Env, batch_id: u64) -> Result<BatchPayment, PaymentError> {
        env.storage()
            .persistent()
            .get(&batch_id)
            .ok_or(PaymentError::PaymentNotFound)
    }

    /// Get batch count
    pub fn get_batch_count(env: Env) -> u64 {
        env.storage().instance().get(&BATCH_COUNT).unwrap_or(0)
    }

    /// Get all payment IDs belonging to a batch, then fetch each payment.
    pub fn get_payments_by_batch(env: Env, batch_id: u64) -> Vec<Payment> {
        let batch: Option<BatchPayment> = env.storage().persistent().get(&batch_id);
        let mut payments = Vec::new(&env);

        if let Some(b) = batch {
            for pid in b.payment_ids.iter() {
                if let Some(p) = env.storage().persistent().get(&pid) {
                    payments.push_back(p);
                }
            }
        }

        payments
    }
}

// ── Tests ─────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::testutils::{Address as _, Ledger as _};

    fn create_token_contract(e: &Env, admin: &Address) -> Address {
        e.register_stellar_asset_contract(admin.clone())
    }

    // ── Admin Tests ─────────────────────────────────────────

    #[test]
    fn test_init_and_owner() {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register(OphirPayContract, ());
        let client = OphirPayContractClient::new(&env, &contract_id);
        let owner = Address::generate(&env);

        let version = client.init(&owner);
        assert_eq!(version, CONTRACT_VERSION);
        assert_eq!(client.get_owner(), owner);
        assert_eq!(client.get_payment_count(), 0);
    }

    #[test]
    #[should_panic(expected = "AlreadyInitialized")]
    fn test_init_twice_fails() {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register(OphirPayContract, ());
        let client = OphirPayContractClient::new(&env, &contract_id);
        let owner = Address::generate(&env);

        let _ = client.init(&owner);
        let _ = client.init(&owner); // should panic
    }

    #[test]
    fn test_transfer_ownership() {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register(OphirPayContract, ());
        let client = OphirPayContractClient::new(&env, &contract_id);
        let owner = Address::generate(&env);
        let new_owner = Address::generate(&env);

        let _ = client.init(&owner);
        client.transfer_ownership(&owner, &new_owner);
        assert_eq!(client.get_owner(), new_owner);
    }

    #[test]
    #[should_panic]
    fn test_unauthorized_transfer_ownership_fails() {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register(OphirPayContract, ());
        let client = OphirPayContractClient::new(&env, &contract_id);
        let owner = Address::generate(&env);
        let rando = Address::generate(&env);

        let _ = client.init(&owner);
        client.transfer_ownership(&rando, &rando); // should panic
    }

    // ── Payment Record Tests ────────────────────────────────

    #[test]
    fn test_record_payment() {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register(OphirPayContract, ());
        let client = OphirPayContractClient::new(&env, &contract_id);
        let owner = Address::generate(&env);
        let payer = Address::generate(&env);
        let payee = Address::generate(&env);
        let sac = create_token_contract(&env, &owner);

        let _ = client.init(&owner);

        let id = client.record_payment(
            &payer,
            &payee,
            &1000i128,
            &sac,
            &String::from_str(&env, "tx_hash_abc"),
            &String::from_str(&env, "test payment"),
        );
        assert_eq!(id, 1);
        assert_eq!(client.get_payment_count(), 1);

        let payment = client.get_payment(&1);
        assert_eq!(payment.payer, payer);
        assert_eq!(payment.payee, payee);
        assert_eq!(payment.amount, 1000);
        assert_eq!(payment.tx_hash, String::from_str(&env, "tx_hash_abc"));
        assert!(payment.timestamp > 0);
    }

    #[test]
    #[should_panic(expected = "InvalidAmount")]
    fn test_record_payment_zero_amount_fails() {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register(OphirPayContract, ());
        let client = OphirPayContractClient::new(&env, &contract_id);
        let owner = Address::generate(&env);
        let payer = Address::generate(&env);
        let payee = Address::generate(&env);
        let sac = create_token_contract(&env, &owner);

        let _ = client.init(&owner);
        client.record_payment(
            &payer,
            &payee,
            &0i128,
            &sac,
            &String::from_str(&env, "tx"),
            &String::from_str(&env, ""),
        );
    }

    #[test]
    fn test_cancel_payment_by_owner() {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register(OphirPayContract, ());
        let client = OphirPayContractClient::new(&env, &contract_id);
        let owner = Address::generate(&env);
        let payer = Address::generate(&env);
        let payee = Address::generate(&env);
        let sac = create_token_contract(&env, &owner);

        let _ = client.init(&owner);
        let _ = client.record_payment(
            &payer,
            &payee,
            &500i128,
            &sac,
            &String::from_str(&env, "tx"),
            &String::from_str(&env, ""),
        );

        client.cancel_payment(&owner, &1);
        let payment = client.get_payment(&1);
        assert!(payment.cancelled);
        assert_eq!(payment.amount, 500); // amount is preserved, not zeroed
    }

    // ── Escrow Tests ────────────────────────────────────────

    #[test]
    fn test_create_and_release_escrow() {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register(OphirPayContract, ());
        let client = OphirPayContractClient::new(&env, &contract_id);

        let owner = Address::generate(&env);
        let depositor = Address::generate(&env);
        let beneficiary = Address::generate(&env);
        let sac = create_token_contract(&env, &owner);
        let sac_client = token::StellarAssetClient::new(&env, &sac);
        sac_client.mint(&depositor, &10_000i128);

        let _ = client.init(&owner);

        let escrow_id = client.create_escrow(
            &depositor,
            &beneficiary,
            &Option::<Address>::None,
            &1000i128,
            &sac,
            &(env.ledger().timestamp() + 86400),
            &String::from_str(&env, "escrow test"),
        );
        assert_eq!(escrow_id, 1);
        assert_eq!(client.get_escrow_count(), 1);

        let escrow = client.get_escrow(&1);
        assert_eq!(escrow.depositor, depositor);
        assert_eq!(escrow.beneficiary, beneficiary);
        assert_eq!(escrow.amount, 1000);
        assert!(!escrow.released);

        client.release_escrow(&owner, &1);
        let escrow2 = client.get_escrow(&1);
        assert!(escrow2.released);
        assert!(escrow2.claimed);
    }

    #[test]
    fn test_claim_escrow_after_deadline() {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register(OphirPayContract, ());
        let client = OphirPayContractClient::new(&env, &contract_id);

        let owner = Address::generate(&env);
        let depositor = Address::generate(&env);
        let beneficiary = Address::generate(&env);
        let sac = create_token_contract(&env, &owner);
        let sac_client = token::StellarAssetClient::new(&env, &sac);
        sac_client.mint(&depositor, &10_000i128);

        let now = env.ledger().timestamp();
        let _ = client.init(&owner);
        let _ = client.create_escrow(
            &depositor,
            &beneficiary,
            &500i128,
            &sac,
            &(now + 100),
            &String::from_str(&env, "deadline test"),
        );

        env.ledger().set_timestamp(now + 200);

        client.claim_escrow(&beneficiary, &1);
        let escrow = client.get_escrow(&1);
        assert!(escrow.claimed);
    }

    #[test]
    #[should_panic]
    fn test_claim_escrow_before_deadline_fails() {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register(OphirPayContract, ());
        let client = OphirPayContractClient::new(&env, &contract_id);

        let owner = Address::generate(&env);
        let depositor = Address::generate(&env);
        let beneficiary = Address::generate(&env);
        let sac = create_token_contract(&env, &owner);
        let sac_client = token::StellarAssetClient::new(&env, &sac);
        sac_client.mint(&depositor, &10_000i128);

        let now = env.ledger().timestamp();
        let _ = client.init(&owner);
        let _ = client.create_escrow(
            &depositor,
            &beneficiary,
            &500i128,
            &sac,
            &(now + 10000),
            &String::from_str(&env, "future"),
        );

        client.claim_escrow(&beneficiary, &1); // should panic before deadline
    }

    // ── Stream Tests ───────────────────────────────────────

    #[test]
    fn test_create_and_claim_stream() {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register(OphirPayContract, ());
        let client = OphirPayContractClient::new(&env, &contract_id);

        let owner = Address::generate(&env);
        let creator = Address::generate(&env);
        let recipient = Address::generate(&env);
        let sac = create_token_contract(&env, &owner);
        let sac_client = token::StellarAssetClient::new(&env, &sac);
        sac_client.mint(&creator, &10_000i128);

        let now = env.ledger().timestamp();
        let _ = client.init(&owner);

        let stream_id = client.create_stream(
            &creator,
            &recipient,
            &1000i128,
            &sac,
            &now,
            &(now + 1000),
            &String::from_str(&env, "salary"),
        );
        assert_eq!(stream_id, 1);
        assert_eq!(client.get_stream_count(), 1);

        let stream = client.get_stream(&1);
        assert_eq!(stream.total_amount, 1000);
        assert_eq!(stream.claimed_amount, 0);
        assert!(!stream.cancelled);

        env.ledger().set_timestamp(now + 500);
        let claimed = client.claim_stream(&recipient, &1);
        assert_eq!(claimed, 500);

        env.ledger().set_timestamp(now + 2000);
        let claimed2 = client.claim_stream(&recipient, &1);
        assert_eq!(claimed2, 500);

        let stream_final = client.get_stream(&1);
        assert_eq!(stream_final.claimed_amount, 1000);
    }

    #[test]
    fn test_cancel_stream_returns_unvested() {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register(OphirPayContract, ());
        let client = OphirPayContractClient::new(&env, &contract_id);

        let owner = Address::generate(&env);
        let creator = Address::generate(&env);
        let recipient = Address::generate(&env);
        let sac = create_token_contract(&env, &owner);
        let sac_client = token::StellarAssetClient::new(&env, &sac);
        sac_client.mint(&creator, &10_000i128);

        let now = env.ledger().timestamp();
        let _ = client.init(&owner);
        let _ = client.create_stream(
            &creator,
            &recipient,
            &1000i128,
            &sac,
            &now,
            &(now + 1000),
            &String::from_str(&env, "cancel test"),
        );

        env.ledger().set_timestamp(now + 200);
        let returned = client.cancel_stream(&creator, &1);
        assert_eq!(returned, 800);

        let stream = client.get_stream(&1);
        assert!(stream.cancelled);
    }

    // ── Batch Tests ────────────────────────────────────────

    #[test]
    fn test_create_batch() {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register(OphirPayContract, ());
        let client = OphirPayContractClient::new(&env, &contract_id);

        let owner = Address::generate(&env);
        let creator = Address::generate(&env);
        let p1 = Address::generate(&env);
        let p2 = Address::generate(&env);
        let p3 = Address::generate(&env);
        let sac = create_token_contract(&env, &owner);

        let _ = client.init(&owner);

        let payees = vec![&env, p1.clone(), p2.clone(), p3.clone()];
        let amounts = vec![&env, 100i128, 200i128, 300i128];

        let result = client.create_batch(
            &creator,
            &payees,
            &amounts,
            &sac,
            &String::from_str(&env, "batch_tx_hash"),
        );
        assert_eq!(result.batch_id, 1);
        assert_eq!(client.get_batch_count(), 1);
        assert_eq!(client.get_payment_count(), 3);
        assert_eq!(result.successful, 3);
        assert_eq!(result.failed, 0);

        let batch = client.get_batch(&1);
        assert_eq!(batch.total_amount, 600);
        assert_eq!(batch.total_recipients, 3);
        assert_eq!(batch.payment_ids.len(), 3);

        // Query batch payments
        let batch_payments = client.get_payments_by_batch(&1);
        assert_eq!(batch_payments.len(), 3);
    }

    #[test]
    #[should_panic]
    fn test_empty_batch_fails() {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register(OphirPayContract, ());
        let client = OphirPayContractClient::new(&env, &contract_id);

        let owner = Address::generate(&env);
        let creator = Address::generate(&env);
        let sac = create_token_contract(&env, &owner);

        let _ = client.init(&owner);

        let payees = Vec::<Address>::new(&env);
        let amounts = Vec::<i128>::new(&env);
        client.create_batch(
            &creator,
            &payees,
            &amounts,
            &sac,
            &String::from_str(&env, "empty"),
        );
    }

    // ── Pause Tests ────────────────────────────────────────

    #[test]
    fn test_pause_blocks_record_payment() {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register(OphirPayContract, ());
        let client = OphirPayContractClient::new(&env, &contract_id);
        let owner = Address::generate(&env);
        let payer = Address::generate(&env);
        let payee = Address::generate(&env);
        let sac = create_token_contract(&env, &owner);

        let _ = client.init(&owner);
        assert!(!client.is_paused());

        client.pause(&owner);
        assert!(client.is_paused());

        // record_payment should fail when paused
        let result = client.try_record_payment(
            &payer,
            &payee,
            &100i128,
            &sac,
            &String::from_str(&env, "tx"),
            &String::from_str(&env, ""),
        );
        assert!(result.is_err());

        client.unpause(&owner);
        assert!(!client.is_paused());

        // Should work after unpause
        let id = client.record_payment(
            &payer,
            &payee,
            &100i128,
            &sac,
            &String::from_str(&env, "tx2"),
            &String::from_str(&env, ""),
        );
        assert_eq!(id, 1);
    }

    #[test]
    #[should_panic]
    fn test_pause_blocks_create_escrow() {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register(OphirPayContract, ());
        let client = OphirPayContractClient::new(&env, &contract_id);
        let owner = Address::generate(&env);
        let depositor = Address::generate(&env);
        let beneficiary = Address::generate(&env);
        let sac = create_token_contract(&env, &owner);
        let sac_client = token::StellarAssetClient::new(&env, &sac);
        sac_client.mint(&depositor, &1000i128);

        let _ = client.init(&owner);
        client.pause(&owner);

        client.create_escrow(
            &depositor,
            &beneficiary,
            &100i128,
            &sac,
            &(env.ledger().timestamp() + 100),
            &String::from_str(&env, "paused"),
        );
    }

    #[test]
    #[should_panic]
    fn test_pause_blocks_create_stream() {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register(OphirPayContract, ());
        let client = OphirPayContractClient::new(&env, &contract_id);
        let owner = Address::generate(&env);
        let creator = Address::generate(&env);
        let recipient = Address::generate(&env);
        let sac = create_token_contract(&env, &owner);
        let sac_client = token::StellarAssetClient::new(&env, &sac);
        sac_client.mint(&creator, &1000i128);

        let now = env.ledger().timestamp();
        let _ = client.init(&owner);
        client.pause(&owner);

        client.create_stream(
            &creator,
            &recipient,
            &500i128,
            &sac,
            &now,
            &(now + 1000),
            &String::from_str(&env, "paused"),
        );
    }

    // ── Re-cancellation test ───────────────────────────────

    #[test]
    #[should_panic]
    fn test_cancel_already_cancelled_fails() {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register(OphirPayContract, ());
        let client = OphirPayContractClient::new(&env, &contract_id);
        let owner = Address::generate(&env);
        let payer = Address::generate(&env);
        let payee = Address::generate(&env);
        let sac = create_token_contract(&env, &owner);

        let _ = client.init(&owner);
        let _ = client.record_payment(
            &payer,
            &payee,
            &100i128,
            &sac,
            &String::from_str(&env, "tx"),
            &String::from_str(&env, ""),
        );

        client.cancel_payment(&owner, &1);
        assert!(client.get_payment(&1).cancelled);

        // Second cancel should panic with PaymentAlreadyCancelled
        client.cancel_payment(&owner, &1);
    }
}
