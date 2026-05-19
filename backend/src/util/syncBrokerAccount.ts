import type { MtAccount } from "@prisma/client";
import { cloudTradingEnabled } from "./mtRouting";
import { localMt5HistorySyncEnabled, localMt5Enabled, syncLocalMt5Account } from "./localMt5";
import { getStoredMtPassword, syncMetaApiPositions } from "./metaApiBridge";

export type BrokerSyncResult = {
  historyImported: number;
  localOk: boolean;
  cloudOk: boolean;
  dealsFound: number;
  errors: string[];
};

/** Sync positions (cloud) and closed-trade history (local MT5 terminal when available). */
export async function syncBrokerAccount(account: MtAccount): Promise<BrokerSyncResult> {
  const password = getStoredMtPassword(account);
  const result: BrokerSyncResult = {
    historyImported: 0,
    localOk: false,
    cloudOk: false,
    dealsFound: 0,
    errors: [],
  };

  if (!password) {
    result.errors.push("Reconnect your MT5 account with login and password.");
    return result;
  }

  if (localMt5HistorySyncEnabled()) {
    const local = await syncLocalMt5Account(account, password);
    if (local.ok) {
      result.localOk = true;
      result.historyImported = local.historyImported ?? 0;
      result.dealsFound = local.closedDeals?.length ?? 0;
    } else if (local.error) {
      result.errors.push(local.error);
    }
  }

  if (cloudTradingEnabled()) {
    try {
      await syncMetaApiPositions(account, password);
      result.cloudOk = true;
    } catch (err) {
      result.errors.push(err instanceof Error ? err.message : "Cloud sync failed");
    }
  }

  if (!result.localOk && localMt5Enabled() && !localMt5HistorySyncEnabled()) {
    const local = await syncLocalMt5Account(account, password);
    if (local.ok) {
      result.localOk = true;
      result.historyImported = local.historyImported ?? 0;
      result.dealsFound = local.closedDeals?.length ?? 0;
    } else if (local.error) {
      result.errors.push(local.error);
    }
  }

  return result;
}
