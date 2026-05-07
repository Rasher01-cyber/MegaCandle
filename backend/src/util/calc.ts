import { TradeSide } from "@prisma/client";

export function computePnl(params: {
  side: TradeSide;
  entryPrice: number;
  exitPrice: number;
  lotSize: number;
  fees?: number;
}) {
  const sign = params.side === TradeSide.LONG ? 1 : -1;
  const gross = (params.exitPrice - params.entryPrice) * params.lotSize * sign;
  return gross - (params.fees ?? 0);
}

