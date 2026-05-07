import React from "react";
import { Lightbulb } from "lucide-react";
import { motion } from "framer-motion";
import { useTheme } from "../theme/ThemeProvider";

export default function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, toggle } = useTheme();
  const isDark = theme === "dark";

  return (
    <motion.button
      type="button"
      onClick={toggle}
      whileTap={{ scale: 0.9 }}
      layout
      className={`group relative inline-flex h-9 w-9 shrink-0 items-center justify-center overflow-visible rounded-xl border p-0 shadow-sm transition-colors duration-200 ${
        isDark
          ? "border-amber-400/50 bg-slate-950/95 shadow-[0_0_24px_rgba(251,191,36,0.35)] hover:bg-slate-900/95"
          : "border-slate-300/90 bg-white/95 shadow-slate-200/40 hover:bg-slate-50"
      } ${className}`}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Light mode" : "Dark mode"}
      animate={
        isDark
          ? {
              boxShadow: [
                "0 0 12px rgba(251, 191, 36, 0.25), 0 0 28px rgba(251, 191, 36, 0.2), inset 0 0 0 1px rgba(251, 191, 36, 0.35)",
                "0 0 20px rgba(251, 191, 36, 0.45), 0 0 40px rgba(251, 191, 36, 0.32), inset 0 0 0 1px rgba(251, 191, 36, 0.5)",
                "0 0 12px rgba(251, 191, 36, 0.25), 0 0 28px rgba(251, 191, 36, 0.2), inset 0 0 0 1px rgba(251, 191, 36, 0.35)",
              ],
            }
          : {
              boxShadow: "0 1px 2px rgba(15, 23, 42, 0.06)",
            }
      }
      transition={
        isDark
          ? { duration: 2.4, repeat: Infinity, ease: "easeInOut" }
          : { duration: 0.2 }
      }
    >
      <motion.span
        key={theme}
        initial={{ scale: 0.72, rotate: isDark ? -18 : 18, opacity: 0.65 }}
        animate={{
          scale: 1,
          rotate: 0,
          opacity: 1,
        }}
        transition={{ type: "spring", stiffness: 400, damping: 20, mass: 0.65 }}
        className="relative inline-flex"
      >
        <Lightbulb
          size={18}
          strokeWidth={isDark ? 2.1 : 2}
          className={
            isDark
              ? "text-amber-100 drop-shadow-[0_0_18px_rgba(251,191,36,0.85),0_0_32px_rgba(251,191,36,0.35)]"
              : "text-slate-500 drop-shadow-none group-hover:text-amber-600"
          }
          fill={isDark ? "rgba(251, 191, 36, 0.35)" : "rgba(15, 23, 42, 0.04)"}
        />
      </motion.span>
    </motion.button>
  );
}
