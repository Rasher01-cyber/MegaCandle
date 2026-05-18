import React, { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Copy, Plus, Star, Trash2 } from "lucide-react";
import { api } from "../lib/api";
import { getActiveMtAccountId, setActiveMtAccountId } from "../lib/activeMtAccount";
import { loadMtLocalLogin, saveMtLocalLogin } from "../lib/mtLocalCredentials";
import MtLoginFields from "./MtLoginFields";
import { UiBadge, UiButton, UiCard } from "./ui";

type MtAccountRow = {
  id: string;
  label: string;
  platform?: string;
  brokerName?: string | null;
  brokerServer?: string | null;
  accountLogin?: string | null;
  pairingCode?: string;
  isHosted?: boolean;
  isDefault?: boolean;
  bridgeLive?: boolean;
  balance?: number | null;
  equity?: number | null;
};

async function copyText(value: string) {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    return false;
  }
}

export default function MtAccountsManager() {
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [platform, setPlatform] = useState<"MT5" | "MT4">("MT5");
  const [label, setLabel] = useState("");
  const [brokerName, setBrokerName] = useState("");
  const [brokerServer, setBrokerServer] = useState("");
  const [accountLogin, setAccountLogin] = useState("");
  const [password, setPassword] = useState("");
  const [savePassword, setSavePassword] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (!showAdd) return;
    const local = loadMtLocalLogin();
    if (!local) return;
    if (local.platform === "MT4" || local.platform === "MT5") setPlatform(local.platform);
    if (local.accountLogin) setAccountLogin(local.accountLogin);
    if (local.brokerServer) setBrokerServer(local.brokerServer);
    if (local.password) setPassword(local.password);
    setSavePassword(local.savePassword);
  }, [showAdd]);

  const { data, isLoading } = useQuery({
    queryKey: ["mt5-accounts"],
    queryFn: async () => (await api.get("/api/mt5/accounts")).data.accounts as MtAccountRow[],
  });

  const accounts = data ?? [];
  const bridgeAccounts = accounts.filter((a) => !a.isHosted);
  const activeId = getActiveMtAccountId();

  const addAccount = useMutation({
    mutationFn: async () =>
      (
        await api.post("/api/mt5/accounts", {
          label: label.trim() || undefined,
          platform,
          brokerName: brokerName.trim() || undefined,
          brokerServer: brokerServer.trim() || undefined,
          accountLogin: accountLogin.trim() || undefined,
          setDefault: bridgeAccounts.length === 0,
        })
      ).data,
    onSuccess: (res) => {
      const id = res?.account?.id as string | undefined;
      if (id) setActiveMtAccountId(id);
      saveMtLocalLogin({
        platform,
        accountLogin: accountLogin.trim(),
        brokerServer: brokerServer.trim(),
        password,
        savePassword,
      });
      setShowAdd(false);
      setLabel("");
      setBrokerName("");
      setBrokerServer("");
      setAccountLogin("");
      setPassword("");
      setSavePassword(false);
      qc.invalidateQueries({ queryKey: ["mt5-accounts"] });
      qc.invalidateQueries({ queryKey: ["mt5-bridge"] });
      qc.invalidateQueries({ queryKey: ["mt5-positions"] });
    },
  });

  const removeAccount = useMutation({
    mutationFn: async (id: string) => (await api.delete(`/api/mt5/accounts/${id}`)).data,
    onSuccess: (_, id) => {
      if (getActiveMtAccountId() === id) setActiveMtAccountId(null);
      qc.invalidateQueries({ queryKey: ["mt5-accounts"] });
      qc.invalidateQueries({ queryKey: ["mt5-positions"] });
    },
  });

  const setDefault = useMutation({
    mutationFn: async (id: string) => (await api.post(`/api/mt5/accounts/${id}/default`)).data,
    onSuccess: (_, id) => {
      setActiveMtAccountId(id);
      qc.invalidateQueries({ queryKey: ["mt5-accounts"] });
      qc.invalidateQueries({ queryKey: ["mt5-bridge"] });
      qc.invalidateQueries({ queryKey: ["mt5-positions"] });
    },
  });

  return (
    <UiCard className="p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">MT5 / MT4 accounts</h3>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Add MT5/MT4 accounts with Login, Password, and Server — same as the MetaTrader login dialog.
          </p>
        </div>
        <UiButton type="button" className="!py-1.5 text-xs" onClick={() => setShowAdd((v) => !v)}>
          <Plus size={14} className="mr-1" />
          Add account
        </UiButton>
      </div>

      <p className="mt-3 rounded-lg border border-blue-500/25 bg-blue-500/5 px-3 py-2 text-xs text-blue-900 dark:text-blue-200">
        Login and server are saved to your MegaCandle account. Password is optional on this device only — never sent to our
        servers. You still log in inside MT5/MT4 to connect live trading.
      </p>

      {showAdd ? (
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
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
              Label (optional)
              <input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-white/15 dark:bg-[#0d1118] dark:text-white"
              />
            </label>
            <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
              Broker name (optional)
              <input
                value={brokerName}
                onChange={(e) => setBrokerName(e.target.value)}
                placeholder="e.g. MetaQuotes"
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-white/15 dark:bg-[#0d1118] dark:text-white"
              />
            </label>
          </div>
          <div className="mt-3 flex gap-2">
            <UiButton
              type="button"
              onClick={() => addAccount.mutate()}
              disabled={addAccount.isPending || !brokerServer.trim() || !accountLogin.trim()}
            >
              Save account
            </UiButton>
            <UiButton type="button" variant="ghost" onClick={() => setShowAdd(false)}>
              Cancel
            </UiButton>
          </div>
        </div>
      ) : null}

      <div className="mt-4 space-y-2">
        {isLoading ? (
          <p className="text-xs text-slate-500">Loading accounts…</p>
        ) : bridgeAccounts.length === 0 ? (
          <p className="text-xs text-slate-500">No MT5/MT4 accounts yet — click Add account.</p>
        ) : (
          bridgeAccounts.map((acc) => {
            const isActive = acc.isDefault || activeId === acc.id;
            return (
              <div
                key={acc.id}
                className={`rounded-xl border p-4 ${
                  isActive
                    ? "border-blue-400/50 bg-blue-50/50 dark:border-blue-500/30 dark:bg-blue-950/20"
                    : "border-slate-200 dark:border-white/10"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-slate-900 dark:text-white">{acc.label}</span>
                      <UiBadge>{acc.platform ?? "MT5"}</UiBadge>
                      {acc.bridgeLive ? (
                        <UiBadge className="border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200">
                          Live
                        </UiBadge>
                      ) : null}
                      {acc.isDefault ? (
                        <span className="text-[10px] font-bold uppercase text-blue-600 dark:text-blue-300">Default</span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {acc.brokerName ?? "Broker"} · {acc.brokerServer ?? "—"} · Login {acc.accountLogin ?? "—"}
                    </p>
                    {acc.pairingCode ? (
                      <p className="mt-2 font-mono text-xs font-bold tracking-wider text-amber-800 dark:text-amber-200">
                        Pairing: {acc.pairingCode}
                        <button
                          type="button"
                          className="ml-2 inline text-slate-500 hover:text-slate-800"
                          onClick={() => {
                            void copyText(acc.pairingCode!).then((ok) => {
                              if (ok) {
                                setCopiedId(acc.id);
                                window.setTimeout(() => setCopiedId(null), 2000);
                              }
                            });
                          }}
                        >
                          {copiedId === acc.id ? <Check size={12} /> : <Copy size={12} />}
                        </button>
                      </p>
                    ) : null}
                  </div>
                  <div className="flex gap-1">
                    {!acc.isDefault ? (
                      <UiButton
                        type="button"
                        variant="ghost"
                        className="!px-2 !py-1 text-xs"
                        onClick={() => setDefault.mutate(acc.id)}
                        title="Use for trading"
                      >
                        <Star size={14} />
                      </UiButton>
                    ) : null}
                    <UiButton
                      type="button"
                      variant="danger"
                      className="!px-2 !py-1 text-xs"
                      onClick={() => {
                        if (window.confirm(`Remove account ${acc.accountLogin ?? acc.label}?`)) {
                          removeAccount.mutate(acc.id);
                        }
                      }}
                      disabled={removeAccount.isPending}
                    >
                      <Trash2 size={14} />
                    </UiButton>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </UiCard>
  );
}
