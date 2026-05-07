import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api } from "../../lib/api";
import { UiButton, UiCard, UiEmptyState, UiSectionHeader, UiSkeleton, UiStatCard } from "../../components/ui";
import { Activity, TrendingDown, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";

function toNumber(value: unknown, fallback = 0) {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export default function DashboardPage() {
  const [range, setRange] = useState<"all" | "30d" | "7d">("all");
  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ["summary"],
    queryFn: async () => (await api.get("/api/analytics/summary")).data,
  });
  const { data: curve, isLoading: curveLoading } = useQuery({
    queryKey: ["equity"],
    queryFn: async () => (await api.get("/api/analytics/equity-curve")).data.points as any[],
  });
  const totalTrades = toNumber(summary?.totalTrades);
  const totalPnl = toNumber(summary?.totalPnl);
  const winRate = toNumber(summary?.winRate);
  const profitFactor = toNumber(summary?.profitFactor);
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
        action={<UiButton href="/app/trades">Open Journal</UiButton>}
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {summaryLoading ? (
          Array.from({ length: 4 }).map((_, idx) => (
            <UiCard key={idx} className="p-4">
              <UiSkeleton className="h-3 w-20" />
              <UiSkeleton className="mt-3 h-8 w-24" />
            </UiCard>
          ))
        ) : (
          <>
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              <Card title="Total PnL" value={totalPnl.toFixed(2)} trend={totalPnl >= 0 ? "up" : "down"} />
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.04 }}>
              <UiStatCard label="Win Rate" value={`${winRate.toFixed(1)}%`} hint="Target: 55%+" icon={<Activity size={16} />} />
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
              <Card title="Profit Factor" value={profitFactor.toFixed(2)} trend={profitFactor >= 1 ? "up" : "down"} />
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}>
              <UiStatCard label="Trades" value={`${totalTrades}`} hint="All recorded executions" />
            </motion.div>
          </>
        )}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <UiCard className="p-4 h-[340px]">
          <div className="mb-3 flex items-center justify-between">
            <div className="font-semibold">Equity Curve</div>
            <div className="flex items-center gap-2">
              {(["7d", "30d", "all"] as const).map((opt) => (
                <button
                  key={opt}
                  onClick={() => setRange(opt)}
                  className={`rounded-lg px-2 py-1 text-[11px] uppercase ${
                    range === opt
                      ? "bg-blue-500 text-white"
                      : "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                  }`}
                >
                  {opt}
                </button>
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
                <Tooltip
                  contentStyle={{ background: "#020617", border: "1px solid #334155", borderRadius: 8 }}
                />
                <Area type="monotone" dataKey="equity" stroke="#3b82f6" fill="#3b82f655" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </UiCard>

        <UiCard className="p-4">
          <div className="font-semibold">Execution Checklist</div>
          <div className="mt-4 space-y-3 text-sm">
            <Insight label="Pre-trade" value="Validate setup and invalidation level." />
            <Insight label="Risk note" value="Keep risk below 1-2% per trade." />
            <Insight label="Post-trade" value="Journal reason, outcome, and lesson." />
          </div>
        </UiCard>
      </div>
    </section>
  );
}

function Card({ title, value, trend }: { title: string; value: string; trend: "up" | "down" }) {
  return (
    <UiCard className="bg-gradient-to-b from-slate-900/80 to-slate-900/50 p-4">
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-wide text-slate-400">{title}</div>
        <span className={trend === "up" ? "text-emerald-300" : "text-rose-300"}>
          {trend === "up" ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
        </span>
      </div>
      <div className="mt-2 text-2xl font-bold">{value}</div>
    </UiCard>
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

