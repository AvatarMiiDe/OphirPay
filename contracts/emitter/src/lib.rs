#![no_std]

use soroban_sdk::{contract, contractimpl, contracttype, symbol_short, Env, String, Symbol};

// ── Storage Keys ───────────────────────────────────────────────

const EVENT_COUNT: Symbol = symbol_short!("EVT_CNT");
const EMITTER_OWNER: Symbol = symbol_short!("EM_OWNR");

// ── Data Types ─────────────────────────────────────────────────

#[contracttype]
#[derive(Clone)]
pub struct PaymentEvent {
    pub id: u64,
    pub emitter: String,
    pub payer: String,
    pub payee: String,
    pub amount: u64,
    pub tx_hash: String,
    pub timestamp: u64,
}

#[contracttype]
#[derive(Clone)]
pub enum EmitterError {
    NotInitialized,
    AlreadyInitialized,
    EventNotFound,
    Unauthorized,
}

// ── Contract ───────────────────────────────────────────────────

#[contract]
pub struct PaymentEventEmitter;

#[contractimpl]
impl PaymentEventEmitter {
    /// Initialize the emitter contract
    pub fn init(env: Env, owner: String) -> Result<u32, EmitterError> {
        if env.storage().instance().has(&EMITTER_OWNER) {
            return Err(EmitterError::AlreadyInitialized);
        }
        env.storage().instance().set(&EMITTER_OWNER, &owner);
        env.storage().instance().set(&EVENT_COUNT, &0u64);
        env.storage().instance().extend_ttl(50000, 50000);
        Ok(0)
    }

    /// Emit a payment event (called by the OphirPay main contract)
    pub fn emit_payment(
        env: Env,
        emitter: String,
        payer: String,
        payee: String,
        amount: u64,
        tx_hash: String,
    ) -> u64 {
        let mut count: u64 = env.storage().instance().get(&EVENT_COUNT).unwrap_or(0);
        count += 1;

        let event = PaymentEvent {
            id: count,
            emitter,
            payer,
            payee,
            amount,
            tx_hash,
            timestamp: env.ledger().timestamp(),
        };

        env.storage().persistent().set(&count, &event);
        env.storage().persistent().extend_ttl(&count, 50000, 50000);

        env.storage().instance().set(&EVENT_COUNT, &count);
        env.storage().instance().extend_ttl(50000, 50000);

        count
    }

    /// Get an event by ID
    pub fn get_event(env: Env, event_id: u64) -> Result<PaymentEvent, EmitterError> {
        env.storage()
            .persistent()
            .get(&event_id)
            .ok_or(EmitterError::EventNotFound)
    }

    /// Get total emitted events
    pub fn get_event_count(env: Env) -> u64 {
        env.storage().instance().get(&EVENT_COUNT).unwrap_or(0)
    }

    /// Get emitter owner
    pub fn get_owner(env: Env) -> Result<String, EmitterError> {
        env.storage()
            .instance()
            .get(&EMITTER_OWNER)
            .ok_or(EmitterError::NotInitialized)
    }

    /// Transfer ownership
    pub fn transfer_ownership(
        env: Env,
        caller: String,
        new_owner: String,
    ) -> Result<(), EmitterError> {
        let owner: String = env
            .storage()
            .instance()
            .get(&EMITTER_OWNER)
            .ok_or(EmitterError::NotInitialized)?;
        if caller != owner {
            return Err(EmitterError::Unauthorized);
        }
        env.storage().instance().set(&EMITTER_OWNER, &new_owner);
        env.storage().instance().extend_ttl(50000, 50000);
        Ok(())
    }
}

// ── Tests ─────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_emitter_init_sets_owner_and_count() {
        let env = Env::default();
        let contract_id = env.register(PaymentEventEmitter, ());
        let client = PaymentEventEmitterClient::new(&env, &contract_id);

        let result = client.init(&String::from_str(&env, "GOWNER"));
        assert!(result.is_ok());
        assert_eq!(client.get_owner(), Ok(String::from_str(&env, "GOWNER")));
        assert_eq!(client.get_event_count(), 0u64);
    }

    #[test]
    fn test_emitter_init_twice_fails() {
        let env = Env::default();
        let contract_id = env.register(PaymentEventEmitter, ());
        let client = PaymentEventEmitterClient::new(&env, &contract_id);

        let _ = client.init(&String::from_str(&env, "GOWNER"));
        assert!(client.init(&String::from_str(&env, "GOWNER2")).is_err());
    }

    #[test]
    fn test_emit_payment_stores_event_with_timestamp() {
        let env = Env::default();
        let contract_id = env.register(PaymentEventEmitter, ());
        let client = PaymentEventEmitterClient::new(&env, &contract_id);

        let _ = client.init(&String::from_str(&env, "GADMIN"));

        let event_id = client.emit_payment(
            &String::from_str(&env, "OphirPay"),
            &String::from_str(&env, "GPAYER"),
            &String::from_str(&env, "GPAYEE"),
            &2500u64,
            &String::from_str(&env, "abc123def456"),
        );

        assert_eq!(event_id, 1u64);
        assert_eq!(client.get_event_count(), 1u64);

        let event = client.get_event(&1u64).unwrap();
        assert_eq!(event.id, 1u64);
        assert_eq!(event.emitter, String::from_str(&env, "OphirPay"));
        assert_eq!(event.payer, String::from_str(&env, "GPAYER"));
        assert_eq!(event.payee, String::from_str(&env, "GPAYEE"));
        assert_eq!(event.amount, 2500u64);
        assert_eq!(event.tx_hash, String::from_str(&env, "abc123def456"));
        assert!(event.timestamp > 0u64);
    }

    #[test]
    fn test_multiple_events_increment_count() {
        let env = Env::default();
        let contract_id = env.register(PaymentEventEmitter, ());
        let client = PaymentEventEmitterClient::new(&env, &contract_id);

        let _ = client.init(&String::from_str(&env, "GADMIN"));

        for i in 0..3 {
            client.emit_payment(
                &String::from_str(&env, "OphirPay"),
                &String::from_str(&env, "GA"),
                &String::from_str(&env, "GB"),
                &((i + 1) * 100),
                &String::from_str(&env, "tx"),
            );
        }

        assert_eq!(client.get_event_count(), 3u64);
    }

    #[test]
    fn test_get_event_not_found_returns_error() {
        let env = Env::default();
        let contract_id = env.register(PaymentEventEmitter, ());
        let client = PaymentEventEmitterClient::new(&env, &contract_id);

        let _ = client.init(&String::from_str(&env, "GADMIN"));
        assert!(client.get_event(&999u64).is_err());
    }

    #[test]
    fn test_event_count_starts_at_zero() {
        let env = Env::default();
        let contract_id = env.register(PaymentEventEmitter, ());
        let client = PaymentEventEmitterClient::new(&env, &contract_id);

        let _ = client.init(&String::from_str(&env, "GADMIN"));
        assert_eq!(client.get_event_count(), 0u64);
    }

    #[test]
    fn test_get_owner_before_init_returns_error() {
        let env = Env::default();
        let contract_id = env.register(PaymentEventEmitter, ());
        let client = PaymentEventEmitterClient::new(&env, &contract_id);

        assert!(client.get_owner().is_err());
    }

    #[test]
    fn test_transfer_ownership() {
        let env = Env::default();
        let contract_id = env.register(PaymentEventEmitter, ());
        let client = PaymentEventEmitterClient::new(&env, &contract_id);

        let _ = client.init(&String::from_str(&env, "GOWNER"));
        let result = client.transfer_ownership(
            &String::from_str(&env, "GOWNER"),
            &String::from_str(&env, "GNEW"),
        );
        assert!(result.is_ok());
        assert_eq!(client.get_owner(), Ok(String::from_str(&env, "GNEW")));
    }
}
