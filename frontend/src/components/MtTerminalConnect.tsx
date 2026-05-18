import React, { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Copy, Link2, Radio } from "lucide-react";
import { api } from "../lib/api";
import { loadMtLocalLogin, saveMtLocalLogin } from "../lib/mtLocalCredentials";
import MtLoginFields from "./MtLoginFields";
import { UiButton, UiCard } from "./ui";

type MtPlatform = "MT5" | "MT4";

async function copyText(value: string) {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    return false;
  }
}

function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  if (!value || value === "—") return null;

  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-white/10 dark:bg-black/30">
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
        <p className="truncate font-mono text-sm font-medium text-slate-900 dark:text-white">{value}</p>
      </div>
      <button
        type="button"
        onClick={() => {
          void copyText(value).then((ok) => {
            if (ok) {
              setCopied(true);
              window.setTimeout(() => setCopied(false), 2000);
            }
          });
        }}
        className="shrink-0 rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 dark:border-white/15 dark:text-slate-300 dark:hover:bg-white/5"
      >
        {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
      </button>
    </div>
  );
}

export default function MtTerminalConnect({ pairingCode, compact = false }: { pairingCode?: string | null; compact?: boolean }) {
  const qc = useQueryClient();
  const [platform, setPlatform] = useState<MtPlatform>("MT5");
  const [brokerName, setBrokerName] = useState("");
  const [brokerServer, setBrokerServer] = useState("");
  const [accountLogin, setAccountLogin] = useState("");
  const [password, setPassword] = useState("");
  const [savePassword, setSavePassword] = useState(false);
  const [saved, setSaved] = useState(false);

  const { data: bridge } = useQuery({
    queryKey: ["mt5-bridge"],
    queryFn: async () => (await api.get("/api/mt5/bridge")).data,
    staleTime: 60_000,
    refetchInterval: false,
  });

  const { data: accounts } = useQuery({
    queryKey: ["mt5-accounts"],
    queryFn: async () => (await api.get("/api/mt5/accounts")).data.accounts as Array<{
      isHosted?: boolean;
      isDefault?: boolean;
      platform?: string;
      brokerName?: string | null;
      brokerServer?: string | null;
      accountLogin?: string | null;
    }>,
  });

  useEffect(() => {
    const local = loadMtLocalLogin();
    if (local) {
      if (local.platform === "MT4" || local.platform === "MT5") setPlatform(local.platform);
      if (local.accountLogin) setAccountLogin(local.accountLogin);
      if (local.brokerServer) setBrokerServer(local.brokerServer);
      if (local.password) setPassword(local.password);
      setSavePassword(local.savePassword);
    }
  }, []);

  useEffect(() => {
    const acc =
      accounts?.find((a) => !a.isHosted && a.isDefault) ??
      accounts?.find((a) => !a.isHosted && a.accountLogin) ??
      null;
    const src = acc ?? bridge;
    if (!src) return;
    if (src.platform === "MT4" || src.platform === "MT5") setPlatform(src.platform);
    if (src.brokerName && src.brokerName !== "Your MT5 Terminal") setBrokerName(src.brokerName);
    if (src.brokerServer) setBrokerServer(src.brokerServer);
    if (src.accountLogin) setAccountLogin(src.accountLogin);
  }, [bridge, accounts]);

  const saveBroker = useMutation({
    mutationFn: async () =>
      (
        await api.patch("/api/mt5/bridge/broker", {
          platform,
          brokerName: brokerName.trim() || undefined,
          brokerServer: brokerServer.trim(),
          accountLogin: accountLogin.trim(),
        })
      ).data,
    onSuccess: () => {
      saveMtLocalLogin({
        platform,
        accountLogin: accountLogin.trim(),
        brokerServer: brokerServer.trim(),
        password,
        savePassword,
      });
      setSaved(true);
      qc.invalidateQueries({ queryKey: ["mt5-bridge"] });
      qc.invalidateQueries({ queryKey: ["mt5-positions"] });
      window.setTimeout(() => setSaved(false), 2500);
    },
  });

  const code = pairingCode ?? bridge?.pairingCode ?? "";
  const bridgeLive = Boolean(bridge?.bridgeLive);
  const bridgeConfigured = Boolean(bridge?.bridgeConfigured);
  const eaFile = platform === "MT4" ? "TradeFXBridge.mq4" : "TradeFXBridge.mq5";
  const eaFolder = platform === "MT4" ? "mt4/" : "mt5/";
  const terminalName = platform === "MT4" ? "MetaTrader 4" : "MetaTrader 5";

  return (
    <UiCard className={`border-blue-500/25 bg-gradient-to-br from-blue-500/8 to-transparent ${compact ? "p-4" : "p-5"}`}>
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-blue-500/15 p-2 text-blue-600 dark:text-blue-300">
          <Link2 size={20} />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Login to trade account (MT5 / MT4)</h3>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
            Same fields as MetaTrader: Login, Password, and Server. Then open {terminalName}, log in with these details,
            attach the MegaCandle bridge EA, and trade from this website.
          </p>
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        {(["MT5", "MT4"] as const).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setPlatform(p)}
            className={`rounded-lg px-4 py-2 text-xs font-bold ${
              platform === p ? "bg-blue-600 text-white" : "border border-slate-200 bg-white dark:border-white/15 dark:bg-black/30"
            }`}
          >
            {p}
          </button>
        ))}
      </div>

      <MtLoginFields
        className="mt-4"
        accountLogin={accountLogin}
        brokerServer={brokerServer}
        password={password}
        savePassword={savePassword}
        onChange={(patch) => {
          if (patch.accountLogin !== undefined) setAccountLogin(patch.accountLogin);
          if (patch.brokerServer !== undefined) setBrokerServer(patch.brokerServer);
          if (patch.password !== undefined) setPassword(patch.password);
          if (patch.savePassword !== undefined) setSavePassword(patch.savePassword);
        }}
      />

      <label className="mt-3 block text-xs font-medium text-slate-600 dark:text-slate-400">
        Broker name <span className="font-normal text-slate-400">(optional)</span>
        <input
          value={brokerName}
          onChange={(e) => setBrokerName(e.target.value)}
          placeholder="e.g. MetaQuotes, Exness"
          className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-white/15 dark:bg-[#0d1118] dark:text-white"
        />
      </label>

      <div className="mt-3 flex flex-wrap gap-2">
        <UiButton
          type="button"
          className="!py-1.5 text-xs"
          onClick={() => saveBroker.mutate()}
          disabled={saveBroker.isPending || !brokerServer.trim() || !accountLogin.trim()}
        >
          {saved ? "Saved — log in inside MT next" : "Save login & link terminal"}
        </UiButton>
      </div>

      <div className="mt-4 space-y-2">
        {accountLogin ? <CopyField label="Login" value={accountLogin} /> : null}
        {brokerServer ? <CopyField label="Server" value={brokerServer} /> : null}
        {code ? <CopyField label="MegaCandle pairing code (EA input)" value={code} /> : null}
      </div>

      {!compact ? (
        <ol className="mt-4 list-decimal space-y-2 pl-4 text-xs text-slate-600 dark:text-slate-400">
          <li>
            Open <strong className="text-slate-800 dark:text-slate-200">{terminalName}</strong> → File → Login to Trade Account.
          </li>
          <li>
            Enter login <strong className="font-mono">{accountLogin || "—"}</strong>, password, and server{" "}
            <strong className="font-mono">{brokerServer || "—"}</strong> (same as above).
          </li>
          <li>Connection must be green (online with your broker).</li>
          <li>
            Tools → Options → Expert Advisors → allow WebRequest for your API (e.g.{" "}
            <span className="font-mono">http://localhost:4000</span>).
          </li>
          <li>
            Attach <strong className="font-mono">{eaFile}</strong> from <span className="font-mono">{eaFolder}</span>, set{" "}
            <strong>PairingCode</strong>, enable Algo Trading.
          </li>
          <li>Trade on Live Market — website and {platform} stay synced.</li>
        </ol>
      ) : null}

      {bridgeLive ? (
        <p className="mt-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs font-medium text-emerald-800 dark:text-emerald-200">
          <Radio size={14} className="mr-1 inline" />
          {platform} linked to {bridge?.brokerName ?? "your broker"} — website trades run in your terminal.
        </p>
      ) : bridgeConfigured ? (
        <p className="mt-3 rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 py-2 text-xs font-medium text-blue-900 dark:text-blue-100">
          <Check size={14} className="mr-1 inline text-blue-500" />
          Saved: {brokerServer || "server"} · login {accountLogin}. Finish login in {terminalName} + attach EA to go live.
        </p>
      ) : (
        <p className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-900 dark:text-amber-100">
          Fill the form and click Save, or use the quick-link card above.
        </p>
      )}
    </UiCard>
  );
}
