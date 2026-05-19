import type { QueryClient } from "@tanstack/react-query";
import { api } from "./api";
import { notifyActivity } from "./activityNotify";
import { formatApiError } from "./formatApiError";

export const MT5_SYNC_STORAGE_KEY = "megacandle.mt5-history-sync";
export const MT5_SYNC_MIN_INTERVAL_MS = 90_000;

export type Mt5RefreshResult = {
  message?: string;
  historyImported?: number;
  dealsFound?: number;
  ok?: boolean;
};

export function clearMt5SyncThrottle() {
  try {
    sessionStorage.removeItem(MT5_SYNC_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function shouldRunBackgroundMt5Sync(): boolean {
  try {
    const raw = sessionStorage.getItem(MT5_SYNC_STORAGE_KEY);
    const last = raw ? Number(raw) : 0;
    if (Number.isFinite(last) && Date.now() - last < MT5_SYNC_MIN_INTERVAL_MS) return false;
    sessionStorage.setItem(MT5_SYNC_STORAGE_KEY, String(Date.now()));
    return true;
  } catch {
    return true;
  }
}

export async function invalidateMt5Queries(qc: QueryClient) {
  await Promise.all([
    qc.invalidateQueries({ queryKey: ["mt5-positions"] }),
    qc.invalidateQueries({ queryKey: ["summary"] }),
    qc.invalidateQueries({ queryKey: ["trades"] }),
    qc.invalidateQueries({ queryKey: ["equity"] }),
    qc.invalidateQueries({ queryKey: ["analytics-calendar"] }),
    qc.invalidateQueries({ queryKey: ["trades", "recent"] }),
  ]);
}

export async function runMt5HistorySync(
  qc: QueryClient,
  options?: { notify?: boolean; force?: boolean },
): Promise<Mt5RefreshResult> {
  if (options?.force) clearMt5SyncThrottle();

  const res = await api.post("/api/mt5/refresh");
  const data = res.data as Mt5RefreshResult;
  await invalidateMt5Queries(qc);

  if (options?.notify !== false) {
    const imported = data.historyImported ?? 0;
    if (imported > 0) {
      notifyActivity(`Synced ${imported} trade record(s) from MT5.`, "success");
    } else if (options?.force && data.message) {
      notifyActivity(data.message, "info");
    }
  }

  return data;
}

export async function runMt5HistorySyncSafe(
  qc: QueryClient,
  options?: { notify?: boolean; force?: boolean },
): Promise<Mt5RefreshResult | null> {
  try {
    return await runMt5HistorySync(qc, options);
  } catch (err) {
    if (options?.notify !== false) {
      notifyActivity(formatApiError(err, "Could not sync with MT5."), "error");
    }
    return null;
  }
}
