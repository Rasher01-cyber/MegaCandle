import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowDownRight, ArrowUpRight, RefreshCw } from "lucide-react";
import { UiButton, UiCard, UiSectionHeader, UiSkeleton } from "../../components/ui";

type TickerRow = {
  symbol: string;
  lastPrice: string;
  priceChangePercent: string;
  volume: string;
};

const symbols = ["BTCUSDT", "ETHUSDT", "BNBUSDT", "SOLUSDT", "XRPUSDT", "DOGEUSDT", "ADAUSDT", "LTCUSDT"];

export default function LiveMarketPage() {
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["live-market"],
    queryFn: async () => {
      const res = await fetch("https://api.binance.com/api/v3/ticker/24hr");
      const rows = (await res.json()) as TickerRow[];
      return rows.filter((row) => symbols.includes(row.symbol));
    },
    refetchInterval: 5000,
  });

  const topMover = useMemo(() => {
    const rows = data ?? [];
    if (!rows.length) return null;
    return [...rows].sort((a, b) => Number(b.priceChangePercent) - Number(a.priceChangePercent))[0];
  }, [data]);

  return (
    <section className="space-y-5">
      <UiSectionHeader
        badge="Market Intelligence"
        title="Live Market"
        description="Monitor live movers, price change, and volume with 5-second refresh."
        action={
          <UiButton onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw size={14} className="mr-1" />
            {isFetching ? "Refreshing..." : "Refresh"}
          </UiButton>
        }
      />

      {topMover ? (
        <UiCard className="p-4">
          <div className="text-xs uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Top 24h mover</div>
          <div className="mt-2 flex items-center justify-between">
            <div className="text-xl font-semibold">{topMover.symbol}</div>
            <div
              className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm ${
                Number(topMover.priceChangePercent) >= 0
                  ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300"
                  : "bg-rose-500/15 text-rose-600 dark:text-rose-300"
              }`}
            >
              {Number(topMover.priceChangePercent) >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
              {Number(topMover.priceChangePercent).toFixed(2)}%
            </div>
          </div>
        </UiCard>
      ) : null}

      <UiCard className="overflow-hidden">
        {isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 8 }).map((_, idx) => (
              <UiSkeleton key={idx} className="h-10 w-full" />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-slate-300">
                <tr>
                  <th className="p-3 text-left">Symbol</th>
                  <th className="p-3 text-left">Last Price</th>
                  <th className="p-3 text-left">24h %</th>
                  <th className="p-3 text-left">Volume</th>
                </tr>
              </thead>
              <tbody>
                {(data ?? []).map((row) => {
                  const up = Number(row.priceChangePercent) >= 0;
                  return (
                    <tr key={row.symbol} className="border-t border-slate-200 dark:border-white/10">
                      <td className="p-3 font-semibold">{row.symbol}</td>
                      <td className="p-3">${Number(row.lastPrice).toFixed(4)}</td>
                      <td className={`p-3 ${up ? "text-emerald-600 dark:text-emerald-300" : "text-rose-600 dark:text-rose-300"}`}>
                        {up ? "+" : ""}
                        {Number(row.priceChangePercent).toFixed(2)}%
                      </td>
                      <td className="p-3">{Number(row.volume).toFixed(2)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </UiCard>
    </section>
  );
}
