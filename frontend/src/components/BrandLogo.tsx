import React from "react";

type BrandLogoProps = {
  compact?: boolean;
  className?: string;
};

export default function BrandLogo({ compact = false, className = "" }: BrandLogoProps) {
  return (
    <div className={`inline-flex items-center gap-3 ${className}`}>
      <span
        className={`relative inline-flex items-center justify-center overflow-hidden rounded-xl border border-cyan-300/45 bg-gradient-to-br from-slate-950 via-blue-950 to-cyan-900 text-cyan-100 shadow-lg shadow-cyan-500/20 dark:border-cyan-300/35 dark:shadow-cyan-400/25 ${
          compact ? "h-9 w-9" : "h-10 w-10"
        }`}
      >
        <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(255,255,255,0.35),transparent_45%)]" />
        <svg width={compact ? 19 : 21} height={compact ? 19 : 21} viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M5.8 4.1V20.4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          <rect x="4.6" y="10.1" width="2.4" height="6.4" rx="1.1" className="fill-rose-300" />

          <path d="M12 2.4V21.6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
          <rect x="10.5" y="6.2" width="3" height="10.8" rx="1.2" className="fill-emerald-200" />

          <path d="M18.2 4.1V20.4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          <rect x="17" y="10.1" width="2.4" height="6.4" rx="1.1" className="fill-rose-300" />
        </svg>
      </span>
      <span className="leading-none">
        <span className={`relative block font-extrabold tracking-[0.02em] ${compact ? "text-[0.95rem]" : "text-[1.02rem]"}`}>
          <span className="bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500 bg-clip-text text-transparent">
            MegaCandle
          </span>
          <span className="ml-1 inline-flex items-center gap-[3px] align-middle">
            <span className="h-2 w-[3px] rounded-full bg-emerald-400" />
            <span className="h-3 w-[3px] rounded-full bg-cyan-400" />
            <span className="h-[9px] w-[3px] rounded-full bg-rose-400" />
          </span>
        </span>
        <span className={`mt-1 block uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400 ${compact ? "text-[9px]" : "text-[10px]"}`}>
          Trade With Precision
        </span>
      </span>
    </div>
  );
}
