import React, { useEffect, useState } from "react";
import { Check, Sparkles } from "lucide-react";
import { api } from "../../lib/api";
import { ENTITLEMENT_CHANGED_EVENT, hasAiReportsEntitlement } from "../../lib/entitlements";
import { useSubscription } from "../../hooks/useSubscription";
import { UiButton, UiCard } from "../../components/ui";

export default function AiReportsPage() {
  const sub = useSubscription();
  const [isUnlocked, setIsUnlocked] = useState(() => hasAiReportsEntitlement());

  useEffect(() => {
    const sync = () => setIsUnlocked(hasAiReportsEntitlement());
    sync();
    window.addEventListener(ENTITLEMENT_CHANGED_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(ENTITLEMENT_CHANGED_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  useEffect(() => {
    setIsUnlocked(hasAiReportsEntitlement());
  }, [sub.tier, sub.hasAiReports]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<{
    totalTrades: number;
    totalPnl: number;
    winRate: number;
    profitFactor: number;
    avgPnl: number;
  } | null>(null);

  const [report, setReport] = useState<{
    headline: string;
    highlights: string[];
    nextFocus: string[];
    confidence: "low" | "medium" | "high";
  } | null>(null);

  useEffect(() => {
    if (!isUnlocked) return;
    setLoading(true);
    setError(null);
    api
      .get("/api/analytics/summary")
      .then((res) => setSummary(res.data))
      .catch((e) => {
        setError(e?.response?.data?.error || e?.message || "Failed to load analytics");
      })
      .finally(() => setLoading(false));
  }, [isUnlocked]);

  const generateReport = () => {
    if (!summary) return;
    const { totalTrades, winRate, profitFactor, avgPnl, totalPnl } = summary;

    const highlights: string[] = [];
    const nextFocus: string[] = [];

    if (totalTrades === 0) {
      setReport({
        headline: "Add your first trades to unlock actionable insights.",
        highlights: ["No trades found for this account yet."],
        nextFocus: ["Record a few trades (even demo) so patterns can emerge."],
        confidence: "low",
      });
      return;
    }

    const pnlTone = totalPnl >= 0 ? "positive" : "negative";
    highlights.push(`Your overall P&L is ${pnlTone}: ${totalPnl >= 0 ? "+" : ""}${totalPnl.toFixed(2)}.`);
    highlights.push(`Win rate: ${winRate.toFixed(1)}%.`);
    highlights.push(`Profit factor: ${profitFactor.toFixed(2)}.`);
    highlights.push(`Avg P&L per trade: ${avgPnl.toFixed(2)}.`);

    if (winRate < 45) nextFocus.push("Improve entry selection: tighten filters for when setups have lower edge.");
    else if (winRate >= 55) nextFocus.push("Protect edge consistency: keep your process and reduce discretionary changes.");

    if (profitFactor < 1) nextFocus.push("Risk/reward review: reduce downside bleed and enforce disciplined stops.");
    else nextFocus.push("Scale carefully: if you keep profit factor stable, consider gradual position sizing increases.");

    if (Math.abs(avgPnl) < 1) nextFocus.push("Focus on quality: tag strategies and evaluate win/loss by tag instead of by symbol alone.");
    else nextFocus.push("Double down on what works: identify your best tags/sessions and standardize your approach.");

    if (totalTrades < 15) nextFocus.push("Increase sample size: wait for at least 15 trades to raise confidence.");

    const headline =
      profitFactor >= 1 && winRate >= 50
        ? "Your performance shows real edge. Now optimize execution quality."
        : "Your results are teachable. Tighten the process to reduce drawdowns.";

    setReport({ headline, highlights, nextFocus: nextFocus.slice(0, 4), confidence });
  };

  if (!isUnlocked) {
    return (
      <section className="space-y-4">
        <UiCard className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-lg dark:border-white/10 dark:bg-slate-900/80">
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-start">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-500 text-white shadow-md shadow-blue-500/30">
              <Sparkles size={24} />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-xl font-bold text-slate-900 dark:text-white sm:text-2xl">AI Reports</h1>
              <p className="mt-1 text-sm font-medium text-slate-700 dark:text-slate-300">Upgrade to Pro to unlock AI performance reports</p>
              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-slate-950/50">
                <p className="text-sm font-medium text-slate-800 dark:text-slate-200">Pro or Elite (monthly or yearly) includes:</p>
                <ul className="mt-3 space-y-2 text-sm text-slate-700 dark:text-slate-300">
                  {[
                    "Personalized summaries from your trade history",
                    "Blind spots, habits, and pattern detection",
                    "Actionable focus list for your next sessions",
                    "Regenerate anytime as you add trades",
                  ].map((line) => (
                    <li key={line} className="flex gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" strokeWidth={2.5} />
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="mt-5 flex flex-wrap gap-3">
                <UiButton href="/app/membership?plan=pro&billing=monthly" className="px-5" variant="primary">
                  Pro: monthly
                </UiButton>
                <UiButton href="/app/membership?plan=pro&billing=yearly" className="px-5" variant="ghost">
                  Pro: yearly
                </UiButton>
                <UiButton href="/app/membership?plan=elite&billing=yearly" className="px-5" variant="ghost">
                  Elite
                </UiButton>
              </div>
            </div>
          </div>
        </UiCard>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div className="rounded-xl border border-white/10 bg-white/5 p-6 dark:border-white/10">
        <h1 className="text-2xl font-bold">AI Reports</h1>
        <p className="mt-2 text-white/70">
          Performance insights generated from your trade history. Click “Generate report” to refresh.
        </p>
        {sub.tier !== "free" ? (
          <p className="mt-2 text-xs font-medium uppercase tracking-wide text-emerald-400/90">
            {sub.tier.toUpperCase()} · {sub.billing ?? "active"}
          </p>
        ) : null}

        <div className="mt-5 flex flex-wrap gap-3">
          <UiButton onClick={generateReport} disabled={loading} className="px-5" variant="primary">
            {loading ? "Loading..." : "Generate report"}
          </UiButton>
          <UiButton href="/app/trades" variant="ghost" className="px-5">
            Review trades
          </UiButton>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {[
          ["Total Trades", summary ? String(summary.totalTrades) : "—"],
          ["Win Rate", summary ? `${summary.winRate.toFixed(1)}%` : "—"],
          ["Profit Factor", summary ? summary.profitFactor.toFixed(2) : "—"],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
            <div className="text-xs uppercase tracking-[0.12em] text-white/50">{label}</div>
            <div className="mt-2 text-base font-semibold">{value}</div>
          </div>
        ))}
      </div>

      {error ? (
        <UiCard className="border-rose-400/40 bg-rose-600/10 p-4 text-rose-200">
          {error}
        </UiCard>
      ) : null}

      {report ? (
        <div className="grid gap-4 md:grid-cols-[1.2fr_0.8fr]">
          <UiCard className="border-white/10 bg-white/[0.04] p-6">
            <div className="text-sm uppercase tracking-[0.12em] text-white/50">Headline</div>
            <div className="mt-2 text-xl font-bold">{report.headline}</div>
            <div className="mt-4">
              <div className="text-sm uppercase tracking-[0.12em] text-white/50">Highlights</div>
              <ul className="mt-3 space-y-2 text-sm text-white/80">
                {report.highlights.map((h) => (
                  <li key={h} className="flex gap-2">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-blue-500" />
                    <span>{h}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="mt-6">
              <div className="text-sm uppercase tracking-[0.12em] text-white/50">Next focus</div>
              <ul className="mt-3 space-y-2 text-sm text-white/80">
                {report.nextFocus.map((h) => (
                  <li key={h} className="flex gap-2">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    <span>{h}</span>
                  </li>
                ))}
              </ul>
            </div>
          </UiCard>

          <UiCard className="border-white/10 bg-white/[0.04] p-6">
            <div className="text-sm uppercase tracking-[0.12em] text-white/50">Confidence</div>
            <div className="mt-2 text-2xl font-bold capitalize text-white">
              {report.confidence}
            </div>
            <p className="mt-3 text-sm text-white/70">
              Based on your trade sample size and signal stability. More trades increase confidence.
            </p>
            <div className="mt-5 rounded-xl border border-white/10 bg-black/10 p-4 text-sm text-white/80">
              {summary && summary.totalTrades < 15
                ? "Tip: run a short journaling streak, then regenerate your report."
                : "Tip: keep your strategy tags consistent and regenerate after meaningful changes."}
            </div>
          </UiCard>
        </div>
      ) : (
        <UiCard className="border-white/10 bg-white/[0.04] p-6">
          <div className="text-sm uppercase tracking-[0.12em] text-white/50">Report</div>
          <div className="mt-3 text-white/80">
            Click <span className="font-semibold text-white">Generate report</span> to produce your AI summary.
          </div>
        </UiCard>
      )}
    </section>
  );
}
