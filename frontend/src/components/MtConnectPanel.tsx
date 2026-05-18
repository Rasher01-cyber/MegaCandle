import React from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import MtTerminalConnect from "./MtTerminalConnect";
import MtAutoLinkStatus from "./MtAutoLinkStatus";
import { UiCard } from "./ui";

export default function MtConnectPanel({ compact = false }: { compact?: boolean }) {
  const { data } = useQuery({
    queryKey: ["mt5-positions"],
    queryFn: async () => (await api.get("/api/mt5/positions")).data,
    staleTime: 60_000,
    refetchInterval: false,
  });

  const connected = Boolean(data?.connected);
  const bridgeLive = Boolean(data?.bridgeLive);
  const bridgePairingCode = (data?.bridgePairingCode as string | undefined) ?? null;
  const account = data?.account;

  return (
    <div className="space-y-4">
      <UiCard className={compact ? "p-3" : "p-4"}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">MT5 / MT4 broker link</p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {bridgeLive
                ? "Website and your MetaTrader terminal trade on the same broker account."
                : "Connect any broker in MT5 or MT4, then attach the MegaCandle bridge EA below."}
            </p>
          </div>
          <MtAutoLinkStatus connected={connected} bridgeLive={bridgeLive} accountLogin={account?.accountLogin} />
        </div>
        {!bridgeLive && bridgePairingCode ? (
          <p className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 font-mono text-sm font-bold tracking-widest text-amber-900 dark:text-amber-100">
            MT5 pairing code: {bridgePairingCode}
          </p>
        ) : null}
      </UiCard>
      <MtTerminalConnect pairingCode={bridgePairingCode} />
    </div>
  );
}
