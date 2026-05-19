import { MtCommandStatus, MtCommandType, MtPlatform, TradeSide, TradeSource } from "@prisma/client";
import { prisma } from "./prisma";
import { createTradeRecord } from "./tradeRecord";

export type MtClosedDealInput = {
  ticket: number;
  symbol: string;
  side: TradeSide;
  volume: number;
  openPrice: number;
  closePrice: number;
  openTime: string | Date;
  closeTime: string | Date;
  commission: number;
  profit: number;
};

export async function importMtClosedDeals(
  userId: string,
  accountId: string,
  accountPlatform: MtPlatform,
  deals: MtClosedDealInput[],
): Promise<number> {
  const mtLabel = accountPlatform === MtPlatform.MT4 ? "MT4" : "MT5";
  let imported = 0;

  for (const deal of deals) {
    const openedOnWebsite = await prisma.mtCommand.findFirst({
      where: {
        accountId,
        type: MtCommandType.OPEN,
        status: MtCommandStatus.EXECUTED,
        ticket: BigInt(deal.ticket),
      },
    });

    const source = openedOnWebsite
      ? TradeSource.WEBSITE
      : accountPlatform === MtPlatform.MT4
        ? TradeSource.MT4
        : TradeSource.MT5;

    const created = await createTradeRecord({
      userId,
      symbol: deal.symbol,
      side: deal.side,
      entryPrice: deal.openPrice,
      exitPrice: deal.closePrice,
      lotSize: deal.volume,
      openTime: new Date(deal.openTime),
      closeTime: new Date(deal.closeTime),
      grossPnl: deal.profit,
      brokerCommission: Math.abs(deal.commission),
      mtTicket: deal.ticket,
      source,
      notes: openedOnWebsite
        ? `Opened via MegaCandle · ${mtLabel} ticket ${deal.ticket}`
        : `Synced from ${mtLabel} · ticket ${deal.ticket}`,
      strategy: "MegaCandle Live",
    });

    if (created) imported += 1;
  }

  return imported;
}
