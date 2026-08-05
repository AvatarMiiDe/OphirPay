#![no_std]

use soroban_sdk::{contract, contracterror, contractimpl, contracttype, symbol_short, Address, Env, String, Symbol};

// ── Storage Keys ───────────────────────────────────────────────
const EVENT_COUNT: Symbol = symbol_short!("EVT_CNT");
const EMITTER_OWNER: Symbol = symbol_short!("EM_OWNR");

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
    /// This is for events that originate from external systems (Horizon txs, etc.)
    pub fn emit_payment(
        env: Env,
        source: String,
        payer: Address,
        payee: Address,
        amount: i128,
        tx_hash: String,
    ) -> u64 {
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

    /// Transfer ownership
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
        env.storage().instance().set(&EMITTER_OWNER, &new_owner);
        env.storage().instance().extend_ttl(5000, 50000);
        Ok(())
    }
}

// ── Tests ─────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::testutils::Address as _;

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
        client.transfer_ownership(&owner, &new_owner);
        assert_eq!(client.get_owner(), new_owner);
    }
}
