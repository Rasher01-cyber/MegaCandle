import React, { useMemo } from "react";

type Col = { up: boolean; bodyH: number };

function candleColumns(seed: number, n: number): Col[] {
  const out: Col[] = [];
  let walk = 42;
  for (let i = 0; i < n; i++) {
    const tick = Math.sin(seed * 0.21 + i * 1.9) * 14 + Math.cos(i * 1.1) * 6;
    walk = Math.max(22, Math.min(58, walk + tick * 0.35));
    const up = Math.sin(seed + i * 2.4) >= 0;
    out.push({ up, bodyH: Math.round(walk) });
  }
  return out;
}

function CandleColumn({ up, bodyH, stagger }: { up: boolean; bodyH: number; stagger: number }) {
  const tickDur = 2.35 + (stagger % 6) * 0.18;
  const delay = stagger * 0.09;

  return (
    <div className="flex h-[76px] w-[14px] shrink-0 flex-col items-center justify-end">
      <div
        className={`login-candle-tick flex w-full flex-col items-center justify-end ${up ? "text-emerald-500" : "text-rose-500"}`}
        style={
          {
            "--tick-dur": `${tickDur}s`,
            animationDelay: `${delay}s`,
          } as React.CSSProperties
        }
      >
        <div className="h-3 w-[3px] shrink-0 rounded-full bg-current opacity-95 shadow-[0_0_6px_currentColor]" />
        <div
          className="mt-px w-[11px] shrink-0 rounded-[3px] bg-current opacity-[0.92] shadow-sm ring-1 ring-black/10 dark:ring-white/10"
          style={{ height: bodyH, minHeight: 14 }}
        />
      </div>
    </div>
  );
}

function CandleStripRow({ cols }: { cols: Col[] }) {
  return (
    <div className="flex shrink-0 items-end gap-[7px] py-1">
      {cols.map((c, i) => (
        <CandleColumn key={i} up={c.up} bodyH={c.bodyH} stagger={i} />
      ))}
    </div>
  );
}

/**
 * “Live” candle strip for login — CSS scroll + per-candle vertical pulse (no brittle SVG motion).
 */
export default function LoginCandleBanner() {
  const cols = useMemo(() => candleColumns(17, 18), []);

  return (
    <div className="relative mb-6 overflow-hidden rounded-xl border border-slate-200/90 bg-gradient-to-b from-slate-50/95 to-white/90 py-2 dark:border-zinc-600/70 dark:from-zinc-900/90 dark:to-zinc-950/90">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-400/45 to-transparent dark:via-emerald-400/35" />

      <div className="overflow-hidden">
        <div
          className="login-strip-scroll"
          style={{ "--login-strip-dur": "18s" } as React.CSSProperties}
        >
          <CandleStripRow cols={cols} />
          <CandleStripRow cols={cols} />
        </div>
      </div>

      <div
        className="pointer-events-none absolute inset-y-0 left-0 z-[1] w-10 bg-gradient-to-r from-white to-transparent dark:from-zinc-950"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-y-0 right-0 z-[1] w-10 bg-gradient-to-l from-white to-transparent dark:from-zinc-950"
        aria-hidden
      />

      <div
        className="login-playhead pointer-events-none absolute inset-y-4 z-[1] w-[2px] rounded-full bg-gradient-to-b from-transparent via-cyan-500/70 to-transparent dark:via-cyan-400/55"
        aria-hidden
      />
    </div>
  );
}
