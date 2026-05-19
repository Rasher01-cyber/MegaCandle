-- AlterTable
ALTER TABLE "Trade" ADD COLUMN "grossPnl" REAL;
ALTER TABLE "Trade" ADD COLUMN "platformFee" REAL NOT NULL DEFAULT 0;
ALTER TABLE "Trade" ADD COLUMN "mtTicket" INTEGER;

CREATE UNIQUE INDEX "Trade_userId_mtTicket_key" ON "Trade"("userId", "mtTicket");
