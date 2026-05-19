import { TradeSource, type Trade } from "@prisma/client";
import { serializeTradeRecord, tradePnlPercent } from "./tradeRecord";

export function inferTradeSource(trade: Pick<Trade, "source" | "notes" | "strategy">): TradeSource {
  const notes = trade.notes ?? "";
  if (notes.includes("Synced from MT4")) return TradeSource.MT4;
  if (notes.includes("Synced from MT5")) return TradeSource.MT5;
  if (notes.includes("MegaCandle hosted") || notes.includes("Opened via MegaCandle")) {
    return TradeSource.WEBSITE;
  }
  if (trade.source && trade.source !== TradeSource.JOURNAL) {
    return trade.source;
  }
  if (trade.strategy === "MegaCandle Live" && !notes.includes("Synced from MT")) {
    return TradeSource.WEBSITE;
  }
  return trade.source ?? TradeSource.JOURNAL;
}

export function tradeSourceLabel(source: TradeSource): string {
  switch (source) {
    case TradeSource.WEBSITE:
      return "Website";
    case TradeSource.MT5:
      return "MT5";
    case TradeSource.MT4:
      return "MT4";
    default:
      return "Journal";
  }
}

export function serializeTrade<T extends Trade>(trade: T) {
  const source = inferTradeSource(trade);
  const base = serializeTradeRecord({ ...trade, source });
  return { ...base, source, sourceLabel: tradeSourceLabel(source) };
}

export { tradePnlPercent };
