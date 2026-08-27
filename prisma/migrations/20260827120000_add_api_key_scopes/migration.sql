-- Store the selected API-key permissions as JSON while keeping the key row
-- independently queryable by its hash and prefix.
ALTER TABLE "ApiKey" ADD COLUMN "scopes" TEXT NOT NULL DEFAULT '["read","write"]';
