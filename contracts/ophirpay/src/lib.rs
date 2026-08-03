#![no_std]

use soroban_sdk::{contract, contractimpl, contracttype, symbol_short, vec, Address, Env, IntoVal, String, Symbol, Val, Vec};

// ── Storage Keys ───────────────────────────────────────────────

const PAYMENT_COUNT: Symbol = symbol_short!("PAY_CNT");
const OWNER: Symbol = symbol_short!("OWNER");
const EMITTER_ADDR: Symbol = symbol_short!("EMITTER");

// ── Data Types ─────────────────────────────────────────────────

#[contracttype]
#[derive(Clone)]
pub struct Payment {
    pub id: u64,
    pub payer: String,
    pub payee: String,
    pub amount: u64,
    pub tx_hash: String,
}

// ── Contract ───────────────────────────────────────────────────

#[contract]
pub struct OphirPayContract;

#[contractimpl]
impl OphirPayContract {
    /// Initialize the contract, setting the owner and emitter address
    pub fn init(env: Env, owner: String, emitter: Address) -> u32 {
        if env.storage().instance().has(&OWNER) {
            panic!("Contract already initialized");
        }
        env.storage().instance().set(&OWNER, &owner);
        env.storage().instance().set(&PAYMENT_COUNT, &0u64);
        env.storage().instance().set(&EMITTER_ADDR, &emitter);
        env.storage().instance().extend_ttl(10000, 10000);
        0
    }

    /// Create a new payment and emit event via cross-contract call to emitter
    pub fn create_payment(
        env: Env,
        payer: String,
        payee: String,
        amount: u64,
        tx_hash: String,
    ) -> u64 {
        let mut count: u64 = env.storage().instance().get(&PAYMENT_COUNT).unwrap_or(0);
        count += 1;

        let payment = Payment {
            id: count,
            payer: payer.clone(),
            payee: payee.clone(),
            amount,
            tx_hash: tx_hash.clone(),
        };

        // Store payment in this contract
        env.storage().persistent().set(&count, &payment);
        env.storage().persistent().extend_ttl(&count, 10000, 10000);

        env.storage().instance().set(&PAYMENT_COUNT, &count);
        env.storage().instance().extend_ttl(10000, 10000);

        // ── Cross-Contract Communication ──────────────────────
        // Call PaymentEventEmitter to emit the payment event
        let emitter_addr: Address = env
            .storage()
            .instance()
            .get(&EMITTER_ADDR)
            .unwrap_or_else(|| panic!("Emitter not configured"));

        let emitter_str = String::from_str(&env, "OphirPay");

        let args: Vec<Val> = vec![
            &env,
            emitter_str.into(),
            payer.into(),
            payee.into(),
            amount.into_val(&env),
            tx_hash.into(),
        ];

        let _event_id: u64 = env.invoke_contract(
            &emitter_addr,
            &Symbol::new(&env, "emit_payment"),
            args,
        );

        count
    }

    /// Get a payment by ID
    pub fn get_payment(env: Env, payment_id: u64) -> Payment {
        env.storage()
            .persistent()
            .get(&payment_id)
            .unwrap_or_else(|| panic!("Payment not found"))
    }

    /// Get total number of payments
    pub fn get_payment_count(env: Env) -> u64 {
        env.storage().instance().get(&PAYMENT_COUNT).unwrap_or(0)
    }

    /// Get the contract owner
    pub fn get_owner(env: Env) -> String {
        env.storage()
            .instance()
            .get(&OWNER)
            .unwrap_or_else(|| panic!("Contract not initialized"))
    }

    /// Get the configured emitter contract address
    pub fn get_emitter(env: Env) -> Address {
        env.storage()
            .instance()
            .get(&EMITTER_ADDR)
            .unwrap_or_else(|| panic!("Emitter not configured"))
    }
}

// ── Tests ─────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::testutils::Address as _;

    #[test]
    fn test_init_sets_owner_and_count() {
        let env = Env::default();
        let contract_id = env.register(OphirPayContract, ());
        let client = OphirPayContractClient::new(&env, &contract_id);
        let emitter = Address::generate(&env);

        let result = client.init(&String::from_str(&env, "GOWNER"), &emitter);
        assert_eq!(result, 0u32);
        assert_eq!(client.get_owner(), String::from_str(&env, "GOWNER"));
        assert_eq!(client.get_payment_count(), 0u64);
    }

    #[test]
    #[should_panic(expected = "Contract already initialized")]
    fn test_init_twice_panics() {
        let env = Env::default();
        let contract_id = env.register(OphirPayContract, ());
        let client = OphirPayContractClient::new(&env, &contract_id);
        let emitter = Address::generate(&env);

        client.init(&String::from_str(&env, "GOWNER"), &emitter);
        client.init(&String::from_str(&env, "GOWNER2"), &emitter);
    }

    #[test]
    fn test_create_payment_stores_and_increments() {
        let env = Env::default();
        let contract_id = env.register(OphirPayContract, ());
        let client = OphirPayContractClient::new(&env, &contract_id);

        // Register a mock emitter first
        let emitter_id = env.register(PaymentEventEmitterMock, ());
        let emitter_addr = Address::from_contract_id(&env, &emitter_id);

        client.init(&String::from_str(&env, "GOWNER"), &emitter_addr);

        let pay_id = client.create_payment(
            &String::from_str(&env, "GPAYER"),
            &String::from_str(&env, "GPAYEE"),
            &1000u64,
            &String::from_str(&env, "tx_hash_1"),
        );
        assert_eq!(pay_id, 1u64);
        assert_eq!(client.get_payment_count(), 1u64);

        let payment = client.get_payment(&1u64);
        assert_eq!(payment.id, 1u64);
        assert_eq!(payment.amount, 1000u64);

        // Second payment
        let pay_id2 = client.create_payment(
            &String::from_str(&env, "GPAYER2"),
            &String::from_str(&env, "GPAYEE2"),
            &500u64,
            &String::from_str(&env, "tx_hash_2"),
        );
        assert_eq!(pay_id2, 2u64);
        assert_eq!(client.get_payment_count(), 2u64);
    }

    #[test]
    #[should_panic(expected = "Emitter not configured")]
    fn test_emitter_not_configured_panics() {
        let env = Env::default();
        let contract_id = env.register(OphirPayContract, ());
        let client = OphirPayContractClient::new(&env, &contract_id);

        // Don't call init — emitter not stored
        client.create_payment(
            &String::from_str(&env, "GPAYER"),
            &String::from_str(&env, "GPAYEE"),
            &100u64,
            &String::from_str(&env, "tx"),
        );
    }

    #[test]
    #[should_panic(expected = "Payment not found")]
    fn test_get_payment_not_found_panics() {
        let env = Env::default();
        let contract_id = env.register(OphirPayContract, ());
        let client = OphirPayContractClient::new(&env, &contract_id);
        let emitter = Address::generate(&env);

        client.init(&String::from_str(&env, "GOWNER"), &emitter);
        client.get_payment(&999u64);
    }

    #[test]
    fn test_get_owner_after_init() {
        let env = Env::default();
        let contract_id = env.register(OphirPayContract, ());
        let client = OphirPayContractClient::new(&env, &contract_id);
        let emitter = Address::generate(&env);

        client.init(&String::from_str(&env, "GACZ7ZELCUC5"), &emitter);
        let owner = client.get_owner();
        assert_eq!(owner, String::from_str(&env, "GACZ7ZELCUC5"));
    }

    #[test]
    fn test_get_emitter_returns_correct_address() {
        let env = Env::default();
        let contract_id = env.register(OphirPayContract, ());
        let client = OphirPayContractClient::new(&env, &contract_id);
        let emitter = Address::generate(&env);

        client.init(&String::from_str(&env, "GOWNER"), &emitter);
        let stored_emitter = client.get_emitter();
        assert_eq!(stored_emitter, emitter);
    }

    #[test]
    fn test_get_payment_count_starts_at_zero() {
        let env = Env::default();
        let contract_id = env.register(OphirPayContract, ());
        let client = OphirPayContractClient::new(&env, &contract_id);
        let emitter = Address::generate(&env);

        client.init(&String::from_str(&env, "GOWNER"), &emitter);
        assert_eq!(client.get_payment_count(), 0u64);
    }

    // ── Mock emitter contract for testing cross-contract calls ─

    #[contract]
    pub struct PaymentEventEmitterMock;

    #[contractimpl]
    impl PaymentEventEmitterMock {
        pub fn emit_payment(
            _env: Env,
            _emitter: String,
            _payer: String,
            _payee: String,
            _amount: u64,
            _tx_hash: String,
        ) -> u64 {
            // Simple mock: always return event ID 1
            1u64
        }
    }
}
