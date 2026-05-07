import React from "react";
import { motion } from "framer-motion";
import BrandLogo from "./BrandLogo";

export default function StartupSplash() {
  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950">
      <div className="absolute inset-0 trading-bg-grid opacity-35" />
      <div className="relative flex flex-col items-center gap-4 rounded-2xl border border-cyan-400/20 bg-slate-950/75 px-8 py-7 shadow-2xl shadow-cyan-500/10 backdrop-blur">
        <BrandLogo />
        <div className="relative h-14 w-16">
          <motion.div
            className="absolute left-1/2 top-1 h-10 w-[2px] -translate-x-1/2 rounded-full bg-cyan-300/70"
            animate={{ y: [-4, 4, -3] }}
            transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute left-1/2 top-4 h-6 w-3 -translate-x-1/2 rounded-sm bg-gradient-to-b from-emerald-300 to-emerald-500"
            animate={{ y: [-4, 5, -2], scaleY: [0.88, 1.2, 0.94] }}
            transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
        <p className="text-xs uppercase tracking-[0.24em] text-cyan-200/80">Loading TradeFXBook</p>
      </div>
    </div>
  );
}
