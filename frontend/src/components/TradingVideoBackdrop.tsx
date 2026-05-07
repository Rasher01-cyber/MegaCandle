import React, { useId, useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";

type Candle = { o: number; h: number; l: number; c: number };

/** Deterministic pseudo-random walk for OHLC in 0–100 space */
function candleSeries(seed: number, count: number): Candle[] {
  let p = 48 + (seed % 17);
  const out: Candle[] = [];
  for (let i = 0; i < count; i++) {
    const r = Math.sin(seed * 0.31 + i * 1.7) * 8 + Math.cos(i * 0.9) * 4;
    const o = p;
    const c = Math.max(8, Math.min(92, p + r));
    const hi = Math.max(o, c) + 2 + (i % 3);
    const lo = Math.min(o, c) - 2 - ((i + 1) % 4);
    out.push({ o, h: hi, l: lo, c });
    p = c;
  }
  return out;
}

function CandleStrip({ candles, className }: { candles: Candle[]; className?: string }) {
  const w = 10;
  const gap = 6;
  const pad = 8;
  const n = candles.length;
  const width = pad * 2 + n * w + Math.max(0, n - 1) * gap;
  const height = 120;

  return (
    <svg
      className={className}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      {candles.map((d, i) => {
        const x = pad + i * (w + gap);
        const isUp = d.c >= d.o;
        const bodyTop = Math.min(d.o, d.c);
        const bodyBot = Math.max(d.o, d.c);
        const bodyH = Math.max(1.2, bodyBot - bodyTop);
        const scale = (v: number) => ((100 - v) / 100) * (height - 16) + 8;
        const yH = scale(d.h);
        const yL = scale(d.l);
        const yBody = scale(bodyBot);
        const stroke = isUp ? "rgba(16,185,129,0.85)" : "rgba(244,63,94,0.9)";
        const fill = isUp ? "rgba(16,185,129,0.45)" : "rgba(244,63,94,0.5)";
        return (
          <g key={i}>
            <line x1={x + w / 2} y1={yH} x2={x + w / 2} y2={yL} stroke={stroke} strokeWidth={1.2} strokeLinecap="round" />
            <rect x={x + 1} y={yBody} width={w - 2} height={bodyH} rx={1} fill={fill} stroke={stroke} strokeWidth={0.9} />
          </g>
        );
      })}
    </svg>
  );
}

type BackdropVariant = "default" | "login";

/**
 * Full-viewport trading-style backdrop: animated candle strips + grid + sweep.
 * Horizontal strip motion uses CSS (translate3d) for reliable animation across browsers.
 */
export default function TradingVideoBackdrop({ variant = "default" }: { variant?: BackdropVariant }) {
  const reduceMotion = useReducedMotion();
  const gid = useId();
  const gradId = `${gid}-line`;
  const candlesA = useMemo(() => candleSeries(11, 28), []);
  const candlesB = useMemo(() => candleSeries(29, 28), []);
  const candlesC = useMemo(() => candleSeries(44, 20), []);
  const isLogin = variant === "login";

  const durA = isLogin ? "26s" : "40s";
  const durB = isLogin ? "34s" : "52s";
  const durC = isLogin ? "20s" : "28s";

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div className="absolute inset-0 bg-slate-50 dark:bg-black" />

      <div className="trading-bg-grid absolute inset-[-20%] opacity-[0.55] dark:opacity-[0.5]" aria-hidden />

      <div className="absolute inset-0 bg-[radial-gradient(ellipse_85%_65%_at_50%_40%,rgba(59,130,246,0.07),transparent_55%)] dark:bg-[radial-gradient(ellipse_80%_60%_at_50%_35%,rgba(59,130,246,0.12),transparent_50%)]" />

      <div className={`absolute left-0 right-0 top-[10%] flex flex-col ${isLogin ? "gap-6" : "gap-9"}`}>
        <div className="w-full overflow-hidden">
          <div
            className={reduceMotion ? "flex w-max gap-0" : "trading-strip-ltr"}
            style={
              reduceMotion
                ? undefined
                : ({
                    ["--trading-strip-dur"]: durA,
                  } as React.CSSProperties)
            }
          >
            <CandleStrip candles={candlesA} className="shrink-0 opacity-80 dark:opacity-100" />
            <CandleStrip candles={candlesA} className="shrink-0 opacity-80 dark:opacity-100" />
          </div>
        </div>

        <div className="w-full overflow-hidden">
          <div
            className={reduceMotion ? "flex w-max gap-8" : "trading-strip-rtl"}
            style={
              reduceMotion
                ? { gap: "2rem" }
                : ({
                    gap: "2rem",
                    ["--trading-strip-dur-b"]: durB,
                  } as React.CSSProperties)
            }
          >
            <CandleStrip candles={candlesB} className="shrink-0 opacity-70 dark:opacity-95" />
            <CandleStrip candles={candlesB} className="shrink-0 opacity-70 dark:opacity-95" />
          </div>
        </div>

        {isLogin ? (
          <div className="w-full overflow-hidden">
            <div
              className={reduceMotion ? "flex w-max gap-4" : "trading-strip-ltr"}
              style={
                reduceMotion
                  ? { gap: "1rem" }
                  : ({
                      gap: "1rem",
                      ["--trading-strip-dur"]: durC,
                    } as React.CSSProperties)
              }
            >
              <CandleStrip candles={candlesC} className="h-[84px] w-auto shrink-0 scale-[0.88] opacity-75 dark:opacity-90" />
              <CandleStrip candles={candlesC} className="h-[84px] w-auto shrink-0 scale-[0.88] opacity-75 dark:opacity-90" />
            </div>
          </div>
        ) : null}
      </div>

      <svg
        className="absolute bottom-[18%] left-[-5%] right-[-5%] h-[min(38vh,320px)] w-[110%] opacity-75 dark:opacity-90"
        viewBox="0 0 1200 200"
        preserveAspectRatio="none"
        aria-hidden
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="rgb(6,182,212)" stopOpacity="0.05" />
            <stop offset="40%" stopColor="rgb(59,130,246)" stopOpacity="0.55" />
            <stop offset="100%" stopColor="rgb(6,182,212)" stopOpacity="0.08" />
          </linearGradient>
        </defs>
        <motion.path
          d="M0,120 C120,40 200,160 360,80 S520,20 680,100 S900,140 1080,60 L1200,90"
          fill="none"
          stroke={`url(#${gradId})`}
          strokeWidth="2.2"
          strokeLinecap="round"
          initial={false}
          animate={
            reduceMotion
              ? {}
              : {
                  pathLength: [0.92, 1, 0.92],
                  opacity: [0.65, 1, 0.65],
                }
          }
          transition={reduceMotion ? undefined : { duration: 6, repeat: Infinity, ease: "easeInOut" }}
        />
      </svg>

      {!reduceMotion ? (
        <motion.div
          className="absolute inset-y-0 left-0 w-[min(40%,420px)] bg-gradient-to-r from-transparent via-cyan-400/12 to-transparent dark:via-cyan-400/18"
          initial={{ x: "-20%" }}
          animate={{ x: "120%" }}
          transition={{ duration: 14, repeat: Infinity, ease: "linear" }}
        />
      ) : null}

      <div
        className={
          isLogin
            ? "absolute inset-0 bg-gradient-to-b from-white/68 via-slate-50/40 to-white/72 dark:from-black/46 dark:via-black/38 dark:to-black/52"
            : "absolute inset-0 bg-gradient-to-b from-white/72 via-slate-50/45 to-white/75 dark:from-black/50 dark:via-black/42 dark:to-black/55"
        }
      />
    </div>
  );
}
