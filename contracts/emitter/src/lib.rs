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
}

// ── Contract ───────────────────────────────────────────────────

#[contract]
pub struct PaymentEventEmitter;

#[contractimpl]
impl PaymentEventEmitter {
    /// Initialize the emitter contract
    pub fn init(env: Env, owner: String) -> u32 {
        if env.storage().instance().has(&EMITTER_OWNER) {
            panic!("Emitter already initialized");
        }
        env.storage().instance().set(&EMITTER_OWNER, &owner);
        env.storage().instance().set(&EVENT_COUNT, &0u64);
        env.storage().instance().extend_ttl(10000, 10000);
        0
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
        };

        env.storage().persistent().set(&count, &event);
        env.storage().persistent().extend_ttl(&count, 10000, 10000);

        env.storage().instance().set(&EVENT_COUNT, &count);
        env.storage().instance().extend_ttl(10000, 10000);

        count
    }

    /// Get an event by ID
    pub fn get_event(env: Env, event_id: u64) -> PaymentEvent {
        env.storage()
            .persistent()
            .get(&event_id)
            .unwrap_or_else(|| panic!("Event not found"))
    }

    /// Get total emitted events
    pub fn get_event_count(env: Env) -> u64 {
        env.storage().instance().get(&EVENT_COUNT).unwrap_or(0)
    }

    /// Get emitter owner
    pub fn get_owner(env: Env) -> String {
        env.storage()
            .instance()
            .get(&EMITTER_OWNER)
            .unwrap_or_else(|| panic!("Emitter not initialized"))
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
        assert_eq!(result, 0u32);
        assert_eq!(client.get_owner(), String::from_str(&env, "GOWNER"));
        assert_eq!(client.get_event_count(), 0u64);
    }

    #[test]
    #[should_panic(expected = "Emitter already initialized")]
    fn test_emitter_init_twice_panics() {
        let env = Env::default();
        let contract_id = env.register(PaymentEventEmitter, ());
        let client = PaymentEventEmitterClient::new(&env, &contract_id);

        client.init(&String::from_str(&env, "GOWNER"));
        client.init(&String::from_str(&env, "GOWNER2"));
    }

    #[test]
    fn test_emit_payment_stores_event() {
        let env = Env::default();
        let contract_id = env.register(PaymentEventEmitter, ());
        let client = PaymentEventEmitterClient::new(&env, &contract_id);

        client.init(&String::from_str(&env, "GADMIN"));

        let event_id = client.emit_payment(
            &String::from_str(&env, "OphirPay"),
            &String::from_str(&env, "GPAYER"),
            &String::from_str(&env, "GPAYEE"),
            &2500u64,
            &String::from_str(&env, "abc123def456"),
        );

        assert_eq!(event_id, 1u64);
        assert_eq!(client.get_event_count(), 1u64);

        let event = client.get_event(&1u64);
        assert_eq!(event.id, 1u64);
        assert_eq!(event.emitter, String::from_str(&env, "OphirPay"));
        assert_eq!(event.payer, String::from_str(&env, "GPAYER"));
        assert_eq!(event.payee, String::from_str(&env, "GPAYEE"));
        assert_eq!(event.amount, 2500u64);
        assert_eq!(event.tx_hash, String::from_str(&env, "abc123def456"));
    }

    #[test]
    fn test_multiple_events_increment_count() {
        let env = Env::default();
        let contract_id = env.register(PaymentEventEmitter, ());
        let client = PaymentEventEmitterClient::new(&env, &contract_id);

        client.init(&String::from_str(&env, "GADMIN"));

        client.emit_payment(
            &String::from_str(&env, "OphirPay"),
            &String::from_str(&env, "GA"),
            &String::from_str(&env, "GB"),
            &100u64,
            &String::from_str(&env, "tx1"),
        );
        client.emit_payment(
            &String::from_str(&env, "OphirPay"),
            &String::from_str(&env, "GC"),
            &String::from_str(&env, "GD"),
            &200u64,
            &String::from_str(&env, "tx2"),
        );
        client.emit_payment(
            &String::from_str(&env, "OphirPay"),
            &String::from_str(&env, "GE"),
            &String::from_str(&env, "GF"),
            &300u64,
            &String::from_str(&env, "tx3"),
        );

        assert_eq!(client.get_event_count(), 3u64);
    }

    #[test]
    #[should_panic(expected = "Event not found")]
    fn test_get_event_not_found_panics() {
        let env = Env::default();
        let contract_id = env.register(PaymentEventEmitter, ());
        let client = PaymentEventEmitterClient::new(&env, &contract_id);

        client.init(&String::from_str(&env, "GADMIN"));
        client.get_event(&999u64);
    }

    #[test]
    fn test_event_count_starts_at_zero() {
        let env = Env::default();
        let contract_id = env.register(PaymentEventEmitter, ());
        let client = PaymentEventEmitterClient::new(&env, &contract_id);

        client.init(&String::from_str(&env, "GADMIN"));
        assert_eq!(client.get_event_count(), 0u64);
    }

    #[test]
    #[should_panic(expected = "Emitter not initialized")]
    fn test_get_owner_before_init_panics() {
        let env = Env::default();
        let contract_id = env.register(PaymentEventEmitter, ());
        let client = PaymentEventEmitterClient::new(&env, &contract_id);

        client.get_owner();
    }
}
