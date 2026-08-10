// SPDX-License-Identifier: MIT

import { successResponse, handleApiError } from "@/lib/api-response";
import { simulateContractCall, DEFAULT_CONTRACT_ID, EMITTER_CONTRACT_ID, CHAIN_READ_SOURCE } from "@/lib/contracts";
import { STELLAR_NETWORK, SOROBAN_RPC_URL } from "@/lib/stellar";

/**
 * GET /api/contracts — contract deployment info and version
 * Reads contract version and owner from OphirPayContract on-chain.
 */
export async function GET() {
  try {
    const [versionResult, ownerResult] = await Promise.all([
      simulateContractCall(DEFAULT_CONTRACT_ID, "get_version", CHAIN_READ_SOURCE),
      simulateContractCall(DEFAULT_CONTRACT_ID, "get_owner", CHAIN_READ_SOURCE),
    ]);

    const reachable = versionResult.status !== "SIMULATION_FAILED";

    return successResponse({
      network: STELLAR_NETWORK,
      rpcUrl: SOROBAN_RPC_URL,
      reachable,
      contracts: {
        ophirpay: {
          id: DEFAULT_CONTRACT_ID,
          version: reachable ? versionResult.returnValue : null,
          owner: reachable ? ownerResult.returnValue : null,
        },
        emitter: {
          id: EMITTER_CONTRACT_ID,
        },
      },
    });
  } catch (err) {
    return handleApiError(err, "GET /api/contracts");
  }
}
