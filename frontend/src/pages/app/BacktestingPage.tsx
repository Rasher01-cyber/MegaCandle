import React, { useMemo, useState, useEffect } from "react";
import { Check, Shield } from "lucide-react";
import { ENTITLEMENT_CHANGED_EVENT, hasBacktestingEntitlement } from "../../lib/entitlements";
import { useSubscription } from "../../hooks/useSubscription";
import { UiButton, UiCard } from "../../components/ui";

export default function BacktestingPage() {
  const sub = useSubscription();
  const [isUnlocked, setIsUnlocked] = useState(() => hasBacktestingEntitlement());

  useEffect(() => {
    const sync = () => setIsUnlocked(hasBacktestingEntitlement());
    sync();
    window.addEventListener(ENTITLEMENT_CHANGED_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(ENTITLEMENT_CHANGED_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  useEffect(() => {
    setIsUnlocked(hasBacktestingEntitlement());
  }, [sub.tier, sub.hasBacktesting]);

  const [symbol, setSymbol] = useState("XAUUSD");
  const [strategy, setStrategy] = useState<"Breakout" | "Pullback" | "Mean Reversion">("Breakout");
  const [bars, setBars] = useState(220);
  const [stopLossPct, setStopLossPct] = useState(1.2);
  const [takeProfitPct, setTakeProfitPct] = useState(2.4);
  const [lotSize, setLotSize] = useState(1);
  const [feesPerTrade, setFeesPerTrade] = useState(0.2);

  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<null | {
    totalTrades: number;
    winRate: number;
    totalPnl: number;
    avgPnl: number;
    profitFactor: number;
    equityPoints: Array<{ i: number; equity: number }>;
  }>(null);

  const [lastRunMeta, setLastRunMeta] = useState<string | null>(null);

  type Candle = { o: number; h: number; l: number; c: number };

  // Deterministic pseudo-random walk for synthetic OHLC.
  function generateCandles(seed: number, count: number): Candle[] {
    let p = 40 + (seed % 27);
    const out: Candle[] = [];
    for (let i = 0; i < count; i++) {
      const r = Math.sin(seed * 0.31 + i * 1.7) * 8 + Math.cos(i * 0.9) * 4;
      const o = p;
      const c = Math.max(6, Math.min(96, p + r));
      const hi = Math.max(o, c) + 2 + (i % 3);
      const lo = Math.min(o, c) - 2 - ((i + 1) % 4);
      out.push({ o, h: hi, l: lo, c });
      p = c;
    }
    return out;
  }

  function sma(values: number[], window: number) {
    const start = Math.max(0, values.length - window);
    const slice = values.slice(start);
    const sum = slice.reduce((a, b) => a + b, 0);
    return slice.length ? sum / slice.length : 0;
  }

  type Side = "LONG" | "SHORT";
  type Trade = {
    side: Side;
    entry: number;
    exit: number;
    pnl: number;
    reason: "TP" | "SL" | "TIME";
  };

  function runBacktest(): { trades: Trade[]; equityPoints: Array<{ i: number; equity: number }> } {
    const seedBase =
      symbol.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0) + (strategy.length * 97 + bars * 13);
    const candles = generateCandles(seedBase, Math.max(80, Math.min(600, bars)));
    const closes = candles.map((c) => c.c);

    const smaWindow = 12;
    const threshold = strategy === "Mean Reversion" ? 0.012 : strategy === "Pullback" ? 0.006 : 0.003;
    const maxHoldBars = 18;

    let position: null | { side: Side; entry: number; stop: number; take: number; entryIndex: number } = null;
    const trades: Trade[] = [];
    let equity = 0;
    const equityPoints: Array<{ i: number; equity: number }> = [{ i: 0, equity: 0 }];

    for (let i = smaWindow; i < candles.length; i++) {
      const candle = candles[i];
      const open = candle.o;
      const high = candle.h;
      const low = candle.l;

      const currentSma = sma(closes.slice(0, i), smaWindow);

      const canEnter = position === null;
      if (canEnter) {
        let signal: Side | null = null;

        if (strategy === "Breakout") {
          if (candle.c > currentSma * (1 + threshold)) signal = "LONG";
          else if (candle.c < currentSma * (1 - threshold)) signal = "SHORT";
        } else if (strategy === "Pullback") {
          const prevClose = closes[i - 1];
          if (prevClose < currentSma * (1 - threshold) && candle.c > currentSma) signal = "LONG";
          else if (prevClose > currentSma * (1 + threshold) && candle.c < currentSma) signal = "SHORT";
        } else {
          // Mean Reversion
          if (candle.c < currentSma * (1 - threshold * 1.2)) signal = "LONG";
          else if (candle.c > currentSma * (1 + threshold * 1.2)) signal = "SHORT";
        }

        if (signal) {
          const entry = candle.c;
          const sl = stopLossPct / 100;
          const tp = takeProfitPct / 100;
          const stop = signal === "LONG" ? entry * (1 - sl) : entry * (1 + sl);
          const take = signal === "LONG" ? entry * (1 + tp) : entry * (1 - tp);
          position = { side: signal, entry, stop, take, entryIndex: i };
        }
      }

      if (position) {
        const holdingBars = i - position.entryIndex;

        const hitSL = position.side === "LONG" ? low <= position.stop : high >= position.stop;
        const hitTP = position.side === "LONG" ? high >= position.take : low <= position.take;

        let exit: number | null = null;
        let reason: Trade["reason"] = "TIME";

        if (hitSL || hitTP) {
          // If both levels hit in the same candle, assume the closer level was hit first.
          if (hitSL && hitTP) {
            const distToSL = Math.abs(open - position.stop);
            const distToTP = Math.abs(open - position.take);
            if (distToTP <= distToSL) {
              exit = position.take;
              reason = "TP";
            } else {
              exit = position.stop;
              reason = "SL";
            }
          } else if (hitTP) {
            exit = position.take;
            reason = "TP";
          } else if (hitSL) {
            exit = position.stop;
            reason = "SL";
          }
        } else if (holdingBars >= maxHoldBars) {
          exit = candle.c;
          reason = "TIME";
        }

        if (exit !== null) {
          const gross = position.side === "LONG" ? exit - position.entry : position.entry - exit;
          const pnl = gross * lotSize - feesPerTrade;
          equity += pnl;
          trades.push({ side: position.side, entry: position.entry, exit, pnl, reason });
          equityPoints.push({ i, equity });
          position = null;
        }
      }
    }

    return { trades, equityPoints };
  }

  const lockedView = !isUnlocked;

  const run = async () => {
    setRunning(true);
    setResult(null);
    try {
      // Keep it synchronous; async is for UI loading state.
      const { trades, equityPoints } = runBacktest();
      const totalTrades = trades.length;
      const wins = trades.filter((t) => t.pnl > 0);
      const grossProfit = wins.reduce((sum, t) => sum + t.pnl, 0);
      const grossLoss = Math.abs(trades.filter((t) => t.pnl < 0).reduce((sum, t) => sum + t.pnl, 0));
      const winRate = totalTrades ? (wins.length / totalTrades) * 100 : 0;
      const profitFactor = grossLoss ? grossProfit / grossLoss : grossProfit ? 99 : 0;
      const totalPnl = trades.reduce((sum, t) => sum + t.pnl, 0);
      const avgPnl = totalTrades ? totalPnl / totalTrades : 0;

      setLastRunMeta(`${symbol} · ${strategy} · ${bars} bars`);
      setResult({ totalTrades, winRate, totalPnl, avgPnl, profitFactor, equityPoints });
    } finally {
      setRunning(false);
    }
  };

  if (lockedView) {
    const onProOnly = sub.tier === "pro" && sub.hasAiReports;
    return (
      <section className="space-y-4">
        <UiCard className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-lg dark:border-white/10 dark:bg-slate-900/80">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-violet-600 text-white shadow-md shadow-violet-600/30">
              <Shield size={22} />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-xl font-bold text-slate-900 dark:text-white sm:text-2xl">Backtesting</h1>
              <p className="mt-1 text-sm font-medium text-slate-700 dark:text-slate-300">
                {onProOnly
                  ? "Upgrade to Elite to unlock the full backtesting engine (Pro includes AI Reports only)."
                  : "Upgrade to Elite (monthly or yearly) to unlock backtesting and replay tools."}
              </p>
              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-slate-950/50">
                <p className="text-sm font-medium text-slate-800 dark:text-slate-200">Elite includes:</p>
                <ul className="mt-3 space-y-2 text-sm text-slate-700 dark:text-slate-300">
                  {[
                    "Candle-by-candle strategy replay on synthetic data",
                    "Win rate, expectancy, and equity curve from your run",
                    "Everything in Pro (AI reports, full journal)",
                  ].map((line) => (
                    <li key={line} className="flex gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" strokeWidth={2.5} />
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="mt-5 flex flex-wrap gap-3">
                <UiButton href="/app/membership?plan=elite&billing=monthly" className="px-5" variant="primary">
                  Elite: monthly
                </UiButton>
                <UiButton href="/app/membership?plan=elite&billing=yearly" className="px-5" variant="ghost">
                  Elite: yearly
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
      <div className="rounded-xl border border-white/10 bg-white/5 p-6">
        <h1 className="text-2xl font-bold">Backtesting</h1>
        <p className="mt-2 text-white/70">
          Run a strategy simulation using deterministic synthetic market data. This is a working demo of the engine + metrics.
        </p>
        <p className="mt-2 text-xs font-medium uppercase tracking-wide text-violet-300/90">Elite · {sub.billing ?? "active"}</p>

        <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <label className="space-y-2">
            <div className="text-xs uppercase tracking-[0.12em] text-white/50">Symbol</div>
            <select
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white outline-none"
            >
              {["XAUUSD", "EURUSD", "GBPUSD", "US30", "BTCUSD"].map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <div className="text-xs uppercase tracking-[0.12em] text-white/50">Strategy</div>
            <select
              value={strategy}
              onChange={(e) => setStrategy(e.target.value as any)}
              className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white outline-none"
            >
              {["Breakout", "Pullback", "Mean Reversion"].map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <div className="text-xs uppercase tracking-[0.12em] text-white/50">Bars</div>
            <input
              value={bars}
              onChange={(e) => setBars(Math.max(80, Math.min(600, Number(e.target.value || 0))))}
              type="number"
              className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white outline-none"
              min={80}
              max={600}
            />
          </label>

          <div className="flex items-end gap-3">
            <UiButton onClick={run} disabled={running} className="w-full" variant="primary">
              {running ? "Running..." : "Run backtest"}
            </UiButton>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
          <div className="text-xs uppercase tracking-[0.12em] text-white/50">Stop Loss</div>
          <div className="mt-2 flex items-center gap-3">
            <input
              type="range"
              min={0.3}
              max={3.5}
              step={0.1}
              value={stopLossPct}
              onChange={(e) => setStopLossPct(Number(e.target.value))}
              className="w-full"
            />
            <div className="w-16 text-right text-sm font-semibold text-white">{stopLossPct.toFixed(1)}%</div>
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
          <div className="text-xs uppercase tracking-[0.12em] text-white/50">Take Profit</div>
          <div className="mt-2 flex items-center gap-3">
            <input
              type="range"
              min={0.5}
              max={6}
              step={0.1}
              value={takeProfitPct}
              onChange={(e) => setTakeProfitPct(Number(e.target.value))}
              className="w-full"
            />
            <div className="w-16 text-right text-sm font-semibold text-white">{takeProfitPct.toFixed(1)}%</div>
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
          <div className="text-xs uppercase tracking-[0.12em] text-white/50">Fees + Size</div>
          <div className="mt-2 grid gap-3 md:grid-cols-2">
            <label className="space-y-1">
              <div className="text-[11px] text-white/60">Lot size</div>
              <input
                type="number"
                min={0.1}
                step={0.1}
                value={lotSize}
                onChange={(e) => setLotSize(Number(e.target.value))}
                className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white outline-none"
              />
            </label>
            <label className="space-y-1">
              <div className="text-[11px] text-white/60">Fee/trade</div>
              <input
                type="number"
                min={0}
                step={0.05}
                value={feesPerTrade}
                onChange={(e) => setFeesPerTrade(Number(e.target.value))}
                className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white outline-none"
              />
            </label>
          </div>
        </div>
      </div>

      {result ? (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            {[
              ["Total Trades", String(result.totalTrades)],
              ["Win Rate", `${result.winRate.toFixed(1)}%`],
              ["Profit Factor", result.profitFactor.toFixed(2)],
              ["Total P&L", `${result.totalPnl >= 0 ? "+" : ""}${result.totalPnl.toFixed(2)}`],
            ].map(([label, value]) => (
              <UiCard key={label} className="border-white/10 bg-white/[0.04] p-4">
                <div className="text-xs uppercase tracking-[0.12em] text-white/50">{label}</div>
                <div className="mt-2 text-lg font-semibold">{value}</div>
              </UiCard>
            ))}
          </div>

          <UiCard className="border-white/10 bg-white/[0.04] p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-xs uppercase tracking-[0.12em] text-white/50">Backtest Summary</div>
                <div className="mt-2 text-sm text-white/80">
                  {lastRunMeta} · Avg P&L: {result.avgPnl.toFixed(2)}
                </div>
              </div>
            </div>

            <div className="mt-4 overflow-hidden rounded-xl border border-white/10 bg-black/10 p-4">
              <div className="text-xs uppercase tracking-[0.12em] text-white/50">Equity curve</div>
              <div className="mt-3">
                <svg viewBox="0 0 520 180" width="100%" height="180" preserveAspectRatio="none">
                  {(() => {
                    const points = result.equityPoints;
                    if (points.length < 2) return null;
                    const xs = points.map((p) => p.i);
                    const minX = Math.min(...xs);
                    const maxX = Math.max(...xs);
                    const ys = points.map((p) => p.equity);
                    const minY = Math.min(...ys);
                    const maxY = Math.max(...ys);
                    const pad = 14;
                    const width = 520 - pad * 2;
                    const height = 180 - pad * 2;

                    const mapX = (x: number) => pad + ((x - minX) / Math.max(1e-9, maxX - minX)) * width;
                    const mapY = (y: number) =>
                      pad + (1 - (y - minY) / Math.max(1e-9, maxY - minY)) * height;

                    const d = points
                      .map((p, idx) => {
                        const x = mapX(p.i);
                        const y = mapY(p.equity);
                        return `${idx === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
                      })
                      .join(" ");

                    return (
                      <>
                        <path d={d} stroke="rgba(59,130,246,0.9)" strokeWidth="2" fill="none" />
                        <path d={`${d} L ${pad + width} ${pad + height} L ${pad} ${pad + height} Z`} fill="rgba(59,130,246,0.12)" />
                      </>
                    );
                  })()}
                </svg>
              </div>
            </div>
          </UiCard>
        </div>
      ) : (
        <UiCard className="border-white/10 bg-white/[0.04] p-6">
          <div className="text-sm text-white/80">
            Click <span className="font-semibold text-white">Run backtest</span> to simulate a strategy and view metrics.
          </div>
        </UiCard>
      )}
    </section>
  );
}

