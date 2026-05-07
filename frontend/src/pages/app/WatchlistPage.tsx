import React, { useMemo, useState } from "react";
import { Plus, Star, Trash2 } from "lucide-react";
import { UiButton, UiCard, UiSectionHeader } from "../../components/ui";

type WatchItem = { symbol: string; price: number; changePct: number; pinned: boolean };

const seed: WatchItem[] = [
  { symbol: "NIFTY", price: 22455.3, changePct: 0.94, pinned: true },
  { symbol: "BANKNIFTY", price: 48590.2, changePct: -0.31, pinned: true },
  { symbol: "RELIANCE", price: 2894.6, changePct: 1.21, pinned: false },
  { symbol: "TCS", price: 3988.1, changePct: -0.77, pinned: false },
];

export default function WatchlistPage() {
  const [items, setItems] = useState<WatchItem[]>(seed);
  const [newSymbol, setNewSymbol] = useState("");

  const sorted = useMemo(
    () => [...items].sort((a, b) => Number(b.pinned) - Number(a.pinned)),
    [items],
  );

  const addSymbol = () => {
    const symbol = newSymbol.trim().toUpperCase();
    if (!symbol || items.some((i) => i.symbol === symbol)) return;
    setItems((prev) => [...prev, { symbol, price: 0, changePct: 0, pinned: false }]);
    setNewSymbol("");
  };

  return (
    <section className="space-y-5">
      <UiSectionHeader
        badge="Market Desk"
        title="Watchlist"
        description="Track your frequently used symbols with quick actions and priority pinning."
      />
      <UiCard className="p-4">
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            value={newSymbol}
            onChange={(e) => setNewSymbol(e.target.value)}
            placeholder="Add symbol (e.g. INFY)"
            className="w-full rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-400/50 dark:border-slate-400/20 dark:bg-slate-900/60 dark:text-white"
          />
          <UiButton onClick={addSymbol}>
            <Plus size={14} className="mr-1" />
            Add
          </UiButton>
        </div>
      </UiCard>

      <UiCard className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-slate-300">
              <tr>
                <th className="p-3 text-left">Symbol</th>
                <th className="p-3 text-left">LTP</th>
                <th className="p-3 text-left">Change</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((row) => (
                <tr key={row.symbol} className="border-t border-slate-200 dark:border-white/10">
                  <td className="p-3 font-semibold">{row.symbol}</td>
                  <td className="p-3">{row.price ? row.price.toFixed(2) : "-"}</td>
                  <td className={`p-3 ${row.changePct >= 0 ? "text-emerald-600 dark:text-emerald-300" : "text-rose-600 dark:text-rose-300"}`}>
                    {row.changePct >= 0 ? "+" : ""}
                    {row.changePct.toFixed(2)}%
                  </td>
                  <td className="p-3 text-right">
                    <div className="inline-flex items-center gap-2">
                      <button
                        onClick={() =>
                          setItems((prev) =>
                            prev.map((p) =>
                              p.symbol === row.symbol ? { ...p, pinned: !p.pinned } : p,
                            ),
                          )
                        }
                        className="rounded-lg border border-slate-300 bg-white p-1.5 text-slate-700 dark:border-white/15 dark:bg-white/5 dark:text-slate-200"
                      >
                        <Star size={13} className={row.pinned ? "fill-yellow-400 text-yellow-500" : ""} />
                      </button>
                      <button
                        onClick={() => setItems((prev) => prev.filter((p) => p.symbol !== row.symbol))}
                        className="rounded-lg border border-rose-300 bg-rose-50 p-1.5 text-rose-700 dark:border-rose-400/30 dark:bg-rose-500/10 dark:text-rose-300"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </UiCard>
    </section>
  );
}
