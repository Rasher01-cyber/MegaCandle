import React, { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link2, Plus, RefreshCw, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { api } from "../lib/api";
import { getActiveMtAccountId, setActiveMtAccountId } from "../lib/activeMtAccount";
import { formatApiError } from "../lib/formatApiError";
import { loadMtLocalLogin, saveMtLocalLogin } from "../lib/mtLocalCredentials";
import MtLoginFields from "./MtLoginFields";
import { UiButton, UiCard } from "./ui";

type MtAccountRow = {
  id: string;
  label: string;
  platform?: string;
  brokerServer?: string | null;
  accountLogin?: string | null;
  isDefault?: boolean;
  bridgeLive?: boolean;
  balance?: number | null;
  equity?: number | null;
};

type Props = {
  bridgeLive: boolean;
  bridgeLinked: boolean;
  balance?: number | null;
  equity?: number | null;
  accountLogin?: string | null;
  brokerServer?: string | null;
  platform?: string;
  tradingAccountId?: string;
  onMessage?: (msg: string | null) => void;
};

function fmtMoney(n: number | null | undefined) {
  if (n == null || !Number.isFinite(n)) return "—";
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function MtLiveAccounts({
  bridgeLive,
  bridgeLinked,
  balance,
  equity,
  accountLogin,
  brokerServer,
  platform: platformProp,
  tradingAccountId,
  onMessage,
}: Props) {
  const qc = useQueryClient();
  const { user, isDemoWorkspace } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [platform, setPlatform] = useState<"MT5" | "MT4">("MT5");
  const [accountLoginField, setAccountLogin] = useState("");
  const [brokerServerField, setBrokerServer] = useState("");
  const [password, setPassword] = useState("");
  const [savePassword, setSavePassword] = useState(false);
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);

  const { data: accounts = [] } = useQuery({
    queryKey: ["mt5-accounts"],
    queryFn: async () => (await api.get("/api/mt5/accounts")).data.accounts as MtAccountRow[],
    staleTime: 30_000,
  });

  useEffect(() => {
    const local = loadMtLocalLogin();
    if (!local) return;
    if (local.platform === "MT4" || local.platform === "MT5") setPlatform(local.platform);
    if (local.accountLogin) setAccountLogin(local.accountLogin);
    if (local.brokerServer) setBrokerServer(local.brokerServer);
    if (local.password) setPassword(local.password);
    setSavePassword(local.savePassword);
  }, []);

  useEffect(() => {
    if (accountLogin) setAccountLogin(accountLogin);
    if (brokerServer) setBrokerServer(brokerServer);
    if (platformProp === "MT4" || platformProp === "MT5") setPlatform(platformProp);
  }, [accountLogin, brokerServer, platformProp]);

  const resetForm = () => {
    setShowForm(false);
    setEditingAccountId(null);
  };

  const connect = useMutation({
    mutationFn: async (accountId?: string) => {
      if (isDemoWorkspace || !user || user.id === "demo") {
        throw new Error("Sign in with email or Google first (not demo workspace).");
      }
      let targetId = accountId ?? editingAccountId ?? undefined;
      if (!targetId && accounts.length === 0) {
        const created = (
          await api.post("/api/mt5/accounts", {
            platform,
            brokerServer: brokerServerField.trim(),
            accountLogin: accountLoginField.trim(),
            setDefault: true,
          })
        ).data;
        targetId = created.accountId ?? created.account?.id;
      }
      return (
        await api.post("/api/mt5/connect", {
          platform,
          accountLogin: accountLoginField.trim(),
          brokerServer: brokerServerField.trim(),
          password,
          ...(targetId ? { accountId: targetId } : {}),
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
      onMessage?.((res?.message as string) ?? "Connected to MT5/MT4.");
      resetForm();
      void qc.invalidateQueries({ queryKey: ["mt5-positions"] });
      void qc.invalidateQueries({ queryKey: ["mt5-accounts"] });
    },
    onError: (err: unknown) => onMessage?.(formatApiError(err, "Connection failed")),
  });

  const refresh = useMutation({
    mutationFn: async () => (await api.post("/api/mt5/refresh")).data,
    onSuccess: (res) => {
      onMessage?.((res?.message as string) ?? "Synced with MT5.");
      void qc.invalidateQueries({ queryKey: ["mt5-positions"] });
    },
    onError: (err: unknown) => onMessage?.(formatApiError(err, "Sync failed")),
  });

  const addSlot = useMutation({
    mutationFn: async () => {
      const res = await api.post("/api/mt5/accounts", { platform, setDefault: false });
      return res.data;
    },
    onSuccess: (res) => {
      const id = res?.accountId ?? res?.account?.id;
      if (id) {
        setEditingAccountId(id);
        setShowForm(true);
      }
      onMessage?.("New account slot — enter login, password, server, then Connect.");
      void qc.invalidateQueries({ queryKey: ["mt5-accounts"] });
    },
    onError: (err: unknown) => onMessage?.(formatApiError(err, "Could not add account")),
  });

  const removeAccount = useMutation({
    mutationFn: async (id: string) => (await api.delete(`/api/mt5/accounts/${id}`)).data,
    onSuccess: (_, id) => {
      if (getActiveMtAccountId() === id) setActiveMtAccountId(null);
      onMessage?.("MT5/MT4 account removed.");
      void qc.invalidateQueries({ queryKey: ["mt5-accounts"] });
      void qc.invalidateQueries({ queryKey: ["mt5-positions"] });
    },
    onError: (err: unknown) => onMessage?.(formatApiError(err, "Could not remove account")),
  });

  const switchDefault = useMutation({
    mutationFn: async (id: string) => (await api.post(`/api/mt5/accounts/${id}/default`)).data,
    onSuccess: (_, id) => {
      setActiveMtAccountId(id);
      void qc.invalidateQueries({ queryKey: ["mt5-accounts"] });
      void qc.invalidateQueries({ queryKey: ["mt5-positions"] });
    },
  });

  const activeId = tradingAccountId ?? getActiveMtAccountId();
  const listed = accounts.filter((a) => a.accountLogin || a.brokerServer);

  return (
    <div className="space-y-3">
      {bridgeLinked ? (
        <UiCard
          className={`p-4 ${
            bridgeLive
              ? "border-emerald-500/40 bg-gradient-to-br from-emerald-500/15 to-transparent"
              : "border-amber-500/35 bg-amber-500/10"
          }`}
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Live account
              </p>
              <p className="mt-1 text-lg font-bold text-slate-900 dark:text-white">
                {platformProp ?? "MT5"} · {accountLogin ?? accountLoginField}
              </p>
              <p className="text-xs text-slate-500">{brokerServer ?? brokerServerField}</p>
            </div>
            <div className="flex gap-4 text-right">
              <div>
                <p className="text-[10px] uppercase text-slate-500">Balance</p>
                <p className="text-xl font-bold tabular-nums text-slate-900 dark:text-white">${fmtMoney(balance)}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase text-slate-500">Equity</p>
                <p
                  className={`text-xl font-bold tabular-nums ${
                    (equity ?? 0) >= (balance ?? 0) ? "text-emerald-600" : "text-rose-600"
                  }`}
                >
                  ${fmtMoney(equity)}
                </p>
              </div>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <UiButton type="button" className="!py-1.5 text-xs" onClick={() => refresh.mutate()} disabled={refresh.isPending}>
              <RefreshCw size={14} className={`mr-1 ${refresh.isPending ? "animate-spin" : ""}`} />
              Sync MT5
            </UiButton>
            <UiButton type="button" variant="ghost" className="!py-1.5 text-xs" onClick={() => setShowForm(true)}>
              <Link2 size={14} className="mr-1" />
              Reconnect
            </UiButton>
          </div>
        </UiCard>
      ) : null}

      <UiCard className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">MT5 / MT4 accounts</h3>
            <p className="text-xs text-slate-500">Add, connect, or remove broker logins.</p>
          </div>
          <div className="flex gap-2">
            <UiButton
              type="button"
              className="!py-1.5 text-xs"
              onClick={() => {
                setEditingAccountId(null);
                setShowForm(true);
              }}
              disabled={isDemoWorkspace}
            >
              <Plus size={14} className="mr-1" />
              Add account
            </UiButton>
            <UiButton type="button" variant="ghost" className="!py-1.5 text-xs" onClick={() => addSlot.mutate()} disabled={addSlot.isPending || isDemoWorkspace}>
              <Plus size={14} className="mr-1" />
              New slot
            </UiButton>
          </div>
        </div>

        {isDemoWorkspace ? (
          <p className="mt-3 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs">
            <Link to="/login" className="font-semibold underline">
              Sign in
            </Link>{" "}
            to connect a real MT5 account.
          </p>
        ) : null}

        {listed.length > 0 ? (
          <ul className="mt-3 space-y-2">
            {listed.map((acc) => {
              const isActive = acc.id === activeId || acc.isDefault;
              return (
                <li
                  key={acc.id}
                  className={`flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3 py-2.5 ${
                    isActive
                      ? "border-blue-400/50 bg-blue-50/60 dark:border-blue-500/30 dark:bg-blue-950/30"
                      : "border-slate-200 dark:border-white/10"
                  }`}
                >
                  <button type="button" className="min-w-0 flex-1 text-left" onClick={() => switchDefault.mutate(acc.id)}>
                    <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                      {acc.label || `${acc.platform} · ${acc.accountLogin}`}
                    </p>
                    <p className="truncate text-xs text-slate-500">
                      {acc.brokerServer} · Login {acc.accountLogin}
                      {acc.bridgeLive ? " · Live" : ""}
                    </p>
                  </button>
                  <div className="flex items-center gap-1">
                    <span className="text-xs tabular-nums text-slate-600 dark:text-slate-300">
                      ${fmtMoney(acc.equity ?? acc.balance)}
                    </span>
                    <UiButton
                      type="button"
                      variant="danger"
                      className="!px-2 !py-1"
                      title="Delete account"
                      onClick={() => {
                        if (
                          window.confirm(
                            `Remove MT5 account ${acc.accountLogin ?? acc.label}? This disconnects it from MegaCandle.`,
                          )
                        ) {
                          removeAccount.mutate(acc.id);
                        }
                      }}
                      disabled={removeAccount.isPending}
                    >
                      <Trash2 size={14} />
                    </UiButton>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-3 text-xs text-slate-500">No saved accounts yet.</p>
        )}

        {showForm ? (
          <div className="mt-4 rounded-xl border border-blue-500/25 bg-blue-500/5 p-4">
            <div className="mb-3 flex gap-2">
              {(["MT5", "MT4"] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPlatform(p)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold ${
                    platform === p ? "bg-blue-600 text-white" : "border border-slate-200 dark:border-white/15"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
            <MtLoginFields
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
            <div className="mt-3 flex flex-wrap gap-2">
              <UiButton
                type="button"
                onClick={() => connect.mutate(editingAccountId ?? undefined)}
                disabled={
                  connect.isPending ||
                  !accountLoginField.trim() ||
                  !brokerServerField.trim() ||
                  !password
                }
              >
                <Link2 size={14} className="mr-1" />
                {connect.isPending ? "Connecting…" : "Connect account"}
              </UiButton>
              <UiButton type="button" variant="ghost" onClick={resetForm}>
                Cancel
              </UiButton>
            </div>
          </div>
        ) : !bridgeLinked ? (
          <UiButton
            type="button"
            className="mt-3 w-full sm:w-auto"
            onClick={() => setShowForm(true)}
            disabled={isDemoWorkspace}
          >
            <Link2 size={14} className="mr-1" />
            Connect MT5 / MT4
          </UiButton>
        ) : null}
      </UiCard>
    </div>
  );
}