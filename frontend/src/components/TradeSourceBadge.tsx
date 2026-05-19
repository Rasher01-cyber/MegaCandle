import React from "react";
import { tradeSourceBadgeClass, tradeSourceLabel, type TradeSource } from "../lib/tradeSource";

export default function TradeSourceBadge({
  source,
  sourceLabel,
}: {
  source?: TradeSource | string;
  sourceLabel?: string;
}) {
  const label = sourceLabel ?? tradeSourceLabel(source);
  return (
    <span
      className={`inline-flex rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${tradeSourceBadgeClass(source)}`}
    >
      {label}
    </span>
  );
}
