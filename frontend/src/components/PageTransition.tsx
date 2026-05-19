import React from "react";
import { motion } from "framer-motion";
import { useLocation } from "react-router-dom";

/** Subtle fade when switching workspace pages (does not remount the whole app shell). */
export default function PageTransition({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  return (
    <motion.div
      key={location.pathname}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}
