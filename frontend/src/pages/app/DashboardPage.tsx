import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { motion } from "framer-motion";
import { api } from "../../lib/api";
import { UiButton, UiCard, UiEmptyState, UiSectionHeader, UiSkeleton } from "../../components/ui";
import MonthlyPnLCalendar from "../../components/MonthlyPnLCalendar";
import HoverScaleCard from "../../components/HoverScaleCard";
import { ArrowDownRight, ArrowUpRight, Clock3, ListTodo, SlidersHorizontal } from "lucide-react";

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
  const livePositions = (mt5?.positions ?? []) as Array<{ symbol: string; side: string; profit: number; ticket: number }>;
  const totalTrades = toNumber(summary?.totalTrades);
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
            <UiButton href="/app/live-market">
              <ArrowUpRight size={14} className="mr-1" />
              Take Trade
            </UiButton>
            <UiButton href="/app/live-market" variant="ghost">
              <SlidersHorizontal size={14} className="mr-1" />
              Manage Trades
            </UiButton>
          </div>
        }
      />

      <HoverScaleCard>
        <UiCard className="border-blue-200/60 bg-gradient-to-r from-blue-500/10 via-transparent to-cyan-500/10 p-5 dark:border-blue-500/25">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">Live Market · MegaCandle</p>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                Place trades with optional SL/TP and manage open positions synced with MT5.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <UiButton href="/app/live-market">
                <ArrowUpRight size={14} className="mr-1" />
                Take Trade
              </UiButton>
              <UiButton href="/app/live-market" variant="ghost">
                <ArrowDownRight size={14} className="mr-1" />
                Manage Trades
              </UiButton>
            </div>
          </div>
        </UiCard>
      </HoverScaleCard>

      <MonthlyPnLCalendar />

      <div className="grid gap-4 md:grid-cols-2">
        <HoverScaleCard>
          <UiCard className="p-5">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-slate-900 dark:text-white">Live positions (MT5)</div>
              <UiButton href="/app/live-market" variant="ghost" className="!px-2 !py-1 text-xs">
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
              <div className="text-sm font-semibold text-slate-900 dark:text-white">Recent Activity</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">{totalTrades} trades</div>
            </div>
            {totalTrades === 0 ? (
              <div className="mt-6 flex flex-col items-center justify-center text-center text-slate-500 dark:text-slate-400">
                <Clock3 size={28} className="opacity-40" />
                <p className="mt-3 text-sm">No recent activity</p>
              </div>
            ) : (
              <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">
                Last journal activity is tracked from your trade history. Open Trades for full detail.
              </p>
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

function Insight({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-500/25 bg-slate-900/65 p-3">
      <div className="text-xs text-slate-400">{label}</div>
      <div className="mt-1 text-slate-200">{value}</div>
    </div>
  );
}
