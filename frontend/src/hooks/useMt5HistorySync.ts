import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { runMt5HistorySyncSafe, shouldRunBackgroundMt5Sync } from "../lib/mt5Sync";

/** Pull closed deals + positions from MT5 into the app (throttled per session). */
export function useMt5HistorySync(enabled = true) {
  const qc = useQueryClient();

  useEffect(() => {
    if (!enabled || !shouldRunBackgroundMt5Sync()) return;
    let cancelled = false;

    void (async () => {
      if (cancelled) return;
      await runMt5HistorySyncSafe(qc, { notify: true });
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled, qc]);
}
