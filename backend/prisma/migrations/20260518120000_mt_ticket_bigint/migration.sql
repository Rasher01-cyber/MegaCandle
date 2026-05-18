-- MT5 position/order tickets exceed 32-bit INT (e.g. 56689187245).
-- SQLite INTEGER is 64-bit; Prisma BigInt maps to the same storage with wider client validation.

PRAGMA foreign_keys=OFF;

CREATE TABLE "new_MtPosition" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "accountId" TEXT NOT NULL,
    "ticket" BIGINT NOT NULL,
    "symbol" TEXT NOT NULL,
    "side" TEXT NOT NULL,
    "volume" REAL NOT NULL,
    "openPrice" REAL NOT NULL,
    "currentPrice" REAL NOT NULL,
    "profit" REAL NOT NULL DEFAULT 0,
    "openTime" DATETIME NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MtPosition_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "MtAccount" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "new_MtPosition" ("id", "accountId", "ticket", "symbol", "side", "volume", "openPrice", "currentPrice", "profit", "openTime", "updatedAt")
SELECT "id", "accountId", "ticket", "symbol", "side", "volume", "openPrice", "currentPrice", "profit", "openTime", "updatedAt" FROM "MtPosition";

DROP TABLE "MtPosition";
ALTER TABLE "new_MtPosition" RENAME TO "MtPosition";

CREATE UNIQUE INDEX "MtPosition_accountId_ticket_key" ON "MtPosition"("accountId", "ticket");

CREATE TABLE "new_MtCommand" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "accountId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "symbol" TEXT,
    "side" TEXT,
    "volume" REAL,
    "ticket" BIGINT,
    "sl" REAL,
    "tp" REAL,
    "errorMsg" TEXT,
    "executedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MtCommand_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "MtAccount" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "new_MtCommand" ("id", "accountId", "type", "status", "symbol", "side", "volume", "ticket", "sl", "tp", "errorMsg", "executedAt", "createdAt")
SELECT "id", "accountId", "type", "status", "symbol", "side", "volume", "ticket", "sl", "tp", "errorMsg", "executedAt", "createdAt" FROM "MtCommand";

DROP TABLE "MtCommand";
ALTER TABLE "new_MtCommand" RENAME TO "MtCommand";

PRAGMA foreign_keys=ON;
