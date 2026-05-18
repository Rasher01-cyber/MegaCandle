import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

type Mt5StreamPayload = {
  connected: boolean;
  account: unknown;
  positions: unknown[];
};

export function useMt5Live(enabled = true) {
  const qc = useQueryClient();
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!enabled) return;

    const es = new EventSource("/api/mt5/stream", { withCredentials: true } as EventSourceInit);

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as Mt5StreamPayload;
        setConnected(Boolean(data.connected));
        qc.setQueryData(["mt5-positions"], data);
      } catch {
        // ignore malformed frames
      }
    };

    es.onerror = () => {
      setConnected(false);
    };

    return () => es.close();
  }, [enabled, qc]);

  return { streamConnected: connected };
}

function tvSymbol(symbol: string) {
  const base = symbol.replace(/m$/i, "");
  if (base === "BTCUSD") return "BINANCE:BTCUSDT";
  if (base === "US30") return "CAPITALCOM:US30";
  if (base === "XAUUSD") return "OANDA:XAUUSD";
  return `OANDA:${base}`;
}

export function tradingViewChartUrl(symbol: string, theme: "dark" | "light" = "dark") {
  const tv = encodeURIComponent(tvSymbol(symbol));
  return `https://s.tradingview.com/widgetembed/?frameElementId=megacandle_chart&symbol=${tv}&interval=15&hidesidetoolbar=0&symboledit=1&saveimage=0&toolbarbg=f1f3f6&studies=[]&theme=${theme}&style=1&timezone=Etc/UTC&withdateranges=1&hideideas=1`;
}
