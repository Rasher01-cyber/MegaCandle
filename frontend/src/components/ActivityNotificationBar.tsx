import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { subscribeActivity, type ActivityKind } from "../lib/activityNotify";

const kindStyles: Record<ActivityKind, string> = {
  success:
    "border-emerald-500/50 bg-emerald-50 text-emerald-900 shadow-emerald-500/10 dark:border-emerald-500/40 dark:bg-emerald-500/15 dark:text-emerald-100",
  error:
    "border-rose-500/50 bg-rose-50 text-rose-900 shadow-rose-500/10 dark:border-rose-500/40 dark:bg-rose-500/15 dark:text-rose-100",
  trade:
    "border-blue-500/50 bg-blue-50 text-blue-900 shadow-blue-500/10 dark:border-blue-500/40 dark:bg-blue-500/15 dark:text-blue-100",
  info:
    "border-slate-300 bg-white/95 text-slate-800 shadow-slate-200/50 dark:border-slate-500/40 dark:bg-slate-800/95 dark:text-slate-100",
};

export default function ActivityNotificationBar() {
  const [active, setActive] = useState<{ message: string; kind: ActivityKind } | null>(null);
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    let pulseTimer = 0;
    let hideTimer = 0;
    const unsub = subscribeActivity((payload) => {
      window.clearTimeout(pulseTimer);
      window.clearTimeout(hideTimer);
      setActive({ message: payload.message, kind: payload.kind ?? "info" });
      setPulse(true);
      pulseTimer = window.setTimeout(() => setPulse(false), 2400);
      hideTimer = window.setTimeout(() => setActive(null), 8000);
    });
    return () => {
      unsub();
      window.clearTimeout(pulseTimer);
      window.clearTimeout(hideTimer);
    };
  }, []);

  return (
    <AnimatePresence>
      {active ? (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          className="pointer-events-none fixed left-0 right-0 top-[3.25rem] z-[60] flex justify-center px-3 sm:top-[3.5rem]"
        >
          <div
            className={`pointer-events-auto max-w-2xl rounded-xl border px-4 py-2.5 text-center text-sm font-medium shadow-lg backdrop-blur-md ${kindStyles[active.kind]} ${
              pulse ? "animate-[megacandle-pulse_0.6s_ease-in-out_3]" : ""
            }`}
            role="status"
            aria-live="polite"
          >
            {active.message}
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
