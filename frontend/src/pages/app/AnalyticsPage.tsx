import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { ANALYTICS_TAB_GUIDE, type AnalyticsTab } from "../../lib/analyticsGuide";
import { UiButton, UiCard, UiEmptyState, UiSectionHeader, UiSkeleton } from "../../components/ui";
import { BarChart3, Layers, Search } from "lucide-react";
import { motion } from "framer-motion";

export default function AnalyticsPage() {
  const [by, setBy] = useState<AnalyticsTab>("symbol");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"pnl_desc" | "pnl_asc" | "count_desc">("pnl_desc");
  const guide = ANALYTICS_TAB_GUIDE[by];

  const { data, isLoading } = useQuery({
    queryKey: ["breakdown", by],
    queryFn: async () => (await api.get(`/api/analytics/breakdown?by=${by}`)).data.breakdown,
  });

  const analyticsRows = useMemo(() => {
    const rows = [...(data ?? [])];
    const filtered = rows.filter((row: { key: string }) =>
      row.key.toLowerCase().includes(search.trim().toLowerCase()),
    );
    if (sortBy === "pnl_asc") filtered.sort((a: { pnl: number }, b: { pnl: number }) => a.pnl - b.pnl);
    else if (sortBy === "count_desc")
      filtered.sort((a: { count: number }, b: { count: number }) => b.count - a.count);
    else filtered.sort((a: { pnl: number }, b: { pnl: number }) => b.pnl - a.pnl);
    return filtered;
  }, [data, search, sortBy]);

  return (
    <section className="space-y-5">
      <UiSectionHeader
        badge="Analytics Lab"
        title="Analytics"
        description="Break down your edge by symbol, side, session, and tag to isolate what truly performs."
      />

      <UiCard className="p-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap gap-2">
            {(["symbol", "side", "session", "tag"] as const).map((option) => (
              <UiButton
                key={option}
                variant={by === option ? "primary" : "ghost"}
                className="px-3 py-1.5 text-xs capitalize"
                onClick={() => setBy(option)}
              >
                {option}
              </UiButton>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search size={14} className="absolute left-2 top-2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="rounded-lg border border-slate-200 bg-white/80 py-1.5 pl-7 pr-2 text-xs text-slate-900 dark:border-slate-400/20 dark:bg-slate-900/60 dark:text-white"
                placeholder="Filter key..."
              />
            </div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="rounded-lg border border-slate-200 bg-white/80 px-2 py-1.5 text-xs text-slate-900 dark:border-slate-400/20 dark:bg-slate-900/60 dark:text-white"
            >
              <option value="pnl_desc">PnL high-low</option>
              <option value="pnl_asc">PnL low-high</option>
              <option value="count_desc">Most trades</option>
            </select>
          </div>
        </div>
      </UiCard>

      <UiCard className="border-blue-500/20 bg-blue-500/5 p-5">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{guide.title}</h3>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{guide.summary}</p>
        <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-slate-600 dark:text-slate-400">
          {guide.bullets.map((b) => (
            <li key={b}>{b}</li>
          ))}
        </ul>
        {guide.specs?.length ? (
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {guide.specs.map((s) => (
              <div
                key={s.label}
                className="rounded-lg border border-slate-200/80 bg-white/60 px-3 py-2 dark:border-white/10 dark:bg-white/5"
              >
                <p className="text-xs font-bold text-blue-600 dark:text-blue-300">{s.label}</p>
                <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">{s.value}</p>
              </div>
            ))}
          </div>
        ) : null}
      </UiCard>

      <div className="grid gap-4 md:grid-cols-2">
        {isLoading
          ? Array.from({ length: 4 }).map((_, idx) => (
              <UiCard key={idx} className="p-4">
                <UiSkeleton className="h-3 w-20" />
                <UiSkeleton className="mt-3 h-7 w-28" />
                <UiSkeleton className="mt-2 h-3 w-16" />
              </UiCard>
            ))
          : analyticsRows.length === 0 ? (
              <div className="md:col-span-2">
                <UiEmptyState
                  title={(data ?? []).length === 0 ? "No analytics yet" : "No matches found"}
                  description={
                    (data ?? []).length === 0
                      ? "Add journal trades or load demo data on the Trades page."
                      : "Try another filter."
                  }
                  action={<UiButton href="/app/trades?tab=journal">Go to Trades</UiButton>}
                />
              </div>
            ) : (
              analyticsRows.map((item: { key: string; pnl: number; count: number }, idx: number) => (
                <motion.div
                  key={item.key}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.04 }}
                >
                  <UiCard className="bg-gradient-to-b from-white/90 to-white/70 p-4 dark:from-slate-900/80 dark:to-slate-900/50">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">{item.key}</div>
                      {by === "tag" ? (
                        <Layers size={16} className="text-slate-400" />
                      ) : (
                        <BarChart3 size={16} className="text-slate-400" />
                      )}
                    </div>
                    <div
                      className={`mt-2 text-xl font-bold ${item.pnl >= 0 ? "text-emerald-600 dark:text-emerald-300" : "text-rose-600 dark:text-rose-300"}`}
                    >
                      {Number(item.pnl).toFixed(2)}
                    </div>
                    <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{item.count} trades</div>
                  </UiCard>
                </motion.div>
              ))
            )}
      </div>
    </section>
  );
}
