import { TradeSide, TradeSource, type Trade } from "@prisma/client";
import { prisma } from "./prisma";
import { applyWebsiteCommission } from "./websiteCommission";

export function tradePnlPercent(side: TradeSide, entryPrice: number, exitPrice: number) {
  if (!entryPrice) return 0;
  const raw =
    side === TradeSide.LONG
      ? ((exitPrice - entryPrice) / entryPrice) * 100
      : ((entryPrice - exitPrice) / entryPrice) * 100;
  return Math.round(raw * 100) / 100;
}

export type CreateTradeRecordInput = {
  userId: string;
  symbol: string;
  side: TradeSide;
  entryPrice: number;
  exitPrice: number;
  lotSize: number;
  openTime: Date;
  closeTime: Date;
  grossPnl: number;
  source: TradeSource;
  mtTicket?: number | bigint | null;
  brokerCommission?: number;
  notes?: string | null;
  strategy?: string | null;
};

export async function createTradeRecord(input: CreateTradeRecordInput): Promise<Trade | null> {
  const ticket = input.mtTicket != null ? BigInt(input.mtTicket) : null;

  if (ticket != null) {
    const existing = await prisma.trade.findUnique({
      where: { userId_mtTicket: { userId: input.userId, mtTicket: ticket } },
    });
    if (existing) return existing;
  }

  const isWebsite = input.source === TradeSource.WEBSITE;
  const { grossPnl, platformFee, netPnl } = applyWebsiteCommission(input.grossPnl, isWebsite);
  const brokerFees = Math.abs(input.brokerCommission ?? 0);

  return prisma.trade.create({
    data: {
      userId: input.userId,
      symbol: input.symbol.toUpperCase(),
      side: input.side,
      entryPrice: input.entryPrice,
      exitPrice: input.exitPrice,
      lotSize: input.lotSize,
      openTime: input.openTime,
      closeTime: input.closeTime,
      grossPnl,
      platformFee,
      pnl: netPnl,
      fees: brokerFees + platformFee,
      mtTicket: ticket,
      notes: input.notes ?? null,
      strategy: input.strategy ?? null,
      source: input.source,
    },
  });
}

export function serializeTradeRecord<T extends Trade>(trade: T) {
  const gross = trade.grossPnl ?? trade.pnl;
  const pnlPercent = tradePnlPercent(trade.side, trade.entryPrice, trade.exitPrice);
  return {
    ...trade,
    mtTicket: trade.mtTicket != null ? String(trade.mtTicket) : null,
    grossPnl: gross,
    pnlPercent,
    sourceLabel:
      trade.source === TradeSource.WEBSITE
        ? "Website"
        : trade.source === TradeSource.MT5
          ? "MT5"
          : trade.source === TradeSource.MT4
            ? "MT4"
            : "Journal",
  };
}
