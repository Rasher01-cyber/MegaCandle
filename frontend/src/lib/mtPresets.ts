/** Public broker metadata only — never store trading passwords on the website API. */
export const COMMON_MT_SERVERS = [
  "MetaQuotes-Demo",
  "MetaQuotes-Demo2",
  "ICMarketsSC-Demo",
  "Exness-MT5Trial",
  "Exness-MT5Trial7",
  "FTMO-Demo",
  "Pepperstone-Demo",
] as const;

export const METAQUOTES_DEMO = {
  label: "MetaQuotes Demo",
  platform: "MT5" as const,
  brokerName: "MetaQuotes Ltd.",
  brokerServer: "MetaQuotes-Demo",
  accountLogin: "5050581244",
  accountType: "Forex Hedged GBP",
  deposit: "100000",
};
