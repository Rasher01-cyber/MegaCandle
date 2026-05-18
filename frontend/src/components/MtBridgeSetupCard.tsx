import React from "react";
import { AlertCircle, CheckCircle2, Copy } from "lucide-react";

type Props = {
  pairingCode: string | null;
  accountLogin?: string | null;
  brokerServer?: string | null;
  bridgeLive: boolean;
  pendingCommands?: number;
};

export default function MtBridgeSetupCard({
  pairingCode,
  accountLogin,
  brokerServer,
  bridgeLive,
  pendingCommands = 0,
}: Props) {
  if (bridgeLive) {
    return (
      <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-xs text-emerald-950 dark:text-emerald-100">
        <p className="flex items-center gap-2 font-semibold">
          <CheckCircle2 size={16} />
          MT5 bridge is live — trades sync both ways
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-4 text-xs text-amber-950 dark:text-amber-100">
      <p className="flex items-center gap-2 font-semibold">
        <AlertCircle size={16} />
        Connect MetaTrader to see trades in MT5 and on this website
      </p>
      <ol className="mt-3 list-decimal space-y-2 pl-4 leading-relaxed">
        <li>
          In <strong>MT5</strong>, log in: login <span className="font-mono font-bold">{accountLogin ?? "—"}</span>, server{" "}
          <span className="font-mono">{brokerServer ?? "—"}</span>
        </li>
        <li>
          Copy <span className="font-mono">mt5/TradeFXBridge.mq5</span> → MT5 <span className="font-mono">MQL5/Experts</span> → compile (F7)
        </li>
        <li>
          Drag <strong>TradeFXBridge</strong> onto any chart. Set pairing code{" "}
          {pairingCode ? (
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded border border-amber-600/40 bg-amber-500/20 px-1.5 py-0.5 font-mono font-bold"
              onClick={() => void navigator.clipboard.writeText(pairingCode)}
            >
              {pairingCode} <Copy size={12} />
            </button>
          ) : (
            "from Settings"
          )}{" "}
          and ApiBaseUrl <span className="font-mono">http://localhost:4000</span>
        </li>
        <li>
          Click <strong>Algo Trading</strong> in the toolbar until it is <strong className="text-emerald-600">green</strong> (required)
        </li>
        <li>
          Tools → Options → Expert Advisors → allow WebRequest for <span className="font-mono">http://localhost:4000</span>
        </li>
      </ol>
      {pendingCommands > 0 ? (
        <p className="mt-3 rounded-lg bg-amber-600/15 px-3 py-2 font-medium">
          {pendingCommands} order(s) waiting for MT5 — they will run when the EA connects.
        </p>
      ) : null}
    </div>
  );
}
