import React, { useMemo, useState } from "react";
import { UiButton, UiCard, UiSectionHeader } from "../../components/ui";

type Order = {
  id: string;
  symbol: string;
  side: "BUY" | "SELL";
  type: "MARKET" | "LIMIT";
  qty: number;
  price: number;
  status: "OPEN" | "FILLED" | "CANCELLED";
};

const seedOrders: Order[] = [
  { id: "ORD-1042", symbol: "NIFTY", side: "BUY", type: "LIMIT", qty: 50, price: 22420, status: "OPEN" },
  { id: "ORD-1031", symbol: "RELIANCE", side: "SELL", type: "MARKET", qty: 20, price: 2891, status: "FILLED" },
  { id: "ORD-1028", symbol: "TCS", side: "BUY", type: "LIMIT", qty: 10, price: 3970, status: "CANCELLED" },
];

export default function OrdersPage() {
  const [status, setStatus] = useState<"ALL" | Order["status"]>("ALL");
  const filtered = useMemo(
    () => (status === "ALL" ? seedOrders : seedOrders.filter((o) => o.status === status)),
    [status],
  );

  return (
    <section className="space-y-5">
      <UiSectionHeader
        badge="Execution Book"
        title="Orders"
        description="View and manage order lifecycle with fast filtering and action controls."
      />
      <UiCard className="p-3">
        <div className="flex flex-wrap gap-2">
          {(["ALL", "OPEN", "FILLED", "CANCELLED"] as const).map((s) => (
            <UiButton key={s} variant={status === s ? "primary" : "ghost"} className="px-3 py-1.5 text-xs" onClick={() => setStatus(s)}>
              {s}
            </UiButton>
          ))}
        </div>
      </UiCard>

      <UiCard className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-slate-300">
              <tr>
                <th className="p-3 text-left">Order ID</th>
                <th className="p-3 text-left">Symbol</th>
                <th className="p-3 text-left">Side</th>
                <th className="p-3 text-left">Type</th>
                <th className="p-3 text-left">Qty</th>
                <th className="p-3 text-left">Price</th>
                <th className="p-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((o) => (
                <tr key={o.id} className="border-t border-slate-200 dark:border-white/10">
                  <td className="p-3 font-medium">{o.id}</td>
                  <td className="p-3">{o.symbol}</td>
                  <td className={`p-3 ${o.side === "BUY" ? "text-emerald-600 dark:text-emerald-300" : "text-rose-600 dark:text-rose-300"}`}>{o.side}</td>
                  <td className="p-3">{o.type}</td>
                  <td className="p-3">{o.qty}</td>
                  <td className="p-3">{o.price.toFixed(2)}</td>
                  <td className="p-3">{o.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </UiCard>
    </section>
  );
}
