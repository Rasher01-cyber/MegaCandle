/** Rough FX session hint for UI only — not broker-specific. */
export function isForexWeekendClosed(now = new Date()): boolean {
  const day = now.getDay();
  return day === 0 || day === 6;
}

export function forexWeekendNotice(now = new Date()): string | null {
  if (!isForexWeekendClosed(now)) return null;
  const day = now.getDay();
  if (day === 0) {
    return "Forex markets are typically closed on Sunday until the Asia session opens. Live MT5 orders may be rejected until the market opens.";
  }
  return "Forex markets are typically closed on Saturday. Live MT5/MT4 orders resume when markets open.";
}
