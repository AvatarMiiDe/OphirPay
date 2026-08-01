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
