export type AnalyticsTab = "symbol" | "side" | "session" | "tag";

export const ANALYTICS_TAB_GUIDE: Record<
  AnalyticsTab,
  { title: string; summary: string; bullets: string[]; specs?: Array<{ label: string; value: string }> }
> = {
  symbol: {
    title: "Symbol breakdown",
    summary:
      "Symbols are the markets you trade (e.g. EURUSD, XAUUSD). This view shows which instruments contribute most to your profit and loss.",
    bullets: [
      "Each card groups closed journal trades by symbol.",
      "Positive PnL means that symbol was net profitable over your logged trades.",
      "Use this to drop weak pairs and double down on symbols that match your edge.",
      "Lot size and pip value differ per symbol — compare PnL%, not only raw dollars, when sizes vary.",
    ],
    specs: [
      { label: "EURUSD", value: "Euro vs US dollar — most liquid FX pair; tight spreads; moves on rates & news." },
      { label: "GBPUSD", value: "British pound vs dollar — higher volatility than EURUSD; watch UK/US data." },
      { label: "USDJPY", value: "Dollar vs yen — sensitive to risk sentiment and Bank of Japan policy." },
      { label: "XAUUSD", value: "Gold vs dollar — quoted in USD/oz; reacts to inflation, rates, and risk-off flows." },
      { label: "US30", value: "US Wall Street index (DJIA CFD) — equity exposure; follows US session and macro headlines." },
    ],
  },
  side: {
    title: "Side breakdown (Long vs Short)",
    summary: "Side tells you whether you bought (LONG) or sold (SHORT) the market. Some traders perform better in one direction.",
    bullets: [
      "LONG = you profit when price rises (buy low, sell higher).",
      "SHORT = you profit when price falls (sell high, buy back lower).",
      "A strong LONG bucket with weak SHORT may mean you should avoid counter-trend shorts.",
      "Session and trend context matter — side alone does not tell the full story.",
    ],
  },
  session: {
    title: "Session breakdown",
    summary:
      "Sessions group trades by time of day (UTC): Asia, London, and New York. Liquidity and volatility change through the day.",
    bullets: [
      "Asia — often slower ranges; JPY pairs and some metals can still move on regional data.",
      "London — European open; EUR, GBP pairs typically see volume pick up.",
      "New York — US open overlap with London; often the highest liquidity window for majors.",
      "Trading only during your best session can improve consistency and reduce fatigue mistakes.",
    ],
    specs: [
      { label: "Asia (UTC)", value: "~00:00–08:00 — Tokyo/Sydney liquidity" },
      { label: "London (UTC)", value: "~08:00–16:00 — European session" },
      { label: "New York (UTC)", value: "~13:00–21:00 — US session (overlap with London)" },
    ],
  },
  tag: {
    title: "Tag breakdown",
    summary:
      "Tags are labels you attach to journal trades (e.g. breakout, revenge, A+ setup). This shows which behaviours make or cost money.",
    bullets: [
      "Untagged trades appear as “untagged” — tag consistently for clearer insights.",
      "Compare win rate and PnL per tag to see which setups are real edge vs noise.",
      "Use tags for mistakes too (FOMO, overtrade) to spot costly habits.",
      "Keep tag names short and stable so analytics stay comparable month to month.",
    ],
  },
};
