# Troubleshooting

This guide covers the most common setup issues reported by new OphirPay
contributors. Each entry follows the same shape: **Symptom → Cause →
Resolution**. If your issue is not listed here, open a
[GitHub issue](https://github.com/OphirPay/OphirPay/issues/new?template=bug_report.yml)
and include the commands you ran and their output.

- [Quick checks](#quick-checks)
- [1. Freighter not detected](#1-freighter-not-detected)
- [2. Rust wasm32 target missing](#2-rust-wasm32-target-missing)
- [3. Prisma migration errors](#3-prisma-migration-errors)
- [4. WASM build failures](#4-wasm-build-failures)
- [5. Node version mismatch](#5-node-version-mismatch)
- [6. Port conflicts](#6-port-conflicts)
- [Still stuck?](#still-stuck)

## Quick checks

Before diving into a specific issue, verify the local environment:

```bash
node -v        # expect the version in .nvmrc (20.x)
npm -v
rustc -V       # expect a recent stable toolchain (CI pins 1.91.0)
cargo -V
npx prisma -v
```

Confirm the repository is installed and validated:

```bash
npm install
npm run typecheck
npm run lint
```

If you are working on the contracts, also confirm the Rust target list:

```bash
rustup target list --installed
```

---

## 1. Freighter not detected

**Symptom**

The app loads, but Freighter is not listed in the wallet selector, shows a
"Not found" badge, or `connect("freighter")` fails with a message about the
extension.

**Cause**

Freighter is a browser extension and is only available inside a browser
context:

- The extension is not installed, is disabled, or is not unlocked.
- The page was loaded before the extension was installed/enabled and was not
  reloaded.
- The browser profile blocks extension injection (e.g. private/incognito mode
  with extensions disabled, or a hardened privacy configuration).
- Another wallet extension conflicts with Freighter's page-level detection.

**Resolution**

1. Install Freighter from [freighter.app](https://freighter.app) (or the
   Chrome/Firefox store for your browser).
2. Open the browser's extension manager and confirm Freighter is **enabled**
   (and not paused for this site).
3. Unlock the wallet (Freighter shows a lock screen on first use).
4. **Reload the app tab** after changing any extension state — extensions do
   not hot-inject into already-loaded pages.
5. Retry in a normal (non-private) window. If you use a hardened privacy
   setup, add an exception for the OphirPay origin.
6. If other wallet extensions are installed, test with a clean browser
   profile to rule out conflicts.

**Verification**

- The wallet selector lists Freighter and shows a connected badge after
  `connect("freighter")`.
- The network badge shows `TESTNET` (or `PUBLIC` if configured).

---

## 2. Rust wasm32 target missing

**Symptom**

Building a contract fails with an error such as:

```text
error: target 'wasm32v1-none' not installed
error[E0463]: can't find crate for `core`
```

or `cargo build --target wasm32v1-none --release` reports that the target is
not installed.

**Cause**

The Rust toolchain is installed, but the WebAssembly compilation target is
not. OphirPay's contracts target **`wasm32v1-none`** (the Soroban
`#![no_std]` target used with the modern `soroban-sdk`). Older Soroban
projects used `wasm32-unknown-unknown`; if you see that target mentioned, the
fix is the same command with the matching target name.

**Resolution**

Install the target for the active toolchain:

```bash
rustup target add wasm32v1-none
```

Then verify it is present:

```bash
rustup target list --installed   # should include wasm32v1-none
```

If the error persists, make sure the target was added to the **same
toolchain** that `cargo` is using (check with `rustup show`). The repo pins
its Rust toolchain in `contracts/rust-toolchain.toml` (channel `1.91.0`,
with both `wasm32-unknown-unknown` and `wasm32v1-none` targets listed), so
running `cargo`/`rustup` from inside `contracts/` automatically uses the
pinned toolchain and auto-installs its targets. When in doubt, install the
pinned toolchain explicitly:

```bash
rustup toolchain install 1.91.0
rustup target add wasm32v1-none --toolchain 1.91.0
```

**Verification**

```bash
cd contracts/ophirpay && cargo build --target wasm32v1-none --release
cd contracts/emitter && cargo build --target wasm32v1-none --release
```

Both builds should succeed and emit `.wasm` files under
`contracts/*/target/wasm32v1-none/release/`.

---

## 3. Prisma migration errors

**Symptom**

Any of the following:

- `npx prisma db push` fails with `Environment variable not found: DATABASE_URL`
- `npx prisma generate` fails or generates an empty/stale client
- The app errors at startup with `PrismaClientInitializationError` or
  `table "User" does not exist` (SQLite: `no such table: User`)
- `P1001: Can't reach database server` or `P1000: Authentication failed`

**Cause**

- `DATABASE_URL` is not set — the repo uses `.env.example` as a template;
  the file must be copied to `.env` (or `.env.local`) before Prisma runs.
- **The default local database is PostgreSQL, not SQLite.** `.env.example`
  ships `DATABASE_PROVIDER=postgresql` with
  `DATABASE_URL=postgresql://localhost:5432/ophirpay`, and
  `prisma/schema.prisma` enables the PostgreSQL datasource. If no PostgreSQL
  server is running locally, `prisma db push` fails with `P1001: Can't reach
  database server` — the connectivity error this entry is meant to resolve.
  SQLite is an opt-in dev alternative (see step 5), not the default.
- A schema/database drift between `prisma/schema.prisma` and the local
  database after pulling new commits.
- A stale Prisma client after a schema change.

**Resolution**

1. Create the environment file from the template:
   ```bash
   cp .env.example .env
   ```
2. Confirm the variables are present and point where you expect:
   ```bash
   grep -E 'DATABASE_URL|DATABASE_PROVIDER' .env
   # DATABASE_PROVIDER=postgresql
   # DATABASE_URL=postgresql://localhost:5432/ophirpay
   ```
3. Make sure a PostgreSQL server is reachable at that URL. The quickest
   path is the repository's bundled `docker-compose.yml` (PostgreSQL 16,
   user/password/db all `ophirpay`):
   ```bash
   docker compose up -d db
   ```
   then point the URL at it:
   ```bash
   # .env
   DATABASE_URL=postgresql://ophirpay:ophirpay@localhost:5432/ophirpay
   ```
   Alternatively, install/start PostgreSQL locally and create the `ophirpay`
   database before continuing.
4. Apply the schema and regenerate the client (in this order):
   ```bash
   npx prisma db push
   npx prisma generate
   ```
5. **SQLite dev alternative (no server needed):** the schema header in
   `prisma/schema.prisma` documents the switch — set
   `DATABASE_PROVIDER=sqlite` and `DATABASE_URL="file:./dev.db"`, and swap
   the datasource in `prisma/schema.prisma` (uncomment the `sqlite` block,
   comment out the `postgresql` block). Then `npx prisma db push` again.
6. If the app still uses a stale client, regenerate and restart the dev
   server:
   ```bash
   npm run db:generate
   npm run dev
   ```
7. For a remote PostgreSQL (production/Neon), use a connection string that
   includes credentials, e.g.
   `postgresql://user:pass@host:5432/dbname?sslmode=require`, and ensure the
   database exists before running `db push`.

**Verification**

```bash
npx prisma validate   # should print "schema is valid"
npm run typecheck     # Prisma client types resolve
npm run dev           # app boots without DB errors
```

---

## 4. WASM build failures

**Symptom**

- `cargo build --target wasm32v1-none --release` fails with linker or
  compilation errors.
- CI's `contract-wasm` job fails while the local build passes (or vice
  versa).
- The build fails with `error: requires `-Zbuild-std` or `--target``, or
  missing `core`/`alloc` crates.

**Cause**

- The `wasm32v1-none` target is missing (see
  [entry 2](#2-rust-wasm32-target-missing)).
- The Rust toolchain is too old or too new for the pinned `soroban-sdk`
  (CI pins **1.91.0**). SDK version drift between branches can also break
  the build.
- Stale build artifacts from a previous toolchain/target combination.
- `#![no_std]` hygiene issues — code accidentally pulling in `std` (e.g.
  `println!`, `Vec` without `soroban_sdk::vec!`).

**Resolution**

1. Confirm the target is installed for the right toolchain:
   ```bash
   rustup target add wasm32v1-none
   rustup show
   ```
2. Match the pinned toolchain from CI:
   ```bash
   rustup toolchain install 1.91.0
   rustup default 1.91.0
   ```
3. Clean stale artifacts and rebuild:
   ```bash
   cd contracts/ophirpay
   cargo clean
   cargo build --target wasm32v1-none --release
   ```
4. If the error names a `std`-only item, keep the contract `#![no_std]`:
   use `soroban_sdk::vec!`, `String::from_str`, and `Result` instead of
   `std` types.
5. Check the WASM size gate — the Soroban protocol limit is 128 KB per
   contract. If the build succeeds but CI's `contract-gas-report` fails,
   the WASM is likely over the limit:
   ```bash
   ls -lh contracts/ophirpay/target/wasm32v1-none/release/*.wasm
   ```

**Verification**

```bash
cd contracts/ophirpay && cargo build --target wasm32v1-none --release
cd contracts/emitter && cargo build --target wasm32v1-none --release
```

---

## 5. Node version mismatch

**Symptom**

- `npm install` fails with engine warnings or `EBADENGINE`.
- `npm run dev` crashes early, or Next.js reports an unsupported Node
  version.
- CI passes but the local build fails (or the reverse).

**Cause**

OphirPay pins Node in `.nvmrc` (currently **20**). Next.js and the toolchain
have a supported Node range; running a much older (or much newer) major
version can cause build and runtime failures.

**Resolution**

1. Check the current version:
   ```bash
   node -v
   cat .nvmrc   # expected major version
   ```
2. Switch to the pinned version:
   ```bash
   nvm use            # reads .nvmrc automatically
   # or, without nvm:
   nvm install 20 && nvm use 20
   ```
3. After switching, reinstall dependencies to avoid native-module skew:
   ```bash
   rm -rf node_modules
   npm install
   ```
4. Verify the app boots:
   ```bash
   npm run typecheck && npm run dev
   ```

> If you must use a different major version, note that CI always runs the
> version in `.nvmrc` — a locally passing build on another version is not a
> guarantee the PR checks will pass.

**Verification**

```bash
node -v                # matches .nvmrc
npm run typecheck      # clean
npm run dev            # serves on the configured port
```

---

## 6. Port conflicts

**Symptom**

- `npm run dev` prints `EADDRINUSE` or `Port 3000 is already in use`.
- The app opens but shows another project, or requests hang/time out.
- `Prisma Studio` or the API server fails to bind.

**Cause**

Another process is already listening on port `3000` (the Next.js default) —
commonly a second OphirPay dev server, a previous run that was not stopped, or
an unrelated service (another framework's dev server, a proxy, a container
port mapping).

**Resolution**

1. Find what is holding the port (platform-dependent):
   ```bash
   # Linux / macOS
   lsof -i :3000
   # Windows (Git Bash / PowerShell)
   netstat -ano | findstr :3000
   ```
2. Either stop the offending process (only if you own it — it may be another
   developer's server) or run OphirPay on a different port:
   ```bash
   npm run dev -- -p 3001
   # or
   PORT=3001 npm run dev
   ```
3. Update `NEXT_PUBLIC_APP_URL` in `.env` if you change the port, so
   absolute URLs built from it — payment links, SEO/metadata, and the proxy
   base URL — point at the right origin. (CSRF and webhook calls are not
   affected: CSRF uses relative requests and webhook URLs are user-provided.)
4. If a stale Next.js process lingers, stop it before restarting:
   ```bash
   pkill -f "next dev"   # careful: stops all next dev processes
   ```

**Verification**

- `npm run dev -- -p 3001` serves the app at `http://localhost:3001`.
- The home page loads and the API health check responds:
  ```bash
  curl -s http://localhost:3001/api/health
  ```

---

## Still stuck?

- Re-read the [README quick start](../README.md#-quick-start) and make sure
  every step ran in order.
- Search existing [issues](https://github.com/OphirPay/OphirPay/issues) — your
  problem may already have a thread.
- Open a [bug report](https://github.com/OphirPay/OphirPay/issues/new?template=bug_report.yml)
  with: OS and versions (`node -v`, `npm -v`, `rustc -V`), the exact commands
  you ran, the full error output, and what you expected to happen.
