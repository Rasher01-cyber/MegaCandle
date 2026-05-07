import React from "react";
import { BookOpen, CheckCircle2, ShieldAlert, Target } from "lucide-react";
import { UiCard, UiSectionHeader } from "../../components/ui";

const modules = [
  {
    title: "Market Basics",
    lessons: ["Candlestick structure", "Support/resistance", "Trend and market structure"],
    icon: BookOpen,
  },
  {
    title: "Risk Management",
    lessons: ["Position sizing", "Stop loss logic", "Daily drawdown limits"],
    icon: ShieldAlert,
  },
  {
    title: "Execution Process",
    lessons: ["Entry checklist", "Session timing", "Post-trade journaling"],
    icon: Target,
  },
];

export default function LearnPage() {
  return (
    <section className="space-y-5">
      <UiSectionHeader
        badge="Academy"
        title="Learn Trading"
        description="Structured learning path to help you build skill, discipline, and consistency."
      />
      <div className="grid gap-4 md:grid-cols-3">
        {modules.map((mod) => (
          <UiCard key={mod.title} className="p-5">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-blue-300/40 bg-blue-500/10 text-blue-700 dark:text-blue-200">
              <mod.icon size={18} />
            </div>
            <div className="mt-3 text-lg font-semibold">{mod.title}</div>
            <ul className="mt-3 space-y-2 text-sm text-slate-700 dark:text-slate-300">
              {mod.lessons.map((lesson) => (
                <li key={lesson} className="inline-flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-emerald-600 dark:text-emerald-300" />
                  {lesson}
                </li>
              ))}
            </ul>
          </UiCard>
        ))}
      </div>
    </section>
  );
}
