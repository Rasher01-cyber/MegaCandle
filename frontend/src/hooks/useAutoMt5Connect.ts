import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

/** Keeps MT5 position data fresh while the app is open. */
export function useAutoMt5Connect() {
  const qc = useQueryClient();

  useEffect(() => {
    const id = window.setInterval(() => {
      void qc.invalidateQueries({ queryKey: ["mt5-positions"] });
    }, 4000);
    return () => window.clearInterval(id);
  }, [qc]);

  return { linking: false, status: undefined };
}
