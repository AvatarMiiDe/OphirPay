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
    pub timestamp: u64,
    pub metadata: String,
}

#[contracttype]
#[derive(Clone)]
pub enum PaymentError {
    NotInitialized,
    AlreadyInitialized,
    PaymentNotFound,
    EmitterNotConfigured,
    Unauthorized,
    InvalidAmount,
}

// ── Contract ───────────────────────────────────────────────────

#[contract]
pub struct OphirPayContract;

#[contractimpl]
impl OphirPayContract {
    /// Initialize the contract, setting the owner and emitter address
    pub fn init(env: Env, owner: String, emitter: Address) -> Result<u32, PaymentError> {
        if env.storage().instance().has(&OWNER) {
            return Err(PaymentError::AlreadyInitialized);
        }
        env.storage().instance().set(&OWNER, &owner);
        env.storage().instance().set(&PAYMENT_COUNT, &0u64);
        env.storage().instance().set(&EMITTER_ADDR, &emitter);
        env.storage().instance().extend_ttl(50000, 50000);
        Ok(0)
    }

    /// Create a new payment and emit event via cross-contract call to emitter.
    /// Only callable by the contract owner.
    pub fn create_payment(
        env: Env,
        caller: String,
        payer: String,
        payee: String,
        amount: u64,
        tx_hash: String,
        metadata: String,
    ) -> Result<u64, PaymentError> {
        // ── Access Control ──────────────────────────────────
        let owner: String = env
            .storage()
            .instance()
            .get(&OWNER)
            .unwrap_or_else(|| panic!("Contract not initialized"));
        if caller != owner {
            return Err(PaymentError::Unauthorized);
        }

        // ── Validation ─────────────────────────────────────
        if amount == 0 {
            return Err(PaymentError::InvalidAmount);
        }

        let mut count: u64 = env.storage().instance().get(&PAYMENT_COUNT).unwrap_or(0);
        count += 1;

        let payment = Payment {
            id: count,
            payer: payer.clone(),
            payee: payee.clone(),
            amount,
            tx_hash: tx_hash.clone(),
            timestamp: env.ledger().timestamp(),
            metadata: metadata.clone(),
        };

        // Store payment in this contract
        env.storage().persistent().set(&count, &payment);
        env.storage().persistent().extend_ttl(&count, 50000, 50000);

        env.storage().instance().set(&PAYMENT_COUNT, &count);
        env.storage().instance().extend_ttl(50000, 50000);

        // ── Cross-Contract Communication ──────────────────────
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

        Ok(count)
    }

    /// Get a payment by ID
    pub fn get_payment(env: Env, payment_id: u64) -> Result<Payment, PaymentError> {
        env.storage()
            .persistent()
            .get(&payment_id)
            .ok_or(PaymentError::PaymentNotFound)
    }

    /// Get total number of payments
    pub fn get_payment_count(env: Env) -> u64 {
        env.storage().instance().get(&PAYMENT_COUNT).unwrap_or(0)
    }

    /// Get the contract owner
    pub fn get_owner(env: Env) -> Result<String, PaymentError> {
        env.storage()
            .instance()
            .get(&OWNER)
            .ok_or(PaymentError::NotInitialized)
    }

    /// Get the configured emitter contract address
    pub fn get_emitter(env: Env) -> Result<Address, PaymentError> {
        env.storage()
            .instance()
            .get(&EMITTER_ADDR)
            .ok_or(PaymentError::EmitterNotConfigured)
    }

    /// Transfer contract ownership to a new owner.
    /// Only the current owner can call this.
    pub fn transfer_ownership(
        env: Env,
        caller: String,
        new_owner: String,
    ) -> Result<(), PaymentError> {
        let owner: String = env
            .storage()
            .instance()
            .get(&OWNER)
            .ok_or(PaymentError::NotInitialized)?;
        if caller != owner {
            return Err(PaymentError::Unauthorized);
        }
        env.storage().instance().set(&OWNER, &new_owner);
        env.storage().instance().extend_ttl(50000, 50000);
        Ok(())
    }

    /// Cancel a payment by ID (marks it as zeroed out — blockchain storage is immutable).
    /// Only the contract owner can cancel.
    pub fn cancel_payment(env: Env, caller: String, payment_id: u64) -> Result<(), PaymentError> {
        let owner: String = env
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

        payment.amount = 0;
        payment.metadata = String::from_str(&env, "CANCELLED");
        env.storage().persistent().set(&payment_id, &payment);
        env.storage().persistent().extend_ttl(&payment_id, 50000, 50000);

        Ok(())
    }

    /// Batch-read multiple payments by ID range.
    /// Returns payments in the range [start_id, end_id] (inclusive).
    pub fn get_payments_range(
        env: Env,
        start_id: u64,
        end_id: u64,
    ) -> Vec<Payment> {
        let mut payments = Vec::new(&env);
        for id in start_id..=end_id {
            if let Some(payment) = env.storage().persistent().get(&id) {
                payments.push_back(payment);
            }
        }
        payments
    }

    /// Update the emitter contract address.
    /// Only the owner can call this.
    pub fn update_emitter(
        env: Env,
        caller: String,
        new_emitter: Address,
    ) -> Result<(), PaymentError> {
        let owner: String = env
            .storage()
            .instance()
            .get(&OWNER)
            .ok_or(PaymentError::NotInitialized)?;
        if caller != owner {
            return Err(PaymentError::Unauthorized);
        }
        env.storage().instance().set(&EMITTER_ADDR, &new_emitter);
        env.storage().instance().extend_ttl(50000, 50000);
        Ok(())
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
        assert!(result.is_ok());
        assert_eq!(client.get_owner(), Ok(String::from_str(&env, "GOWNER")));
        assert_eq!(client.get_payment_count(), 0u64);
    }

    #[test]
    fn test_init_twice_fails() {
        let env = Env::default();
        let contract_id = env.register(OphirPayContract, ());
        let client = OphirPayContractClient::new(&env, &contract_id);
        let emitter = Address::generate(&env);

        let _ = client.init(&String::from_str(&env, "GOWNER"), &emitter);
        let result = client.init(&String::from_str(&env, "GOWNER2"), &emitter);
        assert!(result.is_err());
    }

    #[test]
    fn test_create_payment_stores_and_increments() {
        let env = Env::default();
        let contract_id = env.register(OphirPayContract, ());
        let client = OphirPayContractClient::new(&env, &contract_id);

        let emitter_id = env.register(PaymentEventEmitterMock, ());
        let emitter_addr = Address::from_contract_id(&env, &emitter_id);

        let owner = String::from_str(&env, "GOWNER");
        let _ = client.init(&owner, &emitter_addr);

        let result = client.create_payment(
            &owner,
            &String::from_str(&env, "GPAYER"),
            &String::from_str(&env, "GPAYEE"),
            &1000u64,
            &String::from_str(&env, "tx_hash_1"),
            &String::from_str(&env, ""),
        );
        assert!(result.is_ok());
        let pay_id = result.unwrap();
        assert_eq!(pay_id, 1u64);
        assert_eq!(client.get_payment_count(), 1u64);

        let payment = client.get_payment(&1u64).unwrap();
        assert_eq!(payment.id, 1u64);
        assert_eq!(payment.amount, 1000u64);
    }

    #[test]
    fn test_unauthorized_create_payment_fails() {
        let env = Env::default();
        let contract_id = env.register(OphirPayContract, ());
        let client = OphirPayContractClient::new(&env, &contract_id);

        let emitter_id = env.register(PaymentEventEmitterMock, ());
        let emitter_addr = Address::from_contract_id(&env, &emitter_id);

        let _ = client.init(&String::from_str(&env, "GOWNER"), &emitter_addr);

        // Call with a non-owner caller
        let result = client.create_payment(
            &String::from_str(&env, "GNOT_OWNER"),
            &String::from_str(&env, "GPAYER"),
            &String::from_str(&env, "GPAYEE"),
            &100u64,
            &String::from_str(&env, "tx"),
            &String::from_str(&env, ""),
        );
        assert!(result.is_err());
    }

    #[test]
    fn test_zero_amount_fails() {
        let env = Env::default();
        let contract_id = env.register(OphirPayContract, ());
        let client = OphirPayContractClient::new(&env, &contract_id);

        let emitter_id = env.register(PaymentEventEmitterMock, ());
        let emitter_addr = Address::from_contract_id(&env, &emitter_id);

        let owner = String::from_str(&env, "GOWNER");
        let _ = client.init(&owner, &emitter_addr);

        let result = client.create_payment(
            &owner,
            &String::from_str(&env, "GPAYER"),
            &String::from_str(&env, "GPAYEE"),
            &0u64,
            &String::from_str(&env, "tx"),
            &String::from_str(&env, ""),
        );
        assert!(result.is_err());
    }

    #[test]
    fn test_payment_has_timestamp() {
        let env = Env::default();
        let contract_id = env.register(OphirPayContract, ());
        let client = OphirPayContractClient::new(&env, &contract_id);

        let emitter_id = env.register(PaymentEventEmitterMock, ());
        let emitter_addr = Address::from_contract_id(&env, &emitter_id);

        let owner = String::from_str(&env, "GOWNER");
        let _ = client.init(&owner, &emitter_addr);

        let _ = client.create_payment(
            &owner,
            &String::from_str(&env, "GPAYER"),
            &String::from_str(&env, "GPAYEE"),
            &500u64,
            &String::from_str(&env, "tx_hash_timestamp"),
            &String::from_str(&env, "some metadata"),
        );

        let payment = client.get_payment(&1u64).unwrap();
        assert!(payment.timestamp > 0u64);
    }

    #[test]
    fn test_transfer_ownership() {
        let env = Env::default();
        let contract_id = env.register(OphirPayContract, ());
        let client = OphirPayContractClient::new(&env, &contract_id);
        let emitter = Address::generate(&env);

        let owner = String::from_str(&env, "GOWNER");
        let _ = client.init(&owner, &emitter);

        let result = client.transfer_ownership(
            &owner,
            &String::from_str(&env, "GNEW_OWNER"),
        );
        assert!(result.is_ok());
        assert_eq!(client.get_owner(), Ok(String::from_str(&env, "GNEW_OWNER")));
    }

    #[test]
    fn test_cancel_payment() {
        let env = Env::default();
        let contract_id = env.register(OphirPayContract, ());
        let client = OphirPayContractClient::new(&env, &contract_id);

        let emitter_id = env.register(PaymentEventEmitterMock, ());
        let emitter_addr = Address::from_contract_id(&env, &emitter_id);

        let owner = String::from_str(&env, "GOWNER");
        let _ = client.init(&owner, &emitter_addr);

        let _ = client.create_payment(
            &owner,
            &String::from_str(&env, "GPAYER"),
            &String::from_str(&env, "GPAYEE"),
            &1000u64,
            &String::from_str(&env, "tx"),
            &String::from_str(&env, ""),
        );

        let result = client.cancel_payment(&owner, &1u64);
        assert!(result.is_ok());

        let payment = client.get_payment(&1u64).unwrap();
        assert_eq!(payment.amount, 0u64);
    }

    #[test]
    fn test_payment_not_found_returns_error() {
        let env = Env::default();
        let contract_id = env.register(OphirPayContract, ());
        let client = OphirPayContractClient::new(&env, &contract_id);
        let emitter = Address::generate(&env);

        let _ = client.init(&String::from_str(&env, "GOWNER"), &emitter);
        assert!(client.get_payment(&999u64).is_err());
    }

    #[test]
    fn test_get_emitter_returns_correct_address() {
        let env = Env::default();
        let contract_id = env.register(OphirPayContract, ());
        let client = OphirPayContractClient::new(&env, &contract_id);
        let emitter = Address::generate(&env);

        let _ = client.init(&String::from_str(&env, "GOWNER"), &emitter);
        assert_eq!(client.get_emitter(), Ok(emitter));
    }

    #[test]
    fn test_payment_count_starts_at_zero() {
        let env = Env::default();
        let contract_id = env.register(OphirPayContract, ());
        let client = OphirPayContractClient::new(&env, &contract_id);
        let emitter = Address::generate(&env);

        let _ = client.init(&String::from_str(&env, "GOWNER"), &emitter);
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
            1u64
        }
    }
}
