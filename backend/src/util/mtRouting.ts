import { localMt5Enabled } from "./localMt5";
import { metaApiEnabled } from "./metaApiBridge";

/** Trades execute on MetaAPI cloud — no MT5 terminal on this PC. */
export function cloudTradingEnabled() {
  return metaApiEnabled();
}

/** Local Python bridge to MT5 app (optional). */
export function localTerminalEnabled() {
  return localMt5Enabled() && !cloudTradingEnabled();
}

export function tradingCapabilitiesMessage() {
  if (cloudTradingEnabled()) {
    return "Cloud trading active — buy/sell from the website without opening MetaTrader.";
  }
  if (localMt5Enabled()) {
    return "Local mode — keep MetaTrader 5 open on this PC, or add METAAPI_TOKEN for website-only trading.";
  }
  return "Add METAAPI_TOKEN in backend/.env (https://metaapi.cloud) for website-only trading.";
}
