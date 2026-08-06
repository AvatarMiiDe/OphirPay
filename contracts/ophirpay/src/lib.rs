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
const VERSION: Symbol = symbol_short!("VERSION");

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

/// An escrow that locks funds until released by the owner or claimed after deadline.
#[contracttype]
#[derive(Clone)]
pub struct Escrow {
    pub id: u64,
    pub depositor: Address,
    pub beneficiary: Address,
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
    // Checked multiply to prevent overflow; clamp to total_amount on overflow
    total_amount
        .checked_mul(elapsed)
        .map(|product| product / total_duration)
        .unwrap_or(total_amount)
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
    /// The beneficiary can claim after `deadline`; owner can release early.
    pub fn create_escrow(
        env: Env,
        depositor: Address,
        beneficiary: Address,
        amount: i128,
        asset: Address,
        deadline: u64,
        metadata: String,
    ) -> Result<u64, PaymentError> {
        depositor.require_auth();
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

        Ok(count)
    }

    /// Owner releases escrow to the beneficiary (anytime).
    pub fn release_escrow(
        env: Env,
        owner: Address,
        escrow_id: u64,
    ) -> Result<(), PaymentError> {
        owner.require_auth();
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

        Ok(())
    }

    /// Beneficiary claims escrow after deadline.
    pub fn claim_escrow(env: Env, beneficiary: Address, escrow_id: u64) -> Result<(), PaymentError> {
        beneficiary.require_auth();

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

        Ok(count)
    }

    /// Claim vested tokens from a stream. Can be called any time.
    pub fn claim_stream(env: Env, recipient: Address, stream_id: u64) -> Result<i128, PaymentError> {
        recipient.require_auth();

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

        Ok(claimable)
    }

    /// Creator cancels a stream. Unvested tokens are returned to creator.
    pub fn cancel_stream(
        env: Env,
        creator: Address,
        stream_id: u64,
    ) -> Result<i128, PaymentError> {
        creator.require_auth();

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

        let unvested = stream.total_amount - vested - stream.claimed_amount;

        stream.cancelled = true;
        env.storage().persistent().set(&stream_id, &stream);
        env.storage().persistent().extend_ttl(&stream_id, 5000, 50000);

        // Return unvested tokens to creator (0 if fully vested)
        if unvested > 0 {
            let token_client = token::Client::new(&env, &stream.asset);
            let contract_addr = env.current_contract_address();
            token_client.transfer(&contract_addr, &creator, &unvested);
        }

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

    /// Record a batch of payments in a single transaction.
    /// Does NOT move tokens — token transfers should happen before calling this.
    pub fn create_batch(
        env: Env,
        creator: Address,
        payees: Vec<Address>,
        amounts: Vec<i128>,
        asset: Address,
        tx_hash: String,
    ) -> Result<u64, PaymentError> {
        creator.require_auth();

        let len = payees.len();
        if len == 0 {
            return Err(PaymentError::BatchEmpty);
        }
        if len > 100 {
            return Err(PaymentError::BatchTooLarge);
        }
        if amounts.len() != len {
            return Err(PaymentError::InvalidAmount);
        }

        let mut total_amount: i128 = 0;
        let mut pay_count: u64 = env.storage().instance().get(&PAYMENT_COUNT).unwrap_or(0);

        for i in 0..len {
            let amount = amounts.get(i).unwrap_or(0);
            let payee = payees.get(i).unwrap();
            if amount <= 0 {
                continue;
            }
            total_amount += amount;
            pay_count += 1;

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

        env.storage().instance().set(&PAYMENT_COUNT, &pay_count);
        env.storage().instance().extend_ttl(5000, 50000);

        let mut batch_count: u64 = env.storage().instance().get(&BATCH_COUNT).unwrap_or(0);
        batch_count += 1;

        let batch = BatchPayment {
            id: batch_count,
            creator,
            total_recipients: len as u32,
            total_amount,
            asset,
            timestamp: env.ledger().timestamp(),
            tx_hash,
        };

        env.storage().persistent().set(&batch_count, &batch);
        env.storage().persistent().extend_ttl(&batch_count, 5000, 50000);
        env.storage().instance().set(&BATCH_COUNT, &batch_count);
        env.storage().instance().extend_ttl(5000, 50000);

        Ok(batch_count)
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

        let batch_id = client.create_batch(
            &creator,
            &payees,
            &amounts,
            &sac,
            &String::from_str(&env, "batch_tx_hash"),
        );
        assert_eq!(batch_id, 1);
        assert_eq!(client.get_batch_count(), 1);
        assert_eq!(client.get_payment_count(), 3);

        let batch = client.get_batch(&1);
        assert_eq!(batch.total_amount, 600);
        assert_eq!(batch.total_recipients, 3);
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
}
