/**
 * Deploy the OphirPay Soroban contract to Stellar Testnet.
 *
 * Usage: node scripts/deploy-contract.js <secret_key>
 *
 * Prerequisites:
 * - A funded Stellar Testnet account (use Friendbot)
 * - npm install @stellar/stellar-sdk
 */

const sdk = require("@stellar/stellar-sdk");
const fs = require("fs");
const path = require("path");

const RPC_URL = "https://soroban-testnet.stellar.org:443";
const NETWORK_PASSPHRASE = sdk.Networks.TESTNET;

async function main() {
  const secretKey = process.argv[2];
  if (!secretKey) {
    console.error("Usage: node scripts/deploy-contract.js <SECRET_KEY>");
    console.error("Get a funded testnet account at: https://laboratory.stellar.org/#account-creator?network=test");
    process.exit(1);
  }

  const server = new sdk.rpc.Server(RPC_URL, { allowHttp: false });
  const keypair = sdk.Keypair.fromSecret(secretKey);
  const publicKey = keypair.publicKey();

  console.log(`Deploying from: ${publicKey}`);

  // Load WASM
  const wasmPath = path.join(__dirname, "..", "contracts", "ophirpay", "target", "wasm32-unknown-unknown", "release", "ophirpay_contract.wasm");
  const wasmBuffer = fs.readFileSync(wasmPath);
  console.log(`WASM size: ${wasmBuffer.length} bytes`);

  // Load account
  const account = await server.getAccount(publicKey);
  console.log(`Account sequence: ${account.sequenceNumber()}`);

  // Build deploy transaction using invokeHostFunction
  const tx = new sdk.TransactionBuilder(account, {
    fee: "1000000",
    networkPassphrase: NETWORK_PASSPHRASE,
    timebounds: { minTime: 0, maxTime: Math.floor(Date.now() / 1000) + 300 },
  })
    .addOperation(
      sdk.Operation.invokeHostFunction({
        func: sdk.xdr.HostFunction.hostFunctionTypeUploadContractWasm(wasmBuffer),
        auth: [],
      })
    )
    .build();

  // Prepare
  console.log("Preparing transaction...");
  const prepared = await server.prepareTransaction(tx);
  prepared.sign(keypair);

  // Submit
  console.log("Submitting...");
  const result = await server.sendTransaction(prepared);
  console.log(`Transaction hash: ${result.hash}`);
  console.log(`Explorer: https://stellar.expert/explorer/testnet/tx/${result.hash}`);

  if (result.errorResult) {
    console.error("Deploy failed:", result.errorResult);
    process.exit(1);
  }

  // Poll for result
  let txResult = await server.getTransaction(result.hash);
  while (txResult.status === "NOT_FOUND") {
    await new Promise((r) => setTimeout(r, 1000));
    txResult = await server.getTransaction(result.hash);
  }

  console.log(`Status: ${txResult.status}`);

  if (txResult.status === "SUCCESS") {
    // Extract contract ID from result
    const resultMeta = txResult.resultMetaXdr;
    console.log("Contract deployed successfully!");
    console.log(`\nAdd this to your .env and src/lib/contracts.ts:`);
    console.log(`NEXT_PUBLIC_CONTRACT_ID=<extract from result meta>`);
  } else {
    console.error("Deployment failed with status:", txResult.status);
  }
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
