import crypto from "crypto";
import prisma from "@/lib/prisma";
import { successResponse, serverError } from "@/lib/api-response";
import { logger } from "@/lib/logger";
import { withApiAuth } from "@/lib/api-auth";

/**
 * GET /api/keys — list API keys (without exposing hashes)
 */
const _GET = async () => {
  try {
    const keys = await prisma.apiKey.findMany({
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, prefix: true, lastUsed: true, createdAt: true, expiresAt: true },
    });
    return successResponse(keys);
  } catch {
    return serverError("Failed to fetch API keys");
  }
}

/**
 * POST /api/keys — generate a new API key
 * The raw key is returned only once; only the hash is stored.
 */
const _POST = async (request: Request) => {
  try {
    const { name, userId } = await request.json() as { name: string; userId: string };

    if (!name || !userId) {
      return serverError("Name and userId are required");
    }

    // Generate a secure API key
    const rawKey = `oph_${crypto.randomBytes(24).toString("hex")}`;
    const keyHash = crypto.createHash("sha256").update(rawKey).digest("hex");
    const prefix = rawKey.slice(0, 11);

    const apiKey = await prisma.apiKey.create({
      data: { name, keyHash, prefix, userId },
    });

    logger.info("API key generated", { id: apiKey.id, name });

    return successResponse(
      { id: apiKey.id, name: apiKey.name, prefix, key: rawKey },
      undefined,
      201
    );
  } catch (err) {
    logger.error("Failed to generate API key", { error: String(err) });
    return serverError("Failed to generate API key");
  }
}

/**
 * DELETE /api/keys?id=... — revoke an API key
 */
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return serverError("Key ID is required");

    await prisma.apiKey.delete({ where: { id } });
    return successResponse({ deleted: true });
  } catch {
    return serverError("Failed to revoke API key");
  }
}

export const GET = withApiAuth(_GET);
export const POST = withApiAuth(_POST);
