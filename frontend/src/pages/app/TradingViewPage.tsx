import React from "react";
import { ExternalLink } from "lucide-react";
import { UiButton, UiCard, UiSectionHeader } from "../../components/ui";

export default function TradingViewPage() {
  return (
    <section className="space-y-5">
      <UiSectionHeader
        badge="Chart Studio"
        title="TradingView"
        description="Advanced charting workspace for multi-timeframe analysis and setup planning."
        action={
          <UiButton href="https://www.tradingview.com/chart/" target="_blank" rel="noreferrer">
            Open Full TradingView <ExternalLink size={14} className="ml-1" />
          </UiButton>
        }
      />
      <UiCard className="overflow-hidden p-0">
        <iframe
          title="TradingView chart"
          src="https://s.tradingview.com/widgetembed/?frameElementId=tradingview_chart&symbol=BINANCE:BTCUSDT&interval=60&hidesidetoolbar=0&symboledit=1&saveimage=1&toolbarbg=f1f3f6&studies=[]&theme=dark&style=1&timezone=Etc/UTC&withdateranges=1&hideideas=1"
          className="h-[680px] w-full border-0"
        />
      </UiCard>
    </section>
  );
}
