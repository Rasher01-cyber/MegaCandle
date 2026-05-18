import React from "react";
import { motion } from "framer-motion";

export default function HoverScaleCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      whileHover={{ scale: 1.03 }}
      transition={{ type: "spring", stiffness: 380, damping: 22 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
