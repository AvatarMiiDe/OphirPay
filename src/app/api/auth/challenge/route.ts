// SPDX-License-Identifier: MIT

import {
  createChallengeToken,
  challengeMessage,
} from "@/lib/challenge";
import { isValidStellarAddress } from "@/lib/stellar";
import { successResponse, badRequestError } from "@/lib/api-response";
import { withRequestLogging } from "@/lib/request-logging";

/**
 * POST /api/auth/session
 * Establish a session. Protected by CSRF.
 */
export const GET = withRequestLogging(async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const publicKey = (searchParams.get("publicKey") ?? "").trim();

  if (!isValidStellarAddress(publicKey)) {
    return badRequestError(
      "A valid Stellar public key (G...) is required to mint a challenge."
    );
  }

  const challenge = createChallengeToken(publicKey);
  return successResponse({
    challenge,
    // The message embeds the challenge token so the signature is single-use.
    message: challengeMessage(publicKey, challenge),
    expiresIn: 300, // seconds
  });
});
