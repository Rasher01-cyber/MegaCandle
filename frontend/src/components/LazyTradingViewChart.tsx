import React, { useEffect, useRef, useState } from "react";

type Props = {
  chartUrl: string;
  symbol: string;
  className?: string;
};

/** Defers heavy TradingView iframe until the chart scrolls into view. */
export default function LazyTradingViewChart({ chartUrl, symbol, className }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setShow(true);
          obs.disconnect();
        }
      },
      { rootMargin: "120px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div ref={wrapRef} className={className}>
      {show ? (
        <iframe key={chartUrl} title={`${symbol} chart`} src={chartUrl} className="h-full w-full border-0" loading="lazy" />
      ) : (
        <div className="flex h-full min-h-[380px] items-center justify-center bg-slate-100 text-sm text-slate-500 dark:bg-white/5 md:min-h-[440px]">
          Loading chart…
        </div>
      )}
    </div>
  );
}
