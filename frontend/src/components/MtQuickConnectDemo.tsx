import React, { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Copy, Link2, Smartphone } from "lucide-react";
import { api } from "../lib/api";
import { METAQUOTES_DEMO } from "../lib/mtPresets";
import { setActiveMtAccountId } from "../lib/activeMtAccount";
import { UiButton, UiCard } from "./ui";

async function copyText(value: string) {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    return false;
  }
}

function CopyRow({ label, value }: { label: string; value: string }) {
  const [ok, setOk] = useState(false);
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-white/10 dark:bg-black/30">
      <div>
        <p className="text-[10px] font-semibold uppercase text-slate-500">{label}</p>
        <p className="font-mono text-sm font-medium text-slate-900 dark:text-white">{value}</p>
      </div>
      <button
        type="button"
        onClick={() => {
          void copyText(value).then((s) => {
            if (s) {
              setOk(true);
              window.setTimeout(() => setOk(false), 2000);
            }
          });
        }}
        className="rounded-lg border border-slate-200 p-2 dark:border-white/15"
      >
        {ok ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
      </button>
    </div>
  );
}

export default function MtQuickConnectDemo({ onLinked }: { onLinked?: () => void }) {
  const qc = useQueryClient();
  const [linked, setLinked] = useState(false);
  const [pairingCode, setPairingCode] = useState<string | null>(null);

  const { data: bridge } = useQuery({
    queryKey: ["mt5-bridge"],
    queryFn: async () => (await api.get("/api/mt5/bridge")).data,
  });

  useEffect(() => {
    if (bridge?.accountLogin === METAQUOTES_DEMO.accountLogin || bridge?.brokerServer === METAQUOTES_DEMO.brokerServer) {
      setLinked(true);
      if (bridge.pairingCode) setPairingCode(bridge.pairingCode);
    }
  }, [bridge]);

  const linkDemo = useMutation({
    mutationFn: async () =>
      (
        await api.post("/api/mt5/accounts", {
          label: METAQUOTES_DEMO.label,
          platform: METAQUOTES_DEMO.platform,
          brokerName: METAQUOTES_DEMO.brokerName,
          brokerServer: METAQUOTES_DEMO.brokerServer,
          accountLogin: METAQUOTES_DEMO.accountLogin,
          setDefault: true,
        })
      ).data,
    onSuccess: (res) => {
      const acc = res?.account;
      if (acc?.id) setActiveMtAccountId(acc.id);
      if (acc?.pairingCode) setPairingCode(acc.pairingCode);
      setLinked(true);
      qc.invalidateQueries({ queryKey: ["mt5-accounts"] });
      qc.invalidateQueries({ queryKey: ["mt5-bridge"] });
      qc.invalidateQueries({ queryKey: ["mt5-positions"] });
      onLinked?.();
    },
  });

  return (
    <UiCard className="border-violet-500/30 bg-gradient-to-br from-violet-500/10 to-transparent p-5">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-violet-500/15 p-2 text-violet-600 dark:text-violet-300">
          <Smartphone size={20} />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Your MetaQuotes demo account</h3>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
            Login <span className="font-mono font-semibold">{METAQUOTES_DEMO.accountLogin}</span> on server{" "}
            <span className="font-mono font-semibold">{METAQUOTES_DEMO.brokerServer}</span>. MegaCandle links via MT5 + bridge
            EA — password stays in the MetaTrader app only.
          </p>
        </div>
      </div>

      {!linked ? (
        <UiButton type="button" className="mt-4 w-full sm:w-auto" onClick={() => linkDemo.mutate()} disabled={linkDemo.isPending}>
          <Link2 size={14} className="mr-1" />
          {linkDemo.isPending ? "Linking…" : "Link this account to MegaCandle"}
        </UiButton>
      ) : (
        <p className="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs font-medium text-emerald-800 dark:text-emerald-200">
          Account registered on MegaCandle. Complete the MT5 steps below to go live.
        </p>
      )}

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <CopyRow label="MT5 server" value={METAQUOTES_DEMO.brokerServer} />
        <CopyRow label="Login" value={METAQUOTES_DEMO.accountLogin} />
        {pairingCode ? <CopyRow label="MegaCandle pairing code" value={pairingCode} /> : null}
      </div>

      <ol className="mt-4 list-decimal space-y-2 pl-4 text-xs text-slate-600 dark:text-slate-400">
        <li>
          On your phone or PC, open <strong>MetaTrader 5</strong> and log in with server{" "}
          <strong className="font-mono">MetaQuotes-Demo</strong> and login{" "}
          <strong className="font-mono">5050581244</strong> (use the password from when you created the demo — not on this
          site).
        </li>
        <li>Wait until MT5 shows connected (online).</li>
        <li>
          On desktop MT5: attach <strong className="font-mono">TradeFXBridge.mq5</strong>, paste the pairing code, enable Algo
          Trading, allow WebRequest for your API URL.
        </li>
        <li>Trade on <strong>Live Market</strong> — orders mirror to this demo account.</li>
      </ol>

      <p className="mt-3 text-[11px] text-slate-500">
        Account type: {METAQUOTES_DEMO.accountType} · Demo deposit {METAQUOTES_DEMO.deposit} GBP (shown in MT5).
      </p>
    </UiCard>
  );
}
