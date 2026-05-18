-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_MtAccount" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "label" TEXT NOT NULL DEFAULT 'MT5 Account',
    "platform" TEXT NOT NULL DEFAULT 'MT5',
    "apiTokenHash" TEXT,
    "pairingCode" TEXT NOT NULL,
    "pairingExpiresAt" DATETIME NOT NULL,
    "brokerName" TEXT,
    "accountLogin" TEXT,
    "balance" REAL,
    "equity" REAL,
    "connected" BOOLEAN NOT NULL DEFAULT false,
    "lastSeenAt" DATETIME,
    "revoked" BOOLEAN NOT NULL DEFAULT false,
    "isHosted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MtAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_MtAccount" ("accountLogin", "apiTokenHash", "balance", "brokerName", "connected", "createdAt", "equity", "id", "label", "lastSeenAt", "pairingCode", "pairingExpiresAt", "platform", "revoked", "userId") SELECT "accountLogin", "apiTokenHash", "balance", "brokerName", "connected", "createdAt", "equity", "id", "label", "lastSeenAt", "pairingCode", "pairingExpiresAt", "platform", "revoked", "userId" FROM "MtAccount";
DROP TABLE "MtAccount";
ALTER TABLE "new_MtAccount" RENAME TO "MtAccount";
CREATE UNIQUE INDEX "MtAccount_pairingCode_key" ON "MtAccount"("pairingCode");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
