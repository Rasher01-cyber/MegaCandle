import React from "react";
import { Lightbulb } from "lucide-react";
import { useTheme } from "../theme/ThemeProvider";

/** Fixed-size control so header actions do not shift when theme changes. */
export default function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, toggle } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggle}
      className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border p-0 shadow-sm transition-colors duration-200 ${
        isDark
          ? "border-amber-400/50 bg-slate-950/95 shadow-[0_0_16px_rgba(251,191,36,0.28)] hover:bg-slate-900"
          : "border-slate-300/90 bg-white/95 hover:bg-slate-50"
      } ${className}`}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Light mode" : "Dark mode"}
    >
      <Lightbulb
        size={18}
        strokeWidth={isDark ? 2.1 : 2}
        className={
          isDark
            ? "text-amber-100 drop-shadow-[0_0_12px_rgba(251,191,36,0.7)]"
            : "text-slate-500 group-hover:text-amber-600"
        }
        fill={isDark ? "rgba(251, 191, 36, 0.35)" : "rgba(15, 23, 42, 0.04)"}
      />
    </button>
  );
}
