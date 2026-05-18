-- CreateTable
CREATE TABLE "MtAccount" (
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MtAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MtPosition" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "accountId" TEXT NOT NULL,
    "ticket" INTEGER NOT NULL,
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

-- CreateTable
CREATE TABLE "MtCommand" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "accountId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "symbol" TEXT,
    "side" TEXT,
    "volume" REAL,
    "ticket" INTEGER,
    "sl" REAL,
    "tp" REAL,
    "errorMsg" TEXT,
    "executedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MtCommand_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "MtAccount" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "MtAccount_pairingCode_key" ON "MtAccount"("pairingCode");

-- CreateIndex
CREATE UNIQUE INDEX "MtPosition_accountId_ticket_key" ON "MtPosition"("accountId", "ticket");
