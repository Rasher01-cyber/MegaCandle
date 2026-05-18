export function toBrokerSymbol(symbol: string) {
  const sym = symbol.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (sym.endsWith("M") && sym.length > 4) return sym;
  if (["XAUUSD", "EURUSD", "GBPUSD", "USDJPY", "BTCUSD"].includes(sym)) {
    return `${sym}m`;
  }
  return sym;
}

export function fromBrokerSymbol(symbol: string) {
  const sym = symbol.toUpperCase();
  return sym.endsWith("M") && sym.length > 5 ? sym.slice(0, -1) : sym;
}
