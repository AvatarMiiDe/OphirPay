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
