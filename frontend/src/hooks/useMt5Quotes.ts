import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";

export type MtQuote = {
  symbol: string;
  bid: number;
  ask: number;
  spread: number;
  time: number;
};

export function useMt5Quotes(symbols: string[], enabled: boolean) {
  const key = symbols.join(",");
  return useQuery({
    queryKey: ["mt5-quotes", key],
    queryFn: async () => {
      const res = await api.get("/api/mt5/quotes", { params: { symbols: key } });
      return (res.data?.quotes ?? []) as MtQuote[];
    },
    enabled: enabled && symbols.length > 0,
    refetchInterval: enabled ? 2_000 : false,
    staleTime: 1_000,
    placeholderData: (prev) => prev,
  });
}

export function formatPrice(symbol: string, value: number) {
  const s = symbol.toUpperCase();
  const digits = s.includes("JPY") ? 3 : s.includes("XAU") || s.includes("US30") ? 2 : 5;
  return value.toFixed(digits);
}
