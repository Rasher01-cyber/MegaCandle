import React, { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link2, Radio, RefreshCw } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { api } from "../lib/api";
import { loadMtLocalLogin, saveMtLocalLogin } from "../lib/mtLocalCredentials";
import { setActiveMtAccountId } from "../lib/activeMtAccount";
import { formatApiError } from "../lib/formatApiError";
import MtLoginFields from "./MtLoginFields";
import { UiButton, UiCard } from "./ui";

type Props = {
  bridgeLive: boolean;
  bridgeLinked: boolean;
  directConnect?: boolean;
  bridgePairingCode?: string | null;
  accountLogin?: string | null;
  brokerServer?: string | null;
  platform?: string;
  balance?: number | null;
  equity?: number | null;
};

export default function MtDirectConnect({
  bridgeLive,
  bridgeLinked,
  directConnect = false,
  bridgePairingCode,
  accountLogin,
  brokerServer,
  platform: platformProp,
  balance,
  equity,
}: Props) {
  const qc = useQueryClient();
  const { user, loading: authLoading, isDemoWorkspace } = useAuth();
  const [platform, setPlatform] = useState<"MT5" | "MT4">("MT5");
  const [accountLoginField, setAccountLogin] = useState("");
  const [brokerServerField, setBrokerServer] = useState("");
  const [password, setPassword] = useState("");
  const [savePassword, setSavePassword] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

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
    if (accountLogin) setAccountLogin(accountLogin);
    if (brokerServer) setBrokerServer(brokerServer);
    if (platformProp === "MT4" || platformProp === "MT5") setPlatform(platformProp);
  }, [accountLogin, brokerServer, platformProp]);

  const connect = useMutation({
    mutationFn: async () => {
      if (isDemoWorkspace || !user || user.id === "demo") {
        throw new Error("Sign in with email or Google first (not demo workspace).");
      }
      return (
        await api.post("/api/mt5/connect", {
          platform,
          accountLogin: accountLoginField.trim(),
          brokerServer: brokerServerField.trim(),
          password,
        })
      ).data;
    },
    onSuccess: (res) => {
      saveMtLocalLogin({
        platform,
        accountLogin: accountLoginField.trim(),
        brokerServer: brokerServerField.trim(),
        password,
        savePassword,
      });
      const id = res?.tradingAccountId ?? res?.activeAccountId;
      if (id) setActiveMtAccountId(id);
      setMsg((res?.message as string) ?? "Connected to MT5/MT4.");
      void qc.invalidateQueries({ queryKey: ["mt5-positions"] });
    },
    onError: (err: unknown) => setMsg(formatApiError(err, "Connection failed")),
  });

  const refresh = useMutation({
    mutationFn: async () => (await api.post("/api/mt5/refresh")).data,
    onSuccess: (res) => {
      setMsg((res?.message as string) ?? "Synced with MT5.");
      void qc.invalidateQueries({ queryKey: ["mt5-positions"] });
    },
    onError: (err: unknown) => setMsg(formatApiError(err, "Sync failed")),
  });

  if (bridgeLive && bridgeLinked) {
    return (
      <UiCard className="border-emerald-500/35 bg-emerald-500/10 p-4">
        <p className="flex items-center gap-2 text-sm font-semibold text-emerald-900 dark:text-emerald-100">
          <Radio size={18} className="text-emerald-500" />
          MT5 connected · Login {accountLogin ?? accountLoginField}
        </p>
        <p className="mt-1 text-xs text-emerald-800/90 dark:text-emerald-200/90">
          Balance ${(balance ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })} · Equity $
          {(equity ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })} — trades sync with your MT5
          terminal.
        </p>
      </UiCard>
    );
  }

  if (bridgeLinked && !bridgeLive) {
    return (
      <UiCard className="border-amber-500/35 bg-amber-500/10 p-5">
        <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">
          Credentials saved · connecting to MT5…
        </p>
        <p className="mt-1 text-xs text-amber-800/90 dark:text-amber-200/90">
          <strong>Keep MetaTrader 5 open</strong> on this computer (login {accountLogin ?? accountLoginField},{" "}
          {brokerServer ?? brokerServerField}), then click <strong>Sync from MT5</strong>.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <UiButton type="button" onClick={() => refresh.mutate()} disabled={refresh.isPending}>
            <RefreshCw size={14} className={`mr-1 ${refresh.isPending ? "animate-spin" : ""}`} />
            {refresh.isPending ? "Syncing…" : "Sync from MT5"}
          </UiButton>
          <UiButton type="button" variant="ghost" onClick={() => connect.mutate()} disabled={connect.isPending}>
            Retry connection
          </UiButton>
        </div>
        {!directConnect && bridgePairingCode ? (
          <details className="mt-3 text-xs text-amber-900/80 dark:text-amber-100/80">
            <summary className="cursor-pointer font-medium">Optional: EA bridge instead</summary>
            <p className="mt-2">
              Attach TradeFXBridge.mq5 · pairing <span className="font-mono">{bridgePairingCode}</span> · ApiBaseUrl{" "}
              <span className="font-mono">http://localhost:4000</span>
            </p>
          </details>
        ) : null}
        {msg ? <p className="mt-2 text-xs">{msg}</p> : null}
      </UiCard>
    );
  }

  return (
    <UiCard className="border-blue-500/30 p-5">
      <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Connect MT5 / MT4</h3>
      {isDemoWorkspace ? (
        <p className="mt-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-900 dark:text-amber-100">
          <Link to="/login" className="font-semibold underline">
            Sign in
          </Link>{" "}
          with email or Google to connect your real MT5 account.
        </p>
      ) : (
        <p className="mt-1 text-xs text-slate-500">
          Enter the same login, password, and server as MetaTrader. Keep MT5 open on this PC.
        </p>
      )}

      <div className="mt-3 flex gap-2">
        {(["MT5", "MT4"] as const).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setPlatform(p)}
            className={`rounded-lg px-4 py-2 text-xs font-bold ${
              platform === p ? "bg-blue-600 text-white" : "border border-slate-200 dark:border-white/15"
            }`}
          >
            {p}
          </button>
        ))}
      </div>

      <MtLoginFields
        className="mt-4"
        accountLogin={accountLoginField}
        brokerServer={brokerServerField}
        password={password}
        savePassword={savePassword}
        onChange={(patch) => {
          if (patch.accountLogin !== undefined) setAccountLogin(patch.accountLogin);
          if (patch.brokerServer !== undefined) setBrokerServer(patch.brokerServer);
          if (patch.password !== undefined) setPassword(patch.password);
          if (patch.savePassword !== undefined) setSavePassword(patch.savePassword);
        }}
      />

      <UiButton
        type="button"
        className="mt-4 w-full sm:w-auto"
        onClick={() => connect.mutate()}
        disabled={
          authLoading ||
          isDemoWorkspace ||
          !user ||
          connect.isPending ||
          !accountLoginField.trim() ||
          !brokerServerField.trim() ||
          !password
        }
      >
        <Link2 size={14} className="mr-1" />
        {connect.isPending ? "Connecting…" : "Connect account"}
      </UiButton>

      {msg ? <p className="mt-3 text-xs text-slate-600 dark:text-slate-300">{msg}</p> : null}
    </UiCard>
  );
}
