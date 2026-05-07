import React, { useState } from "react";
import { BellPlus } from "lucide-react";
import { UiButton, UiCard, UiSectionHeader } from "../../components/ui";

type Alert = { id: string; symbol: string; condition: string; active: boolean };

const defaultAlerts: Alert[] = [
  { id: "AL-1", symbol: "NIFTY", condition: "Above 22500", active: true },
  { id: "AL-2", symbol: "BTCUSDT", condition: "Below 61000", active: true },
  { id: "AL-3", symbol: "RELIANCE", condition: "1h RSI > 70", active: false },
];

export default function AlertsPage() {
  const [alerts, setAlerts] = useState(defaultAlerts);

  return (
    <section className="space-y-5">
      <UiSectionHeader
        badge="Notifications"
        title="Alerts Center"
        description="Manage your market alerts and keep track of active trigger conditions."
      />
      <UiCard className="p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm text-slate-600 dark:text-slate-300">Active alerts: {alerts.filter((a) => a.active).length}</div>
          <UiButton>
            <BellPlus size={14} className="mr-1" />
            New Alert
          </UiButton>
        </div>
      </UiCard>

      <div className="grid gap-4">
        {alerts.map((a) => (
          <UiCard key={a.id} className="p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-xs uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">{a.id}</div>
                <div className="mt-1 text-base font-semibold">{a.symbol}</div>
                <div className="text-sm text-slate-600 dark:text-slate-300">{a.condition}</div>
              </div>
              <button
                onClick={() =>
                  setAlerts((prev) =>
                    prev.map((p) => (p.id === a.id ? { ...p, active: !p.active } : p)),
                  )
                }
                className={`rounded-xl px-4 py-2 text-sm font-semibold ${
                  a.active
                    ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                    : "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                }`}
              >
                {a.active ? "Active" : "Paused"}
              </button>
            </div>
          </UiCard>
        ))}
      </div>
    </section>
  );
}
