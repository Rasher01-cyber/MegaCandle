export type TradeSource = "JOURNAL" | "WEBSITE" | "MT5" | "MT4";

export function tradeSourceLabel(source: TradeSource | string | undefined): string {
  switch (source) {
    case "WEBSITE":
      return "Website";
    case "MT5":
      return "MT5";
    case "MT4":
      return "MT4";
    default:
      return "Journal";
  }
}

export function tradeSourceBadgeClass(source: TradeSource | string | undefined): string {
  switch (source) {
    case "WEBSITE":
      return "bg-blue-500/15 text-blue-700 dark:text-blue-200";
    case "MT5":
      return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-200";
    case "MT4":
      return "bg-violet-500/15 text-violet-700 dark:text-violet-200";
    default:
      return "bg-slate-500/15 text-slate-700 dark:text-slate-300";
  }
}
