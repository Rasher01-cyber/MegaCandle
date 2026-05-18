import React, { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Activity, ArrowDownRight, ArrowUpRight, LineChart, RefreshCw } from "lucide-react";
import { useTheme } from "../../theme/ThemeProvider";
import { api } from "../../lib/api";
import { setActiveMtAccountId } from "../../lib/activeMtAccount";
import { formatApiError } from "../../lib/formatApiError";
import MtAutoLinkStatus from "../../components/MtAutoLinkStatus";
import MtLiveAccounts from "../../components/MtLiveAccounts";
import { formatPrice, useMt5Quotes } from "../../hooks/useMt5Quotes";
import { tradingViewChartUrl, useMt5Live } from "../../hooks/useMt5Live";
import { UiBadge, UiButton, UiCard, UiSectionHeader, UiSkeleton } from "../../components/ui";

type MtPosition = {
  id: string;
  accountId?: string;
  ticket: number;
  symbol: string;
  side: "LONG" | "SHORT";
  volume: number;
  openPrice: number;
  currentPrice: number;
  profit: number;
  openTime: string;
};

const DEFAULT_SYMBOLS = ["EURUSD", "GBPUSD", "USDJPY", "XAUUSD", "US30"] as const;
const LOT_PRESETS = ["0.01", "0.05", "0.10", "0.50", "1.00"];

export default function LiveMarketPage() {
  const qc = useQueryClient();
  const { theme } = useTheme();
  const [symbols, setSymbols] = useState<string[]>([...DEFAULT_SYMBOLS]);
  const [symbol, setSymbol] = useState<string>("EURUSD");
  const [volume, setVolume] = useState("0.01");
  const [msg, setMsg] = useState<string | null>(null);
  const [closingId, setClosingId] = useState<string | null>(null);

  useMt5Live(true);

  useEffect(() => {
    void api.get("/api/mt5/symbols").then((res) => {
      const list = res.data?.symbols as string[] | undefined;
      if (list?.length) {
        setSymbols(list);
        if (!list.includes(symbol)) setSymbol(list[0]);
      }
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: ["mt5-positions"],
    queryFn: async () => (await api.get("/api/mt5/positions")).data,
    staleTime: 5_000,
    refetchInterval: false,
  });

  const refreshMt = useMutation({
    mutationFn: async () => (await api.post("/api/mt5/refresh")).data,
    onSuccess: (res) => {
      setMsg((res?.message as string) ?? "Refreshed.");
      void qc.invalidateQueries({ queryKey: ["mt5-positions"] });
    },
    onError: (err: unknown) => setMsg(formatApiError(err, "Sync failed")),
  });

  const chartUrl = useMemo(
    () => tradingViewChartUrl(symbol, theme === "dark" ? "dark" : "light"),
    [symbol, theme],
  );

  const bridgeLive = Boolean(data?.bridgeLive);
  const bridgeLinked = Boolean(data?.bridgeLinked);
  const syncError = (data?.syncError as string | null) ?? null;
  const bridgeWaiting = Boolean(data?.bridgeWaiting);
  const bridgeBroker = data?.bridgeBroker as {
    platform?: string;
    brokerServer?: string;
    accountLogin?: string;
  } | undefined;
  const account = data?.account as { balance?: number; equity?: number } | undefined;
  const positions = (data?.positions ?? []) as MtPosition[];
  const tradingAccountId = data?.tradingAccountId as string | undefined;
  const canTrade = bridgeLive || (bridgeLinked && Boolean(data?.localMt5));

  const { data: quotes = [] } = useMt5Quotes(symbols, bridgeLive || bridgeLinked);
  const quoteMap = useMemo(() => {
    const m = new Map<string, (typeof quotes)[0]>();
    for (const q of quotes) m.set(q.symbol.toUpperCase(), q);
    return m;
  }, [quotes]);
  const activeQuote = quoteMap.get(symbol.toUpperCase());

  useEffect(() => {
    if (tradingAccountId) setActiveMtAccountId(tradingAccountId);
  }, [tradingAccountId]);

  const openTrade = useMutation({
    mutationFn: async (orderSide: "LONG" | "SHORT") => {
      const vol = parseFloat(volume);
      if (!Number.isFinite(vol) || vol <= 0) throw new Error("Invalid lot size");
      return (
        await api.post("/api/mt5/orders/open", {
          symbol,
          side: orderSide,
          volume: vol,
          ...(tradingAccountId ? { accountId: tradingAccountId } : {}),
        })
      ).data;
    },
    onSuccess: (res) => {
      setMsg((res?.message as string) ?? `Trade opened on ${symbol}`);
      void qc.invalidateQueries({ queryKey: ["mt5-positions"] });
    },
    onError: (err: unknown) => setMsg(formatApiError(err, "Failed to open trade")),
  });

  const closeTrade = useMutation({
    mutationFn: async (pos: MtPosition) => {
      setClosingId(pos.id);
      return (
        await api.post("/api/mt5/orders/close", {
          ticket: pos.ticket,
          positionId: pos.id,
          ...(tradingAccountId ? { accountId: tradingAccountId } : {}),
        })
      ).data;
    },
    onSuccess: (res) => {
      setClosingId(null);
      setMsg((res?.message as string) ?? "Position closed on your MT5/MT4 account.");
      void qc.invalidateQueries({ queryKey: ["mt5-positions"] });
    },
    onError: (err: unknown) => {
      setClosingId(null);
      setMsg(formatApiError(err, "Failed to close"));
    },
  });

  return (
    <section className="space-y-6 relative z-10">
      <UiSectionHeader
        badge="Live trading"
        title="Live Market"
        description="Trades execute on your MT5/MT4 broker account only — website and terminal stay in sync."
        action={
          <MtAutoLinkStatus
            connected={bridgeLinked}
            bridgeLive={bridgeLive}
            accountSaved={bridgeLinked && !bridgeLive}
            accountLogin={bridgeBroker?.accountLogin}
          />
        }
      />

      <MtLiveAccounts
        bridgeLive={bridgeLive}
        bridgeLinked={bridgeLinked}
        accountLogin={bridgeBroker?.accountLogin}
        brokerServer={bridgeBroker?.brokerServer}
        platform={bridgeBroker?.platform}
        balance={account?.balance}
        equity={account?.equity}
        tradingAccountId={tradingAccountId}
        onMessage={setMsg}
      />

      {symbols.length > 0 ? (
        <UiCard className="relative z-10 p-3">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Live prices (MT5)</p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {symbols.map((s) => {
              const q = quoteMap.get(s.toUpperCase());
              const selected = s === symbol;
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSymbol(s)}
                  className={`min-w-[108px] shrink-0 rounded-xl border px-3 py-2 text-left transition ${
                    selected
                      ? "border-blue-500 bg-blue-500/10"
                      : "border-slate-200 dark:border-white/10 hover:border-blue-400/50"
                  }`}
                >
                  <p className="text-xs font-bold text-slate-900 dark:text-white">{s}</p>
                  {q ? (
                    <>
                      <p className="mt-0.5 text-sm font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                        {formatPrice(s, q.bid)}
                      </p>
                      <p className="text-[10px] tabular-nums text-slate-500">Ask {formatPrice(s, q.ask)}</p>
                    </>
                  ) : (
                    <p className="mt-1 text-[10px] text-slate-400">—</p>
                  )}
                </button>
              );
            })}
          </div>
        </UiCard>
      ) : null}

      <UiCard className="relative z-10 overflow-hidden p-0">
        <div className="relative z-20 flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-4 py-2 dark:border-white/10">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
            <LineChart size={16} className="text-blue-500" />
            {symbol} chart
          </div>
          <div className="flex flex-wrap gap-1">
            {symbols.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSymbol(s)}
                className={`rounded-lg px-2 py-1 text-[11px] font-semibold ${
                  symbol === s ? "bg-blue-600 text-white" : "bg-slate-100 dark:bg-white/10"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
        <iframe key={chartUrl} title={`${symbol} chart`} src={chartUrl} className="relative z-0 h-[380px] w-full border-0 md:h-[440px]" />
      </UiCard>

      <div className="relative z-20 grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <UiCard className="relative z-20 p-5">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Take trade</h3>
          <p className="mt-1 text-xs text-slate-500">
            {canTrade
              ? "Orders go to your connected MT5/MT4 account."
              : "Connect your account above before trading."}
          </p>
          {activeQuote ? (
            <div className="mt-3 flex flex-wrap gap-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-white/10 dark:bg-white/5">
              <div>
                <p className="text-[10px] uppercase text-slate-500">Bid</p>
                <p className="text-lg font-bold tabular-nums text-emerald-600">{formatPrice(symbol, activeQuote.bid)}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase text-slate-500">Ask</p>
                <p className="text-lg font-bold tabular-nums text-rose-600">{formatPrice(symbol, activeQuote.ask)}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase text-slate-500">Spread</p>
                <p className="text-lg font-bold tabular-nums">{formatPrice(symbol, activeQuote.spread)}</p>
              </div>
            </div>
          ) : null}

          <div className="mt-4 space-y-4">
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400">
              Symbol
              <select
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                disabled={!canTrade}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm dark:border-white/20 dark:bg-[#0d1118] dark:text-white disabled:opacity-50"
              >
                {symbols.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400">
              Lot size
              <input
                value={volume}
                onChange={(e) => setVolume(e.target.value.replace(/[^0-9.]/g, ""))}
                disabled={!canTrade}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm dark:border-white/20 dark:bg-[#0d1118] dark:text-white disabled:opacity-50"
              />
              <div className="mt-2 flex flex-wrap gap-1.5">
                {LOT_PRESETS.map((lot) => (
                  <button
                    key={lot}
                    type="button"
                    disabled={!canTrade}
                    onClick={() => setVolume(lot)}
                    className={`rounded-lg px-2.5 py-1.5 text-[11px] font-semibold disabled:opacity-50 ${
                      volume === lot ? "bg-blue-600 text-white" : "bg-slate-100 dark:bg-white/10"
                    }`}
                  >
                    {lot}
                  </button>
                ))}
              </div>
            </label>

            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                disabled={!canTrade || openTrade.isPending}
                onClick={() => openTrade.mutate("LONG")}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3.5 text-sm font-semibold text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ArrowUpRight size={18} />
                Buy / Long
              </button>
              <button
                type="button"
                disabled={!canTrade || openTrade.isPending}
                onClick={() => openTrade.mutate("SHORT")}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-rose-600 py-3.5 text-sm font-semibold text-white hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ArrowDownRight size={18} />
                Sell / Short
              </button>
            </div>

            {msg ? <p className="text-xs text-slate-600 dark:text-slate-300">{msg}</p> : null}
          </div>
        </UiCard>

        <UiCard className="relative z-20 p-5">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Open positions</h3>
            <div className="flex items-center gap-2">
              <UiButton
                variant="ghost"
                className="!px-2 !py-1 text-xs"
                onClick={() => refreshMt.mutate()}
                disabled={!bridgeLinked || refreshMt.isPending}
              >
                <RefreshCw size={14} className={refreshMt.isPending ? "animate-spin" : ""} />
                Sync MT5
              </UiButton>
              <Activity size={16} className="text-slate-400" />
            </div>
          </div>

          <div className="mt-4 min-h-[140px] overflow-hidden rounded-xl border border-slate-200 dark:border-white/10">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-100 text-[10px] uppercase text-slate-500 dark:bg-white/5">
                <tr>
                  <th className="px-3 py-2">Symbol</th>
                  <th className="px-3 py-2">Side</th>
                  <th className="px-3 py-2">Lots</th>
                  <th className="px-3 py-2">Price</th>
                  <th className="px-3 py-2">P/L</th>
                  <th className="px-3 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="p-6">
                      <UiSkeleton className="h-8 w-full" />
                    </td>
                  </tr>
                ) : positions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-10 text-center text-xs text-slate-500">
                      {canTrade
                        ? syncError
                          ? `No positions loaded — ${syncError}`
                          : "No open positions — click Sync MT5 if you have trades in the terminal"
                        : bridgeWaiting
                          ? "Open MetaTrader 5 on this PC, then click Sync MT5"
                          : "Connect MT5/MT4 above to view and manage trades"}
                    </td>
                  </tr>
                ) : (
                  positions.map((p) => (
                    <tr key={p.id} className="border-t border-slate-200/80 dark:border-white/5">
                      <td className="px-3 py-3 font-semibold">{p.symbol}</td>
                      <td className="px-3 py-3">
                        <UiBadge>{p.side}</UiBadge>
                      </td>
                      <td className="px-3 py-3">{p.volume}</td>
                      <td className="px-3 py-3 tabular-nums text-slate-600 dark:text-slate-300">
                        {formatPrice(p.symbol, p.currentPrice)}
                      </td>
                      <td className={`px-3 py-3 font-semibold ${p.profit >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                        {p.profit >= 0 ? "+" : ""}
                        {p.profit.toFixed(2)}
                      </td>
                      <td className="px-3 py-3 text-right">
                        <UiButton
                          variant="danger"
                          className="!px-2 !py-1 text-xs"
                          onClick={() => closeTrade.mutate(p)}
                          disabled={!canTrade || closingId === p.id}
                        >
                          {closingId === p.id ? "Closing…" : "Close"}
                        </UiButton>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </UiCard>
      </div>
    </section>
  );
}
