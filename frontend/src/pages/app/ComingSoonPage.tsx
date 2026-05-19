import React from "react";
import { Link } from "react-router-dom";
import { Construction } from "lucide-react";
import { UiButton, UiCard } from "../../components/ui";

type Props = {
  title: string;
  description?: string;
};

export default function ComingSoonPage({
  title,
  description = "This module is on the roadmap. Use Trades, Analytics, and Dashboard for your active workflow today.",
}: Props) {
  return (
    <section className="mx-auto max-w-lg py-8">
      <UiCard className="p-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500/15 to-cyan-500/15 text-blue-600 dark:text-cyan-300">
          <Construction size={28} />
        </div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Coming soon</p>
        <h1 className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">{title}</h1>
        <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">{description}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <UiButton href="/app/dashboard">Dashboard</UiButton>
          <UiButton href="/app/trades" variant="ghost">
            Trades
          </UiButton>
          <Link to="/app/settings" className="text-xs text-slate-500 underline-offset-2 hover:underline dark:text-slate-400">
            Settings
          </Link>
        </div>
      </UiCard>
    </section>
  );
}
