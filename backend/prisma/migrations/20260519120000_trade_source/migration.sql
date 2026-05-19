-- AlterTable
ALTER TABLE "Trade" ADD COLUMN "source" TEXT NOT NULL DEFAULT 'JOURNAL';

UPDATE "Trade" SET "source" = 'MT5' WHERE "notes" LIKE '%Synced from MT5%';
UPDATE "Trade" SET "source" = 'MT4' WHERE "notes" LIKE '%Synced from MT4%';
UPDATE "Trade" SET "source" = 'WEBSITE' WHERE "notes" LIKE '%MegaCandle hosted%';
