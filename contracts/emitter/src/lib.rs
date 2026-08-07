#![no_std]

use soroban_sdk::{contract, contracterror, contractimpl, contracttype, symbol_short, Address, Env, String, Symbol};

// ── Storage Keys ───────────────────────────────────────────────
const EVENT_COUNT: Symbol = symbol_short!("EVT_CNT");
const EMITTER_OWNER: Symbol = symbol_short!("EM_OWNR");
const UPGRADE_HASH: Symbol = symbol_short!("UPG_HASH");
const UPGRADE_TIMELOCK: Symbol = symbol_short!("UPG_LOCK");
const PAUSED: Symbol = symbol_short!("PAUSED");
const PENDING_OWNER: Symbol = symbol_short!("PND_OWN");
const OWNER_PROPOSED_AT: Symbol = symbol_short!("OWN_PAT");

// ── Data Types ─────────────────────────────────────────────────

#[contracttype]
#[derive(Clone)]
pub struct PaymentEvent {
    pub id: u64,
    pub source: String,
    pub payer: Address,
    pub payee: Address,
    pub amount: i128,
    pub tx_hash: String,
    pub timestamp: u64,
}

#[contracterror]
#[derive(Clone, Debug, PartialEq, Eq)]
#[repr(u32)]
pub enum EmitterError {
    NotInitialized = 1,
    AlreadyInitialized = 2,
    EventNotFound = 3,
    Unauthorized = 4,
    UpgradeNotProposed = 5,
    UpgradeTimelockActive = 6,
    ContractPaused = 7,
}

// ── Contract ───────────────────────────────────────────────────

#[contract]
pub struct PaymentEventEmitter;

#[contractimpl]
impl PaymentEventEmitter {
    /// Initialize the emitter
    pub fn init(env: Env, owner: Address) -> Result<u32, EmitterError> {
        if env.storage().instance().has(&EMITTER_OWNER) {
            return Err(EmitterError::AlreadyInitialized);
        }
        owner.require_auth();
        env.storage().instance().set(&EMITTER_OWNER, &owner);
        env.storage().instance().set(&EVENT_COUNT, &0u64);
        env.storage().instance().extend_ttl(5000, 50000);
        Ok(0)
    }

    /// Record an external payment event.
    /// Caller must authorize — typically the main OphirPay contract via cross-contract call.
    pub fn emit_payment(
        env: Env,
        caller: Address,
        source: String,
        payer: Address,
        payee: Address,
        amount: i128,
        tx_hash: String,
    ) -> u64 {
        caller.require_auth();

        // Respect pause state — reject emits while paused
        let paused: bool = env.storage().instance().get(&PAUSED).unwrap_or(false);
        if paused {
            panic!("Emitter is paused");
        }

        let mut count: u64 = env.storage().instance().get(&EVENT_COUNT).unwrap_or(0);
        count += 1;

        let event = PaymentEvent {
            id: count,
            source,
            payer: payer.clone(),
            payee: payee.clone(),
            amount,
            tx_hash: tx_hash.clone(),
            timestamp: env.ledger().timestamp(),
        };

        env.storage().persistent().set(&count, &event);
        env.storage().persistent().extend_ttl(&count, 5000, 50000);

        env.storage().instance().set(&EVENT_COUNT, &count);
        env.storage().instance().extend_ttl(5000, 50000);

        // Native event emission
        env.events().publish(
            (
                Symbol::new(&env, "payment_event"),
                payer,
                payee,
            ),
            (amount, tx_hash),
        );

        count
    }

    /// Get event by ID
    pub fn get_event(env: Env, event_id: u64) -> Result<PaymentEvent, EmitterError> {
        env.storage()
            .persistent()
            .get(&event_id)
            .ok_or(EmitterError::EventNotFound)
    }

    /// Get total event count
    pub fn get_event_count(env: Env) -> u64 {
        env.storage().instance().get(&EVENT_COUNT).unwrap_or(0)
    }

    /// Get owner
    pub fn get_owner(env: Env) -> Result<Address, EmitterError> {
        env.storage()
            .instance()
            .get(&EMITTER_OWNER)
            .ok_or(EmitterError::NotInitialized)
    }

    /// Propose an emitter upgrade (owner only). Sets a 24-hour timelock.
    pub fn propose_upgrade(
        env: Env,
        caller: Address,
        new_wasm_hash: soroban_sdk::BytesN<32>,
    ) -> Result<(), EmitterError> {
        caller.require_auth();
        let owner: Address = env
            .storage()
            .instance()
            .get(&EMITTER_OWNER)
            .ok_or(EmitterError::NotInitialized)?;
        if caller != owner {
            return Err(EmitterError::Unauthorized);
        }
        let unlock_at = env.ledger().timestamp() + 86400;
        env.storage().instance().set(&UPGRADE_HASH, &new_wasm_hash);
        env.storage().instance().set(&UPGRADE_TIMELOCK, &unlock_at);
        env.storage().instance().extend_ttl(5000, 50000);
        Ok(())
    }

    /// Execute a previously proposed upgrade after the timelock expires.
    pub fn execute_upgrade(env: Env) -> Result<(), EmitterError> {
        let new_wasm_hash: soroban_sdk::BytesN<32> = env
            .storage()
            .instance()
            .get(&UPGRADE_HASH)
            .ok_or(EmitterError::UpgradeNotProposed)?;

        let unlock_at: u64 = env
            .storage()
            .instance()
            .get(&UPGRADE_TIMELOCK)
            .unwrap_or(0);

        if env.ledger().timestamp() < unlock_at {
            return Err(EmitterError::UpgradeTimelockActive);
        }

        env.storage().instance().remove(&UPGRADE_HASH);
        env.storage().instance().remove(&UPGRADE_TIMELOCK);
        env.storage().instance().extend_ttl(5000, 50000);

        env.deployer().update_current_contract_wasm(new_wasm_hash);
        Ok(())
    }

    /// Cancel a pending upgrade (owner only).
    pub fn cancel_upgrade(env: Env, caller: Address) -> Result<(), EmitterError> {
        caller.require_auth();
        let owner: Address = env
            .storage()
            .instance()
            .get(&EMITTER_OWNER)
            .ok_or(EmitterError::NotInitialized)?;
        if caller != owner {
            return Err(EmitterError::Unauthorized);
        }
        env.storage().instance().remove(&UPGRADE_HASH);
        env.storage().instance().remove(&UPGRADE_TIMELOCK);
        env.storage().instance().extend_ttl(5000, 50000);
        Ok(())
    }

    /// Propose a new owner (two-step transfer). The new owner must accept after 24h.
    pub fn transfer_ownership(
        env: Env,
        caller: Address,
        new_owner: Address,
    ) -> Result<(), EmitterError> {
        caller.require_auth();
        let owner: Address = env
            .storage()
            .instance()
            .get(&EMITTER_OWNER)
            .ok_or(EmitterError::NotInitialized)?;
        if caller != owner {
            return Err(EmitterError::Unauthorized);
        }
        env.storage().instance().set(&PENDING_OWNER, &new_owner);
        env.storage().instance().set(&OWNER_PROPOSED_AT, &env.ledger().timestamp());
        env.storage().instance().extend_ttl(5000, 50000);
        Ok(())
    }

    /// Accept ownership after the 24-hour timelock.
    pub fn accept_ownership(env: Env, caller: Address) -> Result<(), EmitterError> {
        caller.require_auth();
        let pending: Address = env
            .storage()
            .instance()
            .get(&PENDING_OWNER)
            .ok_or(EmitterError::UpgradeNotProposed)?;
        if caller != pending {
            return Err(EmitterError::Unauthorized);
        }
        let proposed_at: u64 = env.storage().instance().get(&OWNER_PROPOSED_AT).unwrap_or(0);
        let now = env.ledger().timestamp();
        if now.saturating_sub(proposed_at) < 86400 {
            return Err(EmitterError::UpgradeTimelockActive);
        }
        env.storage().instance().remove(&PENDING_OWNER);
        env.storage().instance().remove(&OWNER_PROPOSED_AT);
        env.storage().instance().set(&EMITTER_OWNER, &caller);
        env.storage().instance().extend_ttl(5000, 50000);
        Ok(())
    }

    /// Pause event emission (owner only).
    /// Used by the OphirPay orchestrator to freeze both contracts atomically.
    pub fn pause(env: Env, caller: Address) -> Result<(), EmitterError> {
        caller.require_auth();
        let owner: Address = env
            .storage()
            .instance()
            .get(&EMITTER_OWNER)
            .ok_or(EmitterError::NotInitialized)?;
        if caller != owner {
            return Err(EmitterError::Unauthorized);
        }
        env.storage().instance().set(&PAUSED, &true);
        env.storage().instance().extend_ttl(5000, 50000);
        Ok(())
    }

    /// Unpause event emission (owner only).
    pub fn unpause(env: Env, caller: Address) -> Result<(), EmitterError> {
        caller.require_auth();
        let owner: Address = env
            .storage()
            .instance()
            .get(&EMITTER_OWNER)
            .ok_or(EmitterError::NotInitialized)?;
        if caller != owner {
            return Err(EmitterError::Unauthorized);
        }
        env.storage().instance().set(&PAUSED, &false);
        env.storage().instance().extend_ttl(5000, 50000);
        Ok(())
    }

    /// Check if the emitter is paused.
    pub fn is_paused(env: Env) -> bool {
        env.storage().instance().get(&PAUSED).unwrap_or(false)
    }
}

// ── Tests ─────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::testutils::{Address as _, Ledger};

    #[test]
    fn test_init() {
        let env = Env::default();
        env.mock_all_auths();
        let addr = env.register(PaymentEventEmitter, ());
        let client = PaymentEventEmitterClient::new(&env, &addr);
        let owner = Address::generate(&env);

        let version = client.init(&owner);
        assert_eq!(version, 0);
        assert_eq!(client.get_owner(), owner);
        assert_eq!(client.get_event_count(), 0);
    }

    #[test]
    #[should_panic]
    fn test_init_twice_fails() {
        let env = Env::default();
        env.mock_all_auths();
        let addr = env.register(PaymentEventEmitter, ());
        let client = PaymentEventEmitterClient::new(&env, &addr);
        let owner = Address::generate(&env);

        let _ = client.init(&owner);
        let _ = client.init(&owner);
    }

    #[test]
    fn test_emit_payment() {
        let env = Env::default();
        env.mock_all_auths();
        let addr = env.register(PaymentEventEmitter, ());
        let client = PaymentEventEmitterClient::new(&env, &addr);
        let owner = Address::generate(&env);
        let payer = Address::generate(&env);
        let payee = Address::generate(&env);

        let _ = client.init(&owner);

        let id = client.emit_payment(
            &owner,
            &String::from_str(&env, "OphirPay"),
            &payer,
            &payee,
            &2500i128,
            &String::from_str(&env, "abc123def456"),
        );
        assert_eq!(id, 1);
        assert_eq!(client.get_event_count(), 1);

        let event = client.get_event(&1);
        assert_eq!(event.id, 1);
        assert_eq!(event.payer, payer);
        assert_eq!(event.payee, payee);
        assert_eq!(event.amount, 2500);
        assert_eq!(event.tx_hash, String::from_str(&env, "abc123def456"));
        assert!(event.timestamp > 0);
    }

    #[test]
    fn test_multiple_events() {
        let env = Env::default();
        env.mock_all_auths();
        let addr = env.register(PaymentEventEmitter, ());
        let client = PaymentEventEmitterClient::new(&env, &addr);
        let owner = Address::generate(&env);
        let p1 = Address::generate(&env);
        let p2 = Address::generate(&env);

        let _ = client.init(&owner);

        for i in 0..5 {
            client.emit_payment(
                &owner,
                &String::from_str(&env, "test"),
                &p1,
                &p2,
                &((i + 1) * 100),
                &String::from_str(&env, "tx"),
            );
        }
        assert_eq!(client.get_event_count(), 5);
    }

    #[test]
    #[should_panic]
    fn test_not_found() {
        let env = Env::default();
        env.mock_all_auths();
        let addr = env.register(PaymentEventEmitter, ());
        let client = PaymentEventEmitterClient::new(&env, &addr);
        let owner = Address::generate(&env);

        let _ = client.init(&owner);
        let _ = client.get_event(&999);
    }

    #[test]
    fn test_transfer_ownership() {
        let env = Env::default();
        env.mock_all_auths();
        let addr = env.register(PaymentEventEmitter, ());
        let client = PaymentEventEmitterClient::new(&env, &addr);
        let owner = Address::generate(&env);
        let new_owner = Address::generate(&env);

        let _ = client.init(&owner);

        // Propose new owner — ownership should NOT change yet
        client.transfer_ownership(&owner, &new_owner);
        assert_eq!(client.get_owner(), owner);

        // Advance time past 24h timelock and accept
        env.ledger().set_timestamp(env.ledger().timestamp() + 86401);
        client.accept_ownership(&new_owner);
        assert_eq!(client.get_owner(), new_owner);
    }
}
