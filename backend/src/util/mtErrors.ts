/** Turn broker / MT5 / MetaAPI errors into clear messages for the UI. */
export function formatTradingError(raw: string): string {
  const s = raw.trim();
  const lower = s.toLowerCase();

  if (lower.includes("10018") || lower.includes("market closed")) {
    return "Market is closed for this symbol right now. Try during the trading session (e.g. EURUSD Mon–Fri) or pick another symbol.";
  }
  if (lower.includes("10016") || lower.includes("invalid stops")) {
    return "Invalid stop loss or take profit — adjust levels or leave them empty.";
  }
  if (lower.includes("10019") || lower.includes("no money") || lower.includes("not enough money")) {
    return "Not enough margin on your account to open this trade. Reduce lot size or deposit funds.";
  }
  if (lower.includes("10027") || lower.includes("autotrading disabled") || lower.includes("algo trading")) {
    return "Enable Algo Trading in MetaTrader 5 (green button in the toolbar), then try again.";
  }
  if (lower.includes("10030") || lower.includes("unsupported filling")) {
    return "Order type not supported for this symbol — try again or change symbol.";
  }
  if (lower.includes("offline") || lower.includes("disconnect")) {
    return "Broker connection lost. Reconnect your account in Settings or open MetaTrader 5.";
  }
  if (lower.includes("timeout") || lower.includes("timed out")) {
    return "Broker timed out. Check your connection and try again.";
  }

  const retcode = s.match(/retcode[=:]?\s*(\d+)/i);
  if (retcode) {
    return `Order rejected (code ${retcode[1]}). ${s.replace(/.*retcode[=:]?\s*\d+\s*/i, "").replace(/\(\([^)]*\)\)/g, "").trim() || "Check symbol and market hours."}`;
  }

  return s.length > 180 ? `${s.slice(0, 177)}…` : s;
}
