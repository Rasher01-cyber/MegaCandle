import React, { useMemo, useState } from "react";
import { CalendarDays, Clock3, Rocket, Trophy } from "lucide-react";
import { Link } from "react-router-dom";
import { UiButton } from "../../components/ui";

type Range = "today" | "week" | "month" | "year";

const ranges: { id: Range; label: string; icon: React.ReactNode }[] = [
  { id: "today", label: "Today", icon: <Clock3 size={14} className="opacity-80" /> },
  { id: "week", label: "This Week", icon: <Clock3 size={14} className="opacity-80" /> },
  { id: "month", label: "This Month", icon: <CalendarDays size={14} className="opacity-80" /> },
  { id: "year", label: "This Year", icon: <CalendarDays size={14} className="opacity-80" /> },
];

function shell(className = "") {
  return `rounded-2xl border border-slate-200/90 bg-white shadow-sm dark:border-white/[0.08] dark:bg-[#12151c] dark:shadow-none ${className}`;
}

export default function LeaderboardPage() {
  const [range, setRange] = useState<Range>("week");

  const rangeSubtitle = useMemo(() => {
    switch (range) {
      case "today":
        return "Top performing traders today";
      case "week":
        return "Top performing traders this week";
      case "month":
        return "Top performing traders this month";
      case "year":
        return "Top performing traders this year";
      default:
        return "Top performing traders this week";
    }
  }, [range]);

  return (
    <section className="mx-auto max-w-5xl space-y-6 pb-10">
      <div className={`${shell("flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5")}`}>
        <div className="flex min-w-0 gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-600/15 text-blue-600 dark:bg-blue-500/20 dark:text-blue-300">
            <Rocket size={22} className="shrink-0" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white sm:text-base">Complete Your Trading Profile</h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Your trading rules are needed for AI-powered insights and personalized reports.
            </p>
          </div>
        </div>
        <UiButton href="/app/settings" variant="primary" className="shrink-0 self-start sm:self-center">
          Complete Setup
        </UiButton>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">Leaderboard</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{rangeSubtitle}</p>
        </div>
        <div className="flex flex-wrap gap-1 rounded-xl border border-slate-200 bg-slate-100/90 p-1 dark:border-white/[0.1] dark:bg-[#0a0d12]">
          {ranges.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setRange(r.id)}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition sm:text-sm ${
                range === r.id
                  ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/80 dark:bg-white dark:text-slate-900 dark:ring-white/20"
                  : "text-slate-600 hover:bg-white/70 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/[0.06] dark:hover:text-white"
              }`}
            >
              {r.icon}
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className={`${shell("flex min-h-[280px] flex-col items-center justify-center gap-4 px-6 py-16 text-center")}`}>
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600/10 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300">
          <Trophy size={36} strokeWidth={1.5} />
        </div>
        <div>
          <p className="text-base font-semibold text-slate-900 dark:text-white">No traders yet</p>
          <p className="mt-2 max-w-md text-sm text-slate-500 dark:text-slate-400">
            Start trading to appear on the leaderboard! Rankings use your journal once live data is connected.
          </p>
        </div>
        <UiButton href="/app/trades" variant="primary">
          Open Trades
        </UiButton>
        <p className="text-xs text-slate-400 dark:text-slate-500">
          Prefer to stay private? Turn off leaderboard in{" "}
          <Link to="/app/settings" className="font-medium text-blue-600 underline-offset-2 hover:underline dark:text-blue-400">
            Settings → Profile
          </Link>
          .
        </p>
      </div>
    </section>
  );
}
