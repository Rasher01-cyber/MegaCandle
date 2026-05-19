import type { MtAccount, MtPosition } from "@prisma/client";
import { TradeSource } from "@prisma/client";
import { createTradeRecord } from "./tradeRecord";

/** Save a closed website trade to the journal (with 2% profit commission). */
export async function journalWebsiteClose(
  account: MtAccount,
  position: MtPosition,
  closePrice: number,
  grossPnl: number,
) {
  const mtLabel = account.platform === "MT4" ? "MT4" : "MT5";
  return createTradeRecord({
    userId: account.userId,
    symbol: position.symbol,
    side: position.side,
    entryPrice: position.openPrice,
    exitPrice: closePrice,
    lotSize: position.volume,
    openTime: position.openTime,
    closeTime: new Date(),
    grossPnl,
    mtTicket: position.ticket,
    source: TradeSource.WEBSITE,
    notes: `Closed via MegaCandle · ${mtLabel} ticket ${position.ticket}`,
    strategy: "MegaCandle Live",
  });
}
