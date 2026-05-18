import React, { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Check, Clock3, HandCoins, PlusCircle, Search, Sparkles, Trash2, X } from "lucide-react";
import { api } from "../../lib/api";
import { UiBadge, UiButton, UiCard, UiEmptyState, UiSectionHeader, UiSkeleton } from "../../components/ui";
import { useSubscription } from "../../hooks/useSubscription";

type Trade = {
  id: string;
  symbol: string;
  side: "LONG" | "SHORT";
  pnl: number;
  closeTime: string;
  entryPrice: number;
  exitPrice: number;
  lotSize: number;
};

export default function TradesPage() {
  const qc = useQueryClient();
  const sub = useSubscription();
  const [mtModalOpen, setMtModalOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [sideFilter, setSideFilter] = useState<"ALL" | "LONG" | "SHORT">("ALL");
  const [pnlFilter, setPnlFilter] = useState<"ALL" | "WINNERS" | "LOSERS">("ALL");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "best_pnl" | "worst_pnl">("newest");
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({
    symbol: "XAUUSD",
    side: "LONG" as "LONG" | "SHORT",
    entryPrice: "2300",
    exitPrice: "2310",
    lotSize: "1",
    fees: "1",
    notes: "",
  });

  const { data, isLoading } = useQuery({
    queryKey: ["trades"],
    queryFn: async () => (await api.get("/api/trades?page=1&pageSize=50")).data,
  });

  const totalOnRecord = typeof data?.total === "number" ? data.total : 0;

  const createTrade = useMutation({
    mutationFn: async () => {
      const now = new Date();
      const close = new Date(now.getTime() + 3600000);
      await api.post("/api/trades", {
        symbol: form.symbol.trim().toUpperCase(),
        side: form.side,
        entryPrice: Number(form.entryPrice),
        exitPrice: Number(form.exitPrice),
        lotSize: Number(form.lotSize),
        openTime: now.toISOString(),
        closeTime: close.toISOString(),
        fees: Number(form.fees),
        notes: form.notes || null,
      });
    },
    onSuccess: () => {
      setCreateOpen(false);
      qc.invalidateQueries({ queryKey: ["trades"] });
    },
  });

  const seedDemo = useMutation({
    mutationFn: async () => {
      await api.post("/api/trades/seed-demo");
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["trades"] });
    },
  });

  const deleteTrade = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/trades/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["trades"] }),
  });

  const items = (data?.items ?? []) as Trade[];
  const filtered = useMemo(
    () =>
      items.filter((trade) => {
        const matchSymbol = trade.symbol.toLowerCase().includes(search.trim().toLowerCase());
        const matchSide = sideFilter === "ALL" ? true : trade.side === sideFilter;
        const matchPnl =
          pnlFilter === "ALL" ? true : pnlFilter === "WINNERS" ? trade.pnl >= 0 : trade.pnl < 0;
        return matchSymbol && matchSide && matchPnl;
      }),
    [items, search, sideFilter, pnlFilter],
  );
  const sortedTrades = useMemo(() => {
    const next = [...filtered];
    if (sortBy === "oldest") next.sort((a, b) => new Date(a.closeTime).getTime() - new Date(b.closeTime).getTime());
    else if (sortBy === "best_pnl") next.sort((a, b) => b.pnl - a.pnl);
    else if (sortBy === "worst_pnl") next.sort((a, b) => a.pnl - b.pnl);
    else next.sort((a, b) => new Date(b.closeTime).getTime() - new Date(a.closeTime).getTime());
    return next;
  }, [filtered, sortBy]);

  const canSubmit =
    form.symbol.trim() &&
    Number(form.entryPrice) > 0 &&
    Number(form.exitPrice) > 0 &&
    Number(form.lotSize) > 0 &&
    Number(form.fees) >= 0;

  return (
    <section className="space-y-5">
      <UiSectionHeader
        badge="Trade Journal"
        title="Trades"
        description="Track every execution with clean records, reliable filtering, and fast review."
        action={
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:items-end">
            <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
              <span className={`h-2 w-2 shrink-0 rounded-full ${sub.hasAiReports ? "bg-emerald-500" : "bg-amber-500"}`} />
              <span>{sub.hasAiReports ? "Pro tier — broker auto-sync when connected" : "Not connected"}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <UiButton variant="ghost" onClick={() => setMtModalOpen(true)}>
                Connect MT4/MT5
              </UiButton>
              <UiButton variant="ghost" onClick={() => seedDemo.mutate()} disabled={seedDemo.isPending}>
                {seedDemo.isPending ? "Loading..." : "Load Demo"}
              </UiButton>
              <UiButton onClick={() => setCreateOpen((v) => !v)}>
                <PlusCircle size={14} className="mr-1" />
                {createOpen ? "Close Form" : "Add Trade"}
              </UiButton>
            </div>
          </div>
        }
      />

      {!sub.hasAiReports ? (
        <UiCard className="border-amber-200/80 bg-amber-50/90 p-3 text-sm text-amber-950 dark:border-amber-500/30 dark:bg-amber-950/30 dark:text-amber-50">
          <span className="font-semibold">Free plan:</span> your workspace keeps full history here; AI summaries and broker auto-sync
          require <span className="font-semibold">Pro or Elite</span> (monthly or yearly).{" "}
          {totalOnRecord > 15 ? `You have ${totalOnRecord} trades on record — upgrade for full AI + sync roadmap.` : null}
        </UiCard>
      ) : null}

      {createOpen ? (
        <UiCard className="p-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Input label="Symbol" value={form.symbol} onChange={(v) => setForm((prev) => ({ ...prev, symbol: v }))} />
            <Select
              label="Side"
              value={form.side}
              onChange={(v) => setForm((prev) => ({ ...prev, side: v as "LONG" | "SHORT" }))}
              options={["LONG", "SHORT"]}
            />
            <Input
              label="Entry"
              value={form.entryPrice}
              onChange={(v) => setForm((prev) => ({ ...prev, entryPrice: v }))}
            />
            <Input
              label="Exit"
              value={form.exitPrice}
              onChange={(v) => setForm((prev) => ({ ...prev, exitPrice: v }))}
            />
            <Input
              label="Lot Size"
              value={form.lotSize}
              onChange={(v) => setForm((prev) => ({ ...prev, lotSize: v }))}
            />
            <Input label="Fees" value={form.fees} onChange={(v) => setForm((prev) => ({ ...prev, fees: v }))} />
            <div className="sm:col-span-2 lg:col-span-2">
              <label className="mb-1 block text-xs uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">Notes</label>
              <input
                value={form.notes}
                onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-400/50 dark:border-slate-400/20 dark:bg-slate-900/60 dark:text-white"
                placeholder="Setup context, lesson, mistake..."
              />
            </div>
          </div>
          <div className="mt-4">
            <UiButton onClick={() => createTrade.mutate()} disabled={!canSubmit || createTrade.isPending}>
              {createTrade.isPending ? "Saving..." : "Save Trade"}
            </UiButton>
          </div>
        </UiCard>
      ) : null}

      <UiCard className="p-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full md:w-72">
            <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white/80 py-2 pl-8 pr-3 text-sm text-slate-900 outline-none focus:border-blue-400/50 dark:border-slate-400/20 dark:bg-slate-900/60 dark:text-white"
              placeholder="Search symbol..."
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {(["ALL", "LONG", "SHORT"] as const).map((option) => (
              <UiButton
                key={option}
                variant={sideFilter === option ? "primary" : "ghost"}
                className="px-3 py-1.5 text-xs"
                onClick={() => setSideFilter(option)}
              >
                {option}
              </UiButton>
            ))}
            {(["ALL", "WINNERS", "LOSERS"] as const).map((option) => (
              <UiButton
                key={option}
                variant={pnlFilter === option ? "primary" : "ghost"}
                className="px-3 py-1.5 text-xs"
                onClick={() => setPnlFilter(option)}
              >
                {option}
              </UiButton>
            ))}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="rounded-xl border border-slate-200 bg-white/80 px-3 py-1.5 text-xs text-slate-900 dark:border-slate-400/20 dark:bg-slate-900/60 dark:text-white"
            >
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="best_pnl">Best PnL</option>
              <option value="worst_pnl">Worst PnL</option>
            </select>
          </div>
        </div>
      </UiCard>

      {isLoading ? (
        <UiCard className="mt-4 p-4 space-y-3">
          <UiSkeleton className="h-8 w-44" />
          {Array.from({ length: 6 }).map((_, idx) => (
            <UiSkeleton key={idx} className="h-10 w-full" />
          ))}
        </UiCard>
      ) : (
        <UiCard className="mt-4 overflow-hidden">
          <div className="flex flex-col gap-2 border-b border-slate-200 px-4 py-3 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">
              Trade History ({sortedTrades.length} of {totalOnRecord || items.length} loaded)
            </div>
            <UiButton variant="ghost" className="px-3 py-1.5 text-xs">
              Filters
            </UiButton>
          </div>
          {sortedTrades.length === 0 ? (
            <div className="p-4">
              <UiEmptyState
                title={items.length === 0 ? "No trades yet" : "No matches found"}
                description={
                  items.length === 0
                    ? "Seed realistic demo data or add your first trade manually."
                    : "Try changing your search or side filter."
                }
                action={<UiButton onClick={() => setSearch("")}>Reset Search</UiButton>}
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
            <table className="w-full text-sm">
            <thead className="bg-white/5 text-slate-300">
              <tr>
                <th className="text-left p-3">Symbol</th>
                <th className="text-left p-3">Side</th>
                <th className="text-left p-3">PnL</th>
                <th className="text-left p-3">Close Time</th>
                <th className="text-right p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedTrades.map((trade) => (
                <tr key={trade.id} className="border-t border-white/10 hover:bg-slate-900/70">
                  <td className="p-3 font-medium">
                    <Link to={`/app/trades/${trade.id}`} className="hover:text-blue-300">
                      {trade.symbol}
                    </Link>
                  </td>
                  <td className="p-3">
                    <UiBadge>{trade.side}</UiBadge>
                  </td>
                  <td className={`p-3 ${trade.pnl >= 0 ? "text-green-400" : "text-red-400"}`}>
                    <span className="inline-flex items-center gap-1">
                      <HandCoins size={14} />
                      {Number(trade.pnl).toFixed(2)}
                    </span>
                  </td>
                  <td className="p-3">
                    <span className="inline-flex items-center gap-1 text-slate-700 dark:text-white/80">
                      <Clock3 size={14} />
                      {new Date(trade.closeTime).toLocaleString()}
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    <UiButton
                      variant="danger"
                      className="px-2 py-1 text-xs"
                      onClick={() => deleteTrade.mutate(trade.id)}
                      disabled={deleteTrade.isPending}
                    >
                      <Trash2 size={13} />
                    </UiButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
          )}
        </UiCard>
      )}

      {mtModalOpen ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="mt-sync-title"
        >
          <UiCard className="relative max-w-md p-6 shadow-2xl">
            <button
              type="button"
              className="absolute right-3 top-3 rounded-lg p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-white/10 dark:hover:text-white"
              onClick={() => setMtModalOpen(false)}
              aria-label="Close"
            >
              <X size={18} />
            </button>
            {!sub.hasAiReports ? (
              <>
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-white">
                  <Sparkles size={22} />
                </div>
                <h2 id="mt-sync-title" className="mt-4 text-lg font-bold text-slate-900 dark:text-white">
                  MT4/MT5 Auto-Sync
                </h2>
                <p className="mt-1 text-sm font-medium text-slate-700 dark:text-slate-300">Upgrade to Pro to connect your trading account</p>
                <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-slate-950/50">
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200">Connect your MT4 or MT5 account to:</p>
                  <ul className="mt-3 space-y-2 text-sm text-slate-700 dark:text-slate-300">
                    {[
                      "Automatically sync all your trades",
                      "Track real-time P&L and equity in the journal",
                      "View performance analytics across accounts",
                      "Journal trades with full context",
                    ].map((t) => (
                      <li key={t} className="flex gap-2">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" strokeWidth={2.5} />
                        <span>{t}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="mt-5 flex flex-wrap gap-2">
                  <UiButton href="/app/membership?plan=pro&billing=monthly" className="flex-1 min-w-[8rem]" variant="primary" onClick={() => setMtModalOpen(false)}>
                    Pro: 3 accounts
                  </UiButton>
                  <UiButton href="/app/membership?plan=elite&billing=yearly" className="flex-1 min-w-[8rem]" variant="ghost" onClick={() => setMtModalOpen(false)}>
                    Elite: Unlimited
                  </UiButton>
                </div>
              </>
            ) : (
              <>
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-600 text-white">
                  <Check size={22} strokeWidth={3} />
                </div>
                <h2 id="mt-sync-title" className="mt-4 text-lg font-bold text-slate-900 dark:text-white">
                  You&apos;re on {sub.tier.toUpperCase()}
                </h2>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                  Live broker credential linking is not wired in this build. Your Pro/Elite membership is active — when MT sync ships,
                  you&apos;ll connect from here without paying again.
                </p>
                <UiButton className="mt-5 w-full" variant="primary" onClick={() => setMtModalOpen(false)}>
                  Got it
                </UiButton>
              </>
            )}
          </UiCard>
        </div>
      ) : null}
    </section>
  );
}

function Input({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="mb-1 block text-xs uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-400/50 dark:border-slate-400/20 dark:bg-slate-900/60 dark:text-white"
      />
    </div>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <div>
      <label className="mb-1 block text-xs uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-400/50 dark:border-slate-400/20 dark:bg-slate-900/60 dark:text-white"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}

