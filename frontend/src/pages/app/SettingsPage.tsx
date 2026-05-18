import React, { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Crown,
  Eye,
  EyeOff,
  Globe2,
  Laptop,
  Pencil,
  Sparkles,
  Zap,
} from "lucide-react";
import { useAuth } from "../../auth/AuthProvider";
import { useTheme } from "../../theme/ThemeProvider";
import { useSubscription } from "../../hooks/useSubscription";
import { api } from "../../lib/api";
import { loadUserPrefs, saveUserPrefs, type UserPrefs } from "../../lib/userSettings";
import { UiBadge, UiButton, UiCard, UiSkeleton } from "../../components/ui";
import { useQuery } from "@tanstack/react-query";
import MtAccountsManager from "../../components/MtAccountsManager";
import MtDirectConnect from "../../components/MtDirectConnect";

type TabId = "profile" | "mt" | "settings" | "billing" | "security";

type DeviceSession = {
  id: string;
  deviceLabel: string | null;
  lastActiveAt: string;
  revoked: boolean;
  expiresAt: string;
};

export default function SettingsPage() {
  return <SettingsInner />;
}

function cardShell(className = "") {
  return `rounded-2xl border border-slate-200/90 bg-white shadow-sm dark:border-white/[0.08] dark:bg-[#12151c] dark:shadow-none ${className}`;
}

function PlanBadge({ tier }: { tier: "free" | "pro" | "elite" }) {
  if (tier === "elite") {
    return (
      <span className="rounded-md bg-violet-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-violet-700 dark:bg-violet-500/20 dark:text-violet-200">
        Elite
      </span>
    );
  }
  if (tier === "pro") {
    return (
      <span className="rounded-md bg-blue-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-blue-700 dark:bg-blue-500/20 dark:text-blue-200">
        Pro
      </span>
    );
  }
  return (
    <span className="rounded-md bg-slate-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-600 dark:bg-slate-700 dark:text-slate-300">
      Free
    </span>
  );
}

function ToggleRow({
  title,
  description,
  checked,
  onChange,
  disabled,
  badge,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  badge?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 py-4 last:border-0 dark:border-white/[0.06]">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium text-slate-900 dark:text-white">{title}</span>
          {badge}
        </div>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
          disabled ? "cursor-not-allowed opacity-45" : "cursor-pointer"
        } ${checked ? "bg-blue-600" : "bg-slate-300 dark:bg-slate-600"}`}
      >
        <span
          className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${
            checked ? "left-[calc(100%-1.625rem)]" : "left-0.5"
          }`}
        />
      </button>
    </div>
  );
}

function SectionCard({
  icon,
  title,
  subtitle,
  children,
  iconClass = "text-blue-500",
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  children: React.ReactNode;
  iconClass?: string;
}) {
  return (
    <div className={cardShell("p-5 sm:p-6")}>
      <div className="flex gap-3">
        <div className={`mt-0.5 shrink-0 ${iconClass}`}>{icon}</div>
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">{title}</h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>
          <div className="mt-2">{children}</div>
        </div>
      </div>
    </div>
  );
}

function SettingsInner() {
  const { user, logout } = useAuth();
  const sub = useSubscription();
  const { theme, setTheme } = useTheme();
  const [tab, setTab] = useState<TabId>("profile");
  const [prefs, setPrefs] = useState<UserPrefs>(() => loadUserPrefs());
  const [devices, setDevices] = useState<DeviceSession[]>([]);
  const [devicesLoading, setDevicesLoading] = useState(true);
  const [revokeLoading, setRevokeLoading] = useState<string | null>(null);
  const [dangerOpen, setDangerOpen] = useState(false);

  useEffect(() => {
    saveUserPrefs(prefs);
  }, [prefs]);

  const loadDevices = async () => {
    try {
      const res = await api.get("/api/sessions");
      setDevices(res.data.sessions);
    } finally {
      setDevicesLoading(false);
    }
  };

  useEffect(() => {
    if (tab === "security") loadDevices();
  }, [tab]);

  const revoke = async (id: string) => {
    setRevokeLoading(id);
    try {
      await api.delete(`/api/sessions/${id}`);
      await loadDevices();
    } finally {
      setRevokeLoading(null);
    }
  };

  const handle = useMemo(() => {
    const e = user?.email ?? "user";
    const local = e.split("@")[0] ?? "user";
    return `@${local.replace(/[^a-zA-Z0-9_]/g, "")}`;
  }, [user?.email]);

  const initials = useMemo(() => {
    const n = user?.name?.trim() || user?.email || "?";
    const parts = n.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return n.slice(0, 2).toUpperCase();
  }, [user?.name, user?.email]);

  const headerDate = useMemo(
    () =>
      new Date().toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
      }),
    [],
  );

  const setPref = <K extends keyof UserPrefs>(key: K, value: UserPrefs[K]) => {
    setPrefs((p) => ({ ...p, [key]: value }));
  };

  const tabs: { id: TabId; label: string }[] = [
    { id: "profile", label: "Profile" },
    { id: "mt", label: "MT5/MT4" },
    { id: "settings", label: "Settings" },
    { id: "billing", label: "Billing" },
    { id: "security", label: "Security" },
  ];

  const isDark = theme === "dark";

  return (
    <section className="mx-auto max-w-4xl space-y-6 pb-10">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">Settings</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{headerDate}</p>
      </div>

      <div className={cardShell("relative overflow-hidden p-5 sm:p-6")}>
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <div className="relative">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-cyan-600 text-lg font-bold text-white shadow-lg">
                {user?.picture ? (
                  <img src={user.picture} alt="" className="h-full w-full rounded-full object-cover" />
                ) : (
                  initials
                )}
              </div>
              <span className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-blue-600 text-white dark:border-[#12151c]">
                <Pencil size={12} />
              </span>
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="truncate text-lg font-semibold text-slate-900 dark:text-white">{user?.name || "Trader"}</span>
                <PlanBadge tier={sub.tier} />
              </div>
              <div className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{handle}</div>
              <div className="mt-1 text-xs text-slate-400 dark:text-slate-500">Joined {new Date().getFullYear()}</div>
            </div>
          </div>
          <UiButton variant="ghost" className="shrink-0 border border-slate-200 dark:border-white/10" onClick={() => setTab("profile")}>
            Edit Profile
          </UiButton>
        </div>
      </div>

      <div className="flex flex-wrap gap-1 rounded-xl border border-slate-200 bg-slate-100/80 p-1 dark:border-white/[0.12] dark:bg-[#0a0d12]">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`shrink-0 rounded-lg px-3 py-2 text-sm font-medium transition sm:px-4 ${
              tab === t.id
                ? "bg-white text-blue-700 shadow-sm ring-1 ring-slate-200/80 dark:bg-blue-600 dark:text-white dark:ring-blue-500/40"
                : "text-slate-700 hover:bg-white/60 hover:text-slate-900 dark:text-slate-200 dark:hover:bg-white/[0.06] dark:hover:text-white"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "profile" ? (
        <div className="space-y-5">
          <UiCard className={cardShell("p-5 sm:p-6")}>
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">Public profile</h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Basics shown on your workspace. More profile fields ship in a later release.</p>
            <div className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Display name</label>
                <div className="mt-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 dark:border-white/10 dark:bg-black/20 dark:text-slate-200">
                  {user?.name || "—"}
                </div>
              </div>
              <div>
                <label className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Email</label>
                <div className="mt-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 dark:border-white/10 dark:bg-black/20 dark:text-slate-200">
                  {user?.email}
                </div>
              </div>
            </div>
          </UiCard>

          <SectionCard
            icon={<Eye size={20} />}
            title="Privacy"
            subtitle="Control what other traders can see on your public profile."
            iconClass="text-blue-500"
          >
            <ToggleRow
              title="Profile Visibility"
              description="Your profile is public. Free users default to public."
              checked={prefs.profilePublic}
              onChange={(v) => setPref("profilePublic", v)}
            />
            <ToggleRow
              title="Show on Leaderboard"
              description="Appear in the public trading leaderboard."
              checked={prefs.showLeaderboard}
              onChange={(v) => setPref("showLeaderboard", v)}
            />
            <ToggleRow
              title="Show Trades"
              description="Let others see your individual trades."
              checked={prefs.showTrades}
              onChange={(v) => setPref("showTrades", v)}
            />
            <ToggleRow
              title="Show P&L Per Trade"
              description="Display profit and loss on shared trade cards."
              checked={prefs.showPnlPerTrade}
              onChange={(v) => setPref("showPnlPerTrade", v)}
            />
          </SectionCard>
        </div>
      ) : null}

      {tab === "mt" ? <MtSettingsTab cardShell={cardShell} /> : null}

      {tab === "settings" ? (
        <div className="space-y-5">
          <SectionCard
            icon={<Sparkles size={20} />}
            title="Appearance"
            subtitle="Theme and sensitive-info visibility."
            iconClass="text-blue-500"
          >
            <ToggleRow
              title="Dark Mode"
              description="Use the dark theme (recommended for long sessions)."
              checked={isDark}
              onChange={(v) => setTheme(v ? "dark" : "light")}
            />
            <div className="flex items-start justify-between gap-4 border-t border-slate-100 pt-4 dark:border-white/[0.06]">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-slate-900 dark:text-white">Streamer Mode</span>
                  <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-amber-900 dark:bg-amber-500/20 dark:text-amber-200">
                    <Crown size={10} /> Pro
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Hide sensitive balances in overlays and recordings.</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={prefs.streamerMode}
                disabled={!sub.hasAiReports}
                onClick={() => sub.hasAiReports && setPref("streamerMode", !prefs.streamerMode)}
                className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
                  !sub.hasAiReports ? "cursor-not-allowed opacity-45" : "cursor-pointer"
                } ${prefs.streamerMode ? "bg-blue-600" : "bg-slate-300 dark:bg-slate-600"}`}
              >
                <span
                  className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${
                    prefs.streamerMode ? "left-[calc(100%-1.625rem)]" : "left-0.5"
                  }`}
                />
              </button>
            </div>
          </SectionCard>

          <SectionCard
            icon={<Zap size={20} />}
            title="Notifications"
            subtitle="Decide which alerts reach your device."
            iconClass="text-blue-500"
          >
            <ToggleRow
              title="Push Notifications"
              description="Receive browser notifications."
              checked={prefs.pushNotifications}
              onChange={(v) => setPref("pushNotifications", v)}
            />
            <ToggleRow
              title="Trade Alerts"
              description="Get notified when trades close."
              checked={prefs.tradeAlerts}
              onChange={(v) => setPref("tradeAlerts", v)}
            />
            <div className="flex items-start justify-between gap-4 border-t border-slate-100 py-4 dark:border-white/[0.06]">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-slate-900 dark:text-white">Weekly Report</span>
                  <span className="rounded bg-orange-500/15 px-1.5 py-0.5 text-[10px] font-bold uppercase text-orange-700 dark:text-orange-300">
                    Soon
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Receive weekly performance summary.</p>
              </div>
              <button
                type="button"
                disabled
                className="relative h-7 w-12 shrink-0 cursor-not-allowed rounded-full bg-slate-300 opacity-50 dark:bg-slate-600"
                aria-disabled
              >
                <span className="absolute left-0.5 top-0.5 h-6 w-6 rounded-full bg-white shadow" />
              </button>
            </div>
          </SectionCard>

          <SectionCard
            icon={<Globe2 size={20} />}
            title="Currency & Timezone"
            subtitle="Values render using your account currency — symbol is display only."
            iconClass="text-blue-500"
          >
            <div className="space-y-4 border-t border-slate-100 pt-4 first:border-0 first:pt-0 dark:border-white/[0.06]">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="font-medium text-slate-900 dark:text-white">Currency</div>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Display symbol only — P&amp;L values remain in your account currency.</p>
                </div>
                <select
                  value={prefs.currency}
                  onChange={(e) => setPref("currency", e.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 sm:mt-0 sm:w-48 dark:border-white/10 dark:bg-black/30 dark:text-white"
                >
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                </select>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="font-medium text-slate-900 dark:text-white">Timezone</div>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Used to display trade timestamps across the app.</p>
                </div>
                <select
                  value={prefs.timezone}
                  onChange={(e) => setPref("timezone", e.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 sm:mt-0 sm:w-48 dark:border-white/10 dark:bg-black/30 dark:text-white"
                >
                  <option value="UTC">UTC</option>
                  <option value="America/New_York">America / New York</option>
                  <option value="Europe/London">Europe / London</option>
                  <option value="Asia/Dubai">Asia / Dubai</option>
                  <option value="Asia/Kolkata">Asia / Kolkata</option>
                </select>
              </div>
            </div>
          </SectionCard>

          <div className="grid gap-5 md:grid-cols-2">
            <SectionCard
              icon={<EyeOff size={20} />}
              title="Dismissed Notifications"
              subtitle="Restore notifications you've hidden."
              iconClass="text-blue-500"
            >
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 py-10 text-center dark:border-white/10 dark:bg-black/20">
                <p className="font-semibold text-slate-800 dark:text-slate-200">All clear</p>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">No dismissed notifications</p>
              </div>
            </SectionCard>

            <div className={cardShell("p-5 sm:p-6")}>
              <div className="flex gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-500" />
                <div className="min-w-0 flex-1">
                  <h3 className="text-base font-semibold text-rose-600 dark:text-rose-400">Danger Zone</h3>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Permanent actions. These cannot be undone.</p>
                  <div className="mt-4 flex flex-col gap-3 rounded-xl border border-rose-200/80 bg-rose-50/50 p-4 dark:border-rose-500/20 dark:bg-rose-950/20">
                    <div>
                      <div className="font-medium text-slate-900 dark:text-white">Clear All Trading Data</div>
                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        Permanently delete all trades, journal entries, and performance snapshots.
                      </p>
                    </div>
                    <div className="flex justify-end">
                      <UiButton variant="danger" className="gap-1.5" onClick={() => setDangerOpen(true)}>
                        <AlertTriangle size={14} />
                        Clear
                      </UiButton>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {tab === "billing" ? (
        <UiCard className={cardShell("p-5 sm:p-6")}>
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">Billing &amp; plan</h3>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            You are on <span className="font-semibold text-slate-800 dark:text-slate-200">{sub.tier}</span>
            {sub.billing ? (
              <>
                {" "}
                · billed <span className="font-medium">{sub.billing}</span>
              </>
            ) : null}
            . Upgrade for AI Reports (Pro+) and Backtesting (Elite).
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <UiButton href="/app/membership" variant="primary">
              Manage subscription
            </UiButton>
            <UiButton href="/app/membership?plan=pro&billing=yearly" variant="ghost">
              Compare Pro vs Elite
            </UiButton>
          </div>
        </UiCard>
      ) : null}

      {tab === "security" ? (
        <div className="space-y-5">
          <UiCard className={cardShell("p-5 sm:p-6")}>
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">Active sessions</h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Devices signed into your MegaCandle account. Revoke anything you don&apos;t recognize.</p>
            <div className="mt-4 space-y-3">
              {devicesLoading ? (
                <>
                  <UiSkeleton className="h-14 w-full" />
                  <UiSkeleton className="h-14 w-full" />
                </>
              ) : (
                devices.map((d) => (
                  <div
                    key={d.id}
                    className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50/80 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-white/10 dark:bg-black/25"
                  >
                    <div className="min-w-0">
                      <div className="inline-flex items-center gap-2 font-semibold text-slate-900 dark:text-white">
                        <Laptop size={14} className="text-slate-400" />
                        <span className="truncate">{d.deviceLabel ?? "Unknown device"}</span>
                      </div>
                      <div className="mt-1">
                        <UiBadge className={d.revoked ? "border-rose-300/30 bg-rose-500/10 text-rose-700 dark:text-rose-200" : ""}>
                          {d.revoked ? "Revoked" : "Active"}
                        </UiBadge>
                      </div>
                      <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                        Last active: {new Date(d.lastActiveAt).toLocaleString()}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">Expires: {new Date(d.expiresAt).toLocaleString()}</div>
                    </div>
                    <UiButton disabled={d.revoked} onClick={() => revoke(d.id)} variant="danger">
                      {revokeLoading === d.id ? "Revoking..." : d.revoked ? "Revoked" : "Revoke"}
                    </UiButton>
                  </div>
                ))
              )}
            </div>
          </UiCard>

          <UiCard className={cardShell("p-5 sm:p-6")}>
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">Session</h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Sign out on this device.</p>
            <UiButton className="mt-4" variant="ghost" onClick={logout}>
              Log out
            </UiButton>
          </UiCard>
        </div>
      ) : null}

      {dangerOpen ? (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
          <UiCard className="max-w-md p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Not available in this build</h3>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Bulk deleting all trades from Settings is not wired to the API yet. Delete trades individually from the Trades page, or contact support for a full
              account reset.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <UiButton variant="ghost" onClick={() => setDangerOpen(false)}>
                Close
              </UiButton>
            </div>
          </UiCard>
        </div>
      ) : null}
    </section>
  );
}

function MtSettingsTab({ cardShell }: { cardShell: (extra?: string) => string }) {
  const { data } = useQuery({
    queryKey: ["mt5-positions"],
    queryFn: async () => (await api.get("/api/mt5/positions")).data,
    staleTime: 2000,
  });

  const bridgeLive = Boolean(data?.bridgeLive);
  const bridgeLinked = Boolean(data?.bridgeLinked);
  const broker = data?.bridgeBroker as {
    platform?: string;
    accountLogin?: string;
    brokerServer?: string;
  } | undefined;
  const account = data?.account as { balance?: number; equity?: number } | undefined;

  return (
    <div className="space-y-4">
      <MtDirectConnect
        bridgeLive={bridgeLive}
        bridgeLinked={bridgeLinked}
        directConnect={Boolean(data?.directConnect)}
        bridgePairingCode={(data?.bridgePairingCode as string | null) ?? null}
        accountLogin={broker?.accountLogin}
        brokerServer={broker?.brokerServer}
        platform={broker?.platform}
        balance={account?.balance}
        equity={account?.equity}
      />
      <MtAccountsManager />
      <UiCard className={cardShell("p-5 sm:p-6")}>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Connect with your <strong className="text-slate-800 dark:text-slate-200">MT5/MT4 login, password, and server</strong>.
          Trades from Live Market execute on your broker account only.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <UiButton href="/app/live-market" variant="primary">
            Open Live Market
          </UiButton>
        </div>
      </UiCard>
    </div>
  );
}
