import {
  TransactionBuilder,
  Operation,
  Asset,
} from "@stellar/stellar-sdk";
import { getHorizonServer, NETWORK_PASSPHRASE } from "@/lib/stellar";

interface SimulateResult {
  success: boolean;
  fee: string;
  error?: string;
  operations: number;
}

/**
 * Simulate a payment transaction to estimate fees and check for errors
 * before asking the user to sign. Catches invalid destinations, insufficient
 * funds, and trustline issues before the Freighter prompt.
 */
export async function simulatePayment(params: {
  sourcePublicKey: string;
  destination: string;
  amount: string;
}): Promise<SimulateResult> {
  try {
    const server = getHorizonServer();
    const sourceAccount = await server.loadAccount(params.sourcePublicKey);

    const now = Math.floor(Date.now() / 1000);
    const baseFee = await server.fetchBaseFee();

    const tx = new TransactionBuilder(sourceAccount, {
      fee: baseFee.toString(),
      networkPassphrase: NETWORK_PASSPHRASE,
      timebounds: { minTime: 0, maxTime: now + 300 },
    })
      .addOperation(
        Operation.payment({
          destination: params.destination,
          asset: Asset.native(),
          amount: params.amount,
        })
      )
      .build();

    // Simulate the transaction to validate without signing
    try {
      await server.simulateTransaction(tx);
    } catch (simErr) {
      return {
        success: false,
        fee: baseFee.toString(),
        error: simErr instanceof Error ? simErr.message : "Simulation failed",
        operations: 1,
      };
    }

    return {
      success: true,
      fee: baseFee.toString(),
      operations: 1,
    };
  } catch (err) {
    return {
      success: false,
      fee: "100",
      error: err instanceof Error ? err.message : "Unknown simulation error",
      operations: 1,
    };
  }
}
