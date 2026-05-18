import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { api } from "../lib/api";
import HoverScaleCard from "./HoverScaleCard";
import { UiCard, UiSkeleton } from "./ui";

function ymFromDate(d: Date) {
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  return `${y}-${String(m).padStart(2, "0")}`;
}

function monthLabel(ym: string) {
  const [y, mo] = ym.split("-").map(Number);
  return new Date(y, mo - 1, 1).toLocaleString(undefined, { month: "long", year: "numeric" });
}

function buildWeeks(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  const first = new Date(y, m - 1, 1);
  const lastDay = new Date(y, m, 0).getDate();
  const lead = (first.getDay() + 6) % 7;
  const weeks: (number | null)[][] = [];
  let row: (number | null)[] = Array(lead).fill(null);
  for (let d = 1; d <= lastDay; d++) {
    row.push(d);
    if (row.length === 7) {
      weeks.push(row);
      row = [];
    }
  }
  if (row.length) {
    while (row.length < 7) row.push(null);
    weeks.push(row);
  }
  return { weeks, lastDay };
}

function dayKey(ym: string, day: number) {
  const [y, m] = ym.split("-");
  return `${y}-${m}-${String(day).padStart(2, "0")}`;
}

export default function MonthlyPnLCalendar() {
  const [ym, setYm] = useState(() => ymFromDate(new Date()));
  const { weeks, lastDay } = useMemo(() => buildWeeks(ym), [ym]);

  const { data, isLoading } = useQuery({
    queryKey: ["analytics-calendar", ym],
    queryFn: async () => (await api.get<{ days: { date: string; pnl: number }[] }>(`/api/analytics/calendar?month=${ym}`)).data,
  });

  const pnlByDay = useMemo(() => {
    const map = new Map<string, number>();
    for (const d of data?.days ?? []) {
      map.set(d.date, d.pnl);
    }
    return map;
  }, [data?.days]);

  const monthlyTotal = useMemo(() => {
    let s = 0;
    for (let d = 1; d <= lastDay; d++) {
      s += pnlByDay.get(dayKey(ym, d)) ?? 0;
    }
    return s;
  }, [pnlByDay, ym, lastDay]);

  const isTodayDom = (day: number) => {
    const t = new Date();
    const [y, m] = ym.split("-").map(Number);
    return t.getFullYear() === y && t.getMonth() + 1 === m && t.getDate() === day;
  };

  const shiftMonth = (delta: number) => {
    const [y, m] = ym.split("-").map(Number);
    const next = new Date(y, m - 1 + delta, 1);
    setYm(ymFromDate(next));
  };

  return (
    <HoverScaleCard>
    <UiCard className="overflow-hidden p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Monthly P&amp;L</h2>
        <div className="flex flex-wrap items-center gap-3">
          <span
            className={`text-sm font-semibold ${monthlyTotal >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}
          >
            {`Monthly: ${monthlyTotal >= 0 ? "+" : ""}$${monthlyTotal.toFixed(2)}`}
          </span>
          <div className="inline-flex items-center rounded-xl border border-slate-200 bg-white/80 dark:border-slate-600 dark:bg-slate-900/60">
            <button
              type="button"
              aria-label="Previous month"
              className="p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10"
              onClick={() => shiftMonth(-1)}
            >
              <ChevronLeft size={18} />
            </button>
            <span className="min-w-[8.5rem] text-center text-sm font-medium text-slate-800 dark:text-slate-100">{monthLabel(ym)}</span>
            <button
              type="button"
              aria-label="Next month"
              className="p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10"
              onClick={() => shiftMonth(1)}
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="mt-4 space-y-2">
          <UiSkeleton className="h-8 w-full" />
          <UiSkeleton className="h-48 w-full" />
        </div>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <div className="min-w-[640px]">
            <div className="grid grid-cols-[repeat(7,minmax(0,1fr))_minmax(5.5rem,1fr)] gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              {["M", "T", "W", "T", "F", "S", "S"].map((d) => (
                <div key={d} className="px-1 text-center">
                  {d}
                </div>
              ))}
              <div className="px-1 text-center">Weekly</div>
            </div>
            {weeks.map((row, wi) => {
              let weekPnl = 0;
              let tradedDays = 0;
              for (const d of row) {
                if (d == null) continue;
                const key = dayKey(ym, d);
                if (pnlByDay.has(key)) tradedDays += 1;
                weekPnl += pnlByDay.get(key) ?? 0;
              }
              return (
                <div
                  key={wi}
                  className="mt-1.5 grid grid-cols-[repeat(7,minmax(0,1fr))_minmax(5.5rem,1fr)] gap-1.5"
                >
                  {row.map((d, di) => {
                    if (d == null) {
                      return <div key={`e-${wi}-${di}`} className="min-h-[4.5rem] rounded-lg bg-slate-100/50 dark:bg-slate-800/30" />;
                    }
                    const pnl = pnlByDay.get(dayKey(ym, d)) ?? 0;
                    const has = pnl !== 0;
                    const todayCell = isTodayDom(d);
                    return (
                      <motion.div
                        key={d}
                        whileHover={{ scale: 1.06 }}
                        transition={{ type: "spring", stiffness: 400, damping: 20 }}
                        className="relative flex min-h-[4.5rem] flex-col rounded-lg border border-slate-200/80 bg-slate-50/90 p-1.5 dark:border-slate-600/40 dark:bg-slate-900/50"
                      >
                        <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">{d}</span>
                        {has ? (
                          <span
                            className={`mt-auto text-xs font-semibold ${pnl >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}
                          >
                            {`${pnl >= 0 ? "+" : ""}$${pnl.toFixed(0)}`}
                          </span>
                        ) : (
                          <span className="mt-auto flex items-center">
                            {todayCell ? <span className="h-1.5 w-1.5 rounded-full bg-blue-500" title="Today" /> : null}
                          </span>
                        )}
                      </motion.div>
                    );
                  })}
                  <div className="flex min-h-[4.5rem] flex-col justify-center rounded-lg border border-slate-200/80 bg-slate-100/70 px-2 dark:border-slate-600/40 dark:bg-slate-800/40">
                    <div className="text-[9px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Weekly</div>
                    <div
                      className={`text-xs font-semibold ${weekPnl >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}
                    >
                      {`${weekPnl >= 0 ? "+" : ""}$${weekPnl.toFixed(0)}`}
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-500">Traded days {tradedDays}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </UiCard>
    </HoverScaleCard>
  );
}
