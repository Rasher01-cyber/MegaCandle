import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowDownRight, ArrowUpRight, Compass } from "lucide-react";
import { UiCard, UiSectionHeader, UiSkeleton } from "../../components/ui";

type TickerRow = {
  symbol: string;
  lastPrice: string;
  priceChangePercent: string;
};

const watchlist = ["BTCUSDT", "ETHUSDT", "SOLUSDT", "XRPUSDT", "ADAUSDT", "BNBUSDT"];

export default function TradeIdeasPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["trade-ideas"],
    queryFn: async () => {
      const res = await fetch("https://api.binance.com/api/v3/ticker/24hr");
      const rows = (await res.json()) as TickerRow[];
      return rows.filter((row) => watchlist.includes(row.symbol));
    },
    refetchInterval: 10000,
  });

  const ideas = useMemo(() => {
    return (data ?? []).map((row) => {
      const change = Number(row.priceChangePercent);
      if (change >= 4) return { ...row, setup: "Momentum Breakout", side: "LONG", confidence: "High" };
      if (change <= -4) return { ...row, setup: "Mean Reversion Bounce", side: "LONG", confidence: "Medium" };
      if (change <= -1) return { ...row, setup: "Trend Continuation", side: "SHORT", confidence: "Medium" };
      return { ...row, setup: "Range Scalping", side: "BOTH", confidence: "Low" };
    });
  }, [data]);

  return (
    <section className="space-y-5">
      <UiSectionHeader
        badge="Signal Desk"
        title="Trade Ideas"
        description="System-generated ideas based on live momentum and volatility. Use as guidance, not financial advice."
      />
      <div className="grid gap-4 md:grid-cols-2">
        {isLoading
          ? Array.from({ length: 6 }).map((_, idx) => (
              <UiCard key={idx} className="p-4">
                <UiSkeleton className="h-4 w-28" />
                <UiSkeleton className="mt-2 h-7 w-40" />
                <UiSkeleton className="mt-2 h-4 w-24" />
              </UiCard>
            ))
          : ideas.map((idea) => {
              const change = Number(idea.priceChangePercent);
              return (
                <UiCard key={idea.symbol} className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-xs uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">Idea</div>
                      <div className="mt-1 text-xl font-semibold">{idea.symbol}</div>
                    </div>
                    <div className={`inline-flex items-center gap-1 text-sm ${change >= 0 ? "text-emerald-600 dark:text-emerald-300" : "text-rose-600 dark:text-rose-300"}`}>
                      {change >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                      {change.toFixed(2)}%
                    </div>
                  </div>
                  <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm dark:border-white/10 dark:bg-white/5">
                    <div className="font-medium">{idea.setup}</div>
                    <div className="mt-1 text-slate-600 dark:text-slate-300">Bias: {idea.side} | Confidence: {idea.confidence}</div>
                  </div>
                  <div className="mt-3 inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                    <Compass size={13} />
                    Plan entry, stop, and risk before execution.
                  </div>
                </UiCard>
              );
            })}
      </div>
    </section>
  );
}
