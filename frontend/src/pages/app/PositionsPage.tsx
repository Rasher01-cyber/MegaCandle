import React from "react";
import { UiCard, UiSectionHeader } from "../../components/ui";

const rows = [
  { symbol: "NIFTY 22500 CE", qty: 150, avg: 121.4, ltp: 136.8 },
  { symbol: "BANKNIFTY FUT", qty: 15, avg: 48620.0, ltp: 48510.4 },
  { symbol: "RELIANCE", qty: 120, avg: 2864.3, ltp: 2894.6 },
];

export default function PositionsPage() {
  const totalPnl = rows.reduce((acc, r) => acc + (r.ltp - r.avg) * r.qty, 0);
  return (
    <section className="space-y-5">
      <UiSectionHeader
        badge="Execution Book"
        title="Positions"
        description="Monitor live position risk, mark-to-market movement, and exposure."
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <UiCard className="p-4">
          <div className="text-xs text-slate-500 dark:text-slate-400">Open Positions</div>
          <div className="mt-1 text-2xl font-bold">{rows.length}</div>
        </UiCard>
        <UiCard className="p-4">
          <div className="text-xs text-slate-500 dark:text-slate-400">Net PnL</div>
          <div className={`mt-1 text-2xl font-bold ${totalPnl >= 0 ? "text-emerald-600 dark:text-emerald-300" : "text-rose-600 dark:text-rose-300"}`}>
            {totalPnl.toFixed(2)}
          </div>
        </UiCard>
        <UiCard className="p-4">
          <div className="text-xs text-slate-500 dark:text-slate-400">Risk Status</div>
          <div className="mt-1 text-2xl font-bold">Normal</div>
        </UiCard>
      </div>

      <UiCard className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-slate-300">
              <tr>
                <th className="p-3 text-left">Instrument</th>
                <th className="p-3 text-left">Qty</th>
                <th className="p-3 text-left">Avg</th>
                <th className="p-3 text-left">LTP</th>
                <th className="p-3 text-left">PnL</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const pnl = (r.ltp - r.avg) * r.qty;
                return (
                  <tr key={r.symbol} className="border-t border-slate-200 dark:border-white/10">
                    <td className="p-3 font-semibold">{r.symbol}</td>
                    <td className="p-3">{r.qty}</td>
                    <td className="p-3">{r.avg.toFixed(2)}</td>
                    <td className="p-3">{r.ltp.toFixed(2)}</td>
                    <td className={`p-3 font-medium ${pnl >= 0 ? "text-emerald-600 dark:text-emerald-300" : "text-rose-600 dark:text-rose-300"}`}>{pnl.toFixed(2)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </UiCard>
    </section>
  );
}
