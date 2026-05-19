/** MT5-style timestamp: 2026.05.18 21:56:51 */
export function formatMtDateTime(iso: string | Date) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export function formatTradePrice(symbol: string, value: number) {
  const s = symbol.toUpperCase();
  const digits = s.includes("JPY") ? 3 : s.includes("XAU") || s.includes("US30") ? 2 : 5;
  return value.toFixed(digits);
}

export function formatPnlPercent(value: number) {
  const sign = value >= 0 ? "" : "";
  return `${sign}${value.toFixed(2)} %`;
}
