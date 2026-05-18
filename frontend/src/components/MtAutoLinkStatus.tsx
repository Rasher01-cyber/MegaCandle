import React from "react";
import { CheckCircle2, Radio } from "lucide-react";
import { UiBadge } from "./ui";

export default function MtAutoLinkStatus({
  connected,
  linking,
  bridgeLive,
  accountSaved,
  accountLogin,
}: {
  connected: boolean;
  linking?: boolean;
  bridgeLive?: boolean;
  accountSaved?: boolean;
  accountLogin?: string | null;
}) {
  if (bridgeLive) {
    return (
      <UiBadge className="border-emerald-300/40 bg-emerald-500/15 text-emerald-800 dark:text-emerald-200">
        <CheckCircle2 size={12} className="mr-1 inline" />
        MT5/MT4 · Broker live
      </UiBadge>
    );
  }

  if (accountSaved && !bridgeLive) {
    return (
      <UiBadge className="border-blue-300/40 bg-blue-500/15 text-blue-800 dark:text-blue-200">
        <CheckCircle2 size={12} className="mr-1 inline" />
        {accountLogin ? `${accountLogin} · Saved` : "MT5 account saved"}
      </UiBadge>
    );
  }

  if (linking) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-300/40 bg-blue-500/10 px-2.5 py-1 text-xs font-medium text-blue-800 dark:text-blue-200">
        <Radio size={12} className="animate-pulse" />
        Connecting…
      </span>
    );
  }

  return (
    <UiBadge>
      <Radio size={12} className="mr-1 inline" />
      MT5/MT4 not connected
    </UiBadge>
  );
}
