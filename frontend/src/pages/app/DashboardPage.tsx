import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { motion } from "framer-motion";
import { api } from "../../lib/api";
import { UiButton, UiCard, UiEmptyState, UiSectionHeader, UiSkeleton } from "../../components/ui";
import MonthlyPnLCalendar from "../../components/MonthlyPnLCalendar";
import HoverScaleCard from "../../components/HoverScaleCard";
import { ArrowDownRight, ArrowUpRight, Clock3, ListTodo, SlidersHorizontal } from "lucide-react";
import TradeSourceBadge from "../../components/TradeSourceBadge";
import type { TradeSource } from "../../lib/tradeSource";
function toNumber(value: unknown, fallback = 0) {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export default function DashboardPage() {
  const [range, setRange] = useState<"all" | "30d" | "7d">("all");
  const { data: summary } = useQuery({
    queryKey: ["summary"],
    queryFn: async () => (await api.get("/api/analytics/summary")).data,
  });
  const { data: curve, isLoading: curveLoading } = useQuery({
    queryKey: ["equity"],
    queryFn: async () => (await api.get("/api/analytics/equity-curve")).data.points as any[],
  });
  const { data: mt5 } = useQuery({
    queryKey: ["mt5-positions"],
    queryFn: async () => (await api.get("/api/mt5/positions")).data,
    staleTime: 60_000,
    refetchInterval: false,
  });
  const { data: recentTradesData } = useQuery({
    queryKey: ["trades", "recent"],
    queryFn: async () => (await api.get("/api/trades?page=1&pageSize=8")).data,
    staleTime: 30_000,
  });
  const recentTrades = (recentTradesData?.items ?? []) as Array<{
    id: string;
    symbol: string;
    side: string;
    pnl: number;
    closeTime: string;
    source?: TradeSource;
    sourceLabel?: string;
  }>;
  const livePositions = (mt5?.positions ?? []) as Array<{ symbol: string; side: string; profit: number; ticket: number }>;
  const totalTrades = toNumber(summary?.totalTrades);
  const totalPnl = toNumber(summary?.totalPnl);
  const winRate = toNumber(summary?.winRate);
  const avgPnl = toNumber(summary?.avgPnl);
  const unrealizedPnl = livePositions.reduce((s, p) => s + toNumber(p.profit), 0);
  const account = mt5?.account as { balance?: number; equity?: number; floatingProfit?: number } | undefined;
  const openPnlFromAccount =
    typeof account?.floatingProfit === "number" ? account.floatingProfit : unrealizedPnl;
  const hasTrades = totalTrades > 0;
  const filteredCurve = useMemo(() => {
    const points = Array.isArray(curve) ? curve : [];
    if (range === "all") return points;
    const days = range === "30d" ? 30 : 7;
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    return points.filter((p: any) => new Date(p?.date ?? "").getTime() >= cutoff);
  }, [curve, range]);

  return (
    <section className="space-y-6">
      <UiSectionHeader
        badge="Performance Center"
        title="Dashboard"
        description="Track momentum, review trade quality, and keep your risk process consistent."
        action={
          <div className="flex flex-wrap gap-2">
            <UiButton href="/app/trades">
              <ArrowUpRight size={14} className="mr-1" />
              Take Trade
            </UiButton>
            <UiButton href="/app/trades?tab=journal" variant="ghost">
              <SlidersHorizontal size={14} className="mr-1" />
              Trade journal
            </UiButton>
          </div>
        }
      />

      <HoverScaleCard>
        <UiCard className="border-blue-200/60 bg-gradient-to-r from-blue-500/10 via-transparent to-cyan-500/10 p-5 dark:border-blue-500/25">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">Trades · MegaCandle</p>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                Live MT5 trading and your trade journal on one page.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <UiButton href="/app/trades">
                <ArrowUpRight size={14} className="mr-1" />
                Take Trade
              </UiButton>
              <UiButton href="/app/trades?tab=journal" variant="ghost">
                <ArrowDownRight size={14} className="mr-1" />
                Journal
              </UiButton>
            </div>
          </div>
        </UiCard>
      </HoverScaleCard>

      <MonthlyPnLCalendar />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <PnLCard label="Realized P/L" value={totalPnl} hint={`${totalTrades} closed trades`} money />
        <PnLCard
          label="Open P/L (live)"
          value={openPnlFromAccount}
          hint={`${livePositions.length} open position${livePositions.length === 1 ? "" : "s"}`}
          money
        />
        <PnLCard label="Win rate" value={winRate} hint={`Avg $${avgPnl.toFixed(2)} / trade`} percent />
        <PnLCard
          label="Equity"
          value={toNumber(account?.equity)}
          hint={account?.balance != null ? `Balance $${toNumber(account.balance).toFixed(2)}` : "Connect on Trades"}
          money={Boolean(account?.equity)}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <HoverScaleCard>
          <UiCard className="p-5">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-slate-900 dark:text-white">Live positions (MT5)</div>
              <UiButton href="/app/trades" variant="ghost" className="!px-2 !py-1 text-xs">
                Open
              </UiButton>
            </div>
            {livePositions.length === 0 ? (
              <div className="mt-4 flex items-center gap-3 text-slate-600 dark:text-slate-400">
                <ListTodo size={22} className="opacity-70" />
                <span className="text-sm">No open positions — MegaCandle links MT5 automatically</span>
              </div>
            ) : (
              <div className="mt-3 space-y-2">
                {livePositions.slice(0, 4).map((p) => (
                  <div key={p.ticket} className="flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      {p.symbol} · {p.side}
                    </span>
                    <span className={p.profit >= 0 ? "text-emerald-600" : "text-rose-600"}>{p.profit.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}
          </UiCard>
        </HoverScaleCard>
        <HoverScaleCard>
          <UiCard className="p-5">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-slate-900 dark:text-white">Trade history</div>
              <UiButton href="/app/trades?tab=journal" variant="ghost" className="!px-2 !py-1 text-xs">
                View all
              </UiButton>
            </div>
            {recentTrades.length === 0 ? (
              <div className="mt-6 flex flex-col items-center justify-center text-center text-slate-500 dark:text-slate-400">
                <Clock3 size={28} className="opacity-40" />
                <p className="mt-3 text-sm">No closed trades yet</p>
              </div>
            ) : (
              <div className="mt-3 space-y-2">
                {recentTrades.map((trade) => (
                  <div
                    key={trade.id}
                    className="flex items-center justify-between gap-2 rounded-lg border border-slate-200/80 px-3 py-2 dark:border-white/10"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                          {trade.symbol} · {trade.side}
                        </span>
                        <TradeSourceBadge source={trade.source} sourceLabel={trade.sourceLabel} />
                      </div>
                      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                        {new Date(trade.closeTime).toLocaleString()}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 text-sm font-semibold ${trade.pnl >= 0 ? "text-emerald-600" : "text-rose-600"}`}
                    >
                      {trade.pnl >= 0 ? "+" : ""}
                      {Number(trade.pnl).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </UiCard>
        </HoverScaleCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <HoverScaleCard>
          <UiCard className="h-[340px] p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="font-semibold">Equity Curve</div>
              <div className="flex items-center gap-2">
                {(["7d", "30d", "all"] as const).map((opt) => (
                  <motion.button
                    key={opt}
                    type="button"
                    whileHover={{ scale: 1.08 }}
                    onClick={() => setRange(opt)}
                    className={`rounded-lg px-2 py-1 text-[11px] uppercase ${
                      range === opt
                        ? "bg-blue-500 text-white"
                        : "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                    }`}
                  >
                    {opt}
                  </motion.button>
                ))}
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {hasTrades ? `${filteredCurve.length} points` : "No data"}
                </div>
              </div>
            </div>
            {curveLoading ? (
              <div className="space-y-3">
                <UiSkeleton className="h-5 w-32" />
                <UiSkeleton className="h-[240px] w-full" />
              </div>
            ) : !hasTrades ? (
              <UiEmptyState
                title="No chart data yet"
                description="Add trades or seed demo data to visualize equity progression."
                action={<UiButton href="/app/trades">Open Trades</UiButton>}
              />
            ) : (
              <ResponsiveContainer width="100%" height="90%">
                <AreaChart data={filteredCurve}>
                  <XAxis dataKey="date" hide />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: "#9ca3af", fontSize: 12 }} />
                  <Tooltip contentStyle={{ background: "#020617", border: "1px solid #334155", borderRadius: 8 }} />
                  <Area type="monotone" dataKey="equity" stroke="#3b82f6" fill="#3b82f655" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </UiCard>
        </HoverScaleCard>

        <HoverScaleCard>
          <UiCard className="p-4">
            <div className="font-semibold">Execution Checklist</div>
            <div className="mt-4 space-y-3 text-sm">
              <Insight label="Pre-trade" value="Validate setup and invalidation level." />
              <Insight label="Risk note" value="Keep risk below 1-2% per trade." />
              <Insight label="Post-trade" value="Journal reason, outcome, and lesson." />
            </div>
          </UiCard>
        </HoverScaleCard>
      </div>
    </section>
  );
}

function PnLCard({
  label,
  value,
  hint,
  money,
  percent,
}: {
  label: string;
  value: number;
  hint: string;
  money?: boolean;
  percent?: boolean;
}) {
  const display = percent ? `${value.toFixed(1)}%` : money ? `$${value.toFixed(2)}` : value.toFixed(2);
  const positive = value >= 0;
  return (
    <HoverScaleCard>
      <UiCard className="p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
        <p
          className={`mt-2 text-2xl font-bold ${
            money || percent
              ? positive
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-rose-600 dark:text-rose-400"
              : "text-slate-900 dark:text-white"
          }`}
        >
          {display}
        </p>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{hint}</p>
      </UiCard>
    </HoverScaleCard>
  );
}

function Insight({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-500/25 bg-slate-900/65 p-3">
      <div className="text-xs text-slate-400">{label}</div>
      <div className="mt-1 text-slate-200">{value}</div>
    </div>
  );
}
