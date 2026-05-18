import React from "react";
import { CheckCircle2, Copy, Radio, WifiOff } from "lucide-react";
import { UiBadge } from "./ui";

type Props = {
  bridgeLive: boolean;
  bridgeConfigured: boolean;
  accountLogin?: string | null;
  brokerServer?: string | null;
  brokerName?: string | null;
  pairingCode?: string | null;
  platform?: string;
};

export default function MtLinkStatusBanner({
  bridgeLive,
  bridgeConfigured,
  accountLogin,
  brokerServer,
  brokerName,
  pairingCode,
  platform = "MT5",
}: Props) {
  if (bridgeLive) {
    return (
      <div className="rounded-xl border border-emerald-500/35 bg-emerald-500/10 px-4 py-3 text-xs text-emerald-900 dark:text-emerald-100">
        <p className="flex items-center gap-2 font-semibold">
          <CheckCircle2 size={16} />
          {platform} connected · {brokerName ?? "Broker"} · Login {accountLogin}
        </p>
        <p className="mt-1 text-emerald-800/90 dark:text-emerald-200/90">Trades from Live Market execute in your terminal.</p>
      </div>
    );
  }

  if (bridgeConfigured) {
    return (
      <div className="rounded-xl border border-blue-500/35 bg-blue-500/10 px-4 py-3 text-xs text-blue-950 dark:text-blue-100">
        <p className="flex flex-wrap items-center gap-2 font-semibold">
          <Radio size={16} />
          Account saved on MegaCandle
          <UiBadge className="border-blue-400/40 bg-blue-500/15 text-blue-800 dark:text-blue-200">Step 2: MT5 + EA</UiBadge>
        </p>
        <p className="mt-2 font-mono text-[11px]">
          {brokerServer ?? "—"} · Login {accountLogin ?? "—"}
        </p>
        {pairingCode ? (
          <p className="mt-2 flex flex-wrap items-center gap-2">
            <span className="font-semibold">Pairing code:</span>
            <span className="font-mono font-bold tracking-widest">{pairingCode}</span>
            <button
              type="button"
              className="rounded border border-blue-400/40 px-2 py-0.5 text-[10px] hover:bg-blue-500/20"
              onClick={() => void navigator.clipboard.writeText(pairingCode)}
            >
              <Copy size={12} className="inline" /> Copy
            </button>
          </p>
        ) : null}
        <p className="mt-2 text-blue-900/80 dark:text-blue-200/80">
          Log in to MT5 with this server/login, attach TradeFXBridge.mq5, paste the pairing code — then status turns{" "}
          <strong>Live</strong>.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-950 dark:text-amber-100">
      <p className="flex items-center gap-2 font-semibold">
        <WifiOff size={16} />
        No MT5 account linked yet
      </p>
      <p className="mt-1">Click &quot;Link this account to MegaCandle&quot; or fill the form and save.</p>
    </div>
  );
}
