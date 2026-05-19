import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Link, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { useSubscription } from "../hooks/useSubscription";
import type { LucideIcon } from "lucide-react";
import {
  Bell,
  ChartCandlestick,
  ClipboardList,
  Gauge,
  ListPlus,
  Menu,
  Plus,
  Search,
  Settings,
  Shield,
  Sparkles,
  Trophy,
  WalletCards,
  X,
} from "lucide-react";
import ThemeToggle from "./ThemeToggle";
import { useAutoMt5Connect } from "../hooks/useAutoMt5Connect";
import BrandLogo from "./BrandLogo";
import { clearNotifications, getNotifications, type AppNotification } from "../lib/notifications";
import ActivityNotificationBar from "./ActivityNotificationBar";
import PageTransition from "./PageTransition";
import { useMt5HistorySync } from "../hooks/useMt5HistorySync";

type NavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
  tierBadge?: "PRO" | "ELITE";
};

const navItems: NavItem[] = [
  { to: "/app/dashboard", label: "Dashboard", icon: Gauge },
  { to: "/app/trades", label: "Trades", icon: ClipboardList },
  { to: "/app/analytics", label: "Analytics", icon: ChartCandlestick },
  { to: "/app/watchlist", label: "Watchlist", icon: ListPlus },
  { to: "/app/alerts", label: "Alerts", icon: Bell },
  { to: "/app/ai-reports", label: "AI Reports", icon: Sparkles, tierBadge: "PRO" },
  { to: "/app/backtesting", label: "Backtesting", icon: Shield, tierBadge: "ELITE" },
  { to: "/app/leaderboard", label: "Leaderboard", icon: Trophy },
  { to: "/app/membership", label: "Membership", icon: WalletCards },
  { to: "/app/settings", label: "Settings", icon: Settings },
];

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
      <span className="rounded-md bg-blue-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-blue-700 dark:bg-blue-400/90 dark:text-blue-100">
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

function NavTierPill({ tier, onGradient }: { tier: "PRO" | "ELITE"; onGradient?: boolean }) {
  if (onGradient) {
    return (
      <span className="ml-auto shrink-0 rounded bg-white/20 px-1.5 py-0.5 text-[9px] font-bold text-white">
        {tier}
      </span>
    );
  }
  if (tier === "ELITE") {
    return (
      <span className="ml-auto shrink-0 rounded bg-violet-500/15 px-1.5 py-0.5 text-[9px] font-bold text-violet-700 dark:bg-violet-500/25 dark:text-violet-200">
        ELITE
      </span>
    );
  }
  return (
    <span className="ml-auto shrink-0 rounded bg-blue-500/15 px-1.5 py-0.5 text-[9px] font-bold text-blue-700 dark:bg-blue-500/25 dark:text-blue-200">
      PRO
    </span>
  );
}

export default function AppLayout() {
  const location = useLocation();
  const { user } = useAuth();
  const sub = useSubscription();
  useAutoMt5Connect();
  useMt5HistorySync(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [notifyOpen, setNotifyOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [clock, setClock] = useState(() => new Date());
  const searchInputRef = useRef<HTMLInputElement>(null);
  const mobileSearchInputRef = useRef<HTMLInputElement>(null);
  const searchWrapRef = useRef<HTMLDivElement>(null);
  const mobileSearchPanelRef = useRef<HTMLDivElement>(null);

  const pageTitle = navItems.find((item) => location.pathname.startsWith(item.to))?.label ?? "Workspace";
  const filteredNav = navItems.filter((item) => item.label.toLowerCase().includes(searchText.toLowerCase().trim()));

  const headerDate = clock.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  const userInitial = useMemo(() => {
    const n = user?.name?.trim() || user?.email || "?";
    return n.charAt(0).toUpperCase();
  }, [user?.name, user?.email]);

  const openCommandSearch = useCallback(() => {
    setNotifyOpen(false);
    if (typeof window !== "undefined" && window.innerWidth < 640) {
      setSearchOpen(true);
      window.setTimeout(() => mobileSearchInputRef.current?.focus(), 0);
    } else {
      window.setTimeout(() => searchInputRef.current?.focus(), 0);
    }
  }, []);

  const renderSearchHits = () => (
    <div className="max-h-56 overflow-auto py-1">
      {filteredNav.map((item) => (
        <Link
          key={item.to}
          to={item.to}
          onClick={() => {
            setSearchOpen(false);
            setSearchText("");
            setSearchFocused(false);
          }}
          className="block rounded-lg px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          {item.label}
        </Link>
      ))}
      {filteredNav.length === 0 ? <div className="px-3 py-3 text-xs text-slate-500">No matching pages</div> : null}
    </div>
  );

  useEffect(() => {
    const id = window.setInterval(() => setClock(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        openCommandSearch();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openCommandSearch]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      const inDesktop = searchWrapRef.current?.contains(t);
      const inMobile = mobileSearchPanelRef.current?.contains(t);
      if (!inDesktop && !inMobile) {
        setSearchFocused(false);
        setSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  useEffect(() => {
    setNotifications(getNotifications());
  }, [notifyOpen, location.pathname]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <div className="app-grid-bg min-h-screen text-slate-900 dark:text-white md:grid md:grid-cols-[260px_1fr]">
      <ActivityNotificationBar />
      {menuOpen && (
        <button
          className="fixed inset-0 z-30 bg-black/60 md:hidden"
          onClick={() => setMenuOpen(false)}
          aria-label="Close menu backdrop"
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-[260px] border-r border-slate-200 bg-white/80 p-4 backdrop-blur-xl transition-transform dark:border-slate-500/20 dark:bg-slate-950/95 md:static md:w-auto md:translate-x-0 ${
          menuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <BrandLogo />
        <div className="mb-4 mt-3 rounded-xl border border-slate-200 bg-white/70 p-3 dark:border-slate-600/30 dark:bg-slate-900/60">
          <div className="truncate text-sm font-semibold text-slate-900 dark:text-white">{user?.name || "Trader"}</div>
          <div className="truncate text-xs text-slate-500 dark:text-slate-400">{user?.email}</div>
          <div className="mt-2">
            <PlanBadge tier={sub.tier} />
          </div>
        </div>
        <div className="mb-4 text-xs text-slate-600 dark:text-slate-400">AI-powered trading workspace</div>
        <nav className="space-y-1">
          {navItems.map((item) => {
            const active = location.pathname === item.to || location.pathname.startsWith(`${item.to}/`);
            return (
              <motion.div key={item.to} whileHover={{ scale: 1.03 }} transition={{ type: "spring", stiffness: 400, damping: 22 }}>
              <Link
                to={item.to}
                onClick={() => setMenuOpen(false)}
                className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm ${
                  active
                    ? "bg-gradient-to-r from-blue-500 to-cyan-500 font-semibold text-white shadow-lg shadow-blue-500/20"
                    : "text-slate-700 hover:bg-slate-900/5 dark:text-white/80 dark:hover:bg-white/10"
                }`}
              >
                <item.icon size={15} className="shrink-0" />
                <span className="min-w-0 flex-1 truncate">{item.label}</span>
                {item.tierBadge ? <NavTierPill tier={item.tierBadge} onGradient={active} /> : null}
              </Link>
              </motion.div>
            );
          })}
        </nav>
        <div className="mt-8 rounded-xl border border-slate-200 bg-white/70 p-3 dark:border-slate-500/25 dark:bg-slate-900/70">
          <div className="text-xs uppercase tracking-[0.12em] text-slate-600 dark:text-slate-400">Release</div>
          <div className="mt-1 text-sm font-semibold">Core Pro v1</div>
          <p className="mt-1 text-xs text-slate-700 dark:text-slate-300">MegaCandle multi-module platform is active.</p>
        </div>
      </aside>

      <div className="relative min-w-0">
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 px-3 py-3 backdrop-blur-xl sm:px-5 dark:border-white/[0.06] dark:bg-[#0b0f14]/95">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 md:flex-nowrap">
            <div className="flex min-w-0 flex-1 items-start gap-2 sm:gap-3 md:max-w-[min(280px,40vw)]">
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                className="mt-0.5 shrink-0 rounded-lg border border-slate-300 bg-white p-1.5 text-slate-700 md:hidden dark:border-white/15 dark:bg-white/5 dark:text-white"
                aria-label="Open navigation menu"
              >
                {menuOpen ? <X size={16} /> : <Menu size={16} />}
              </button>
              <div className="min-w-0">
                <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-slate-500 dark:text-slate-500">MegaCandle</div>
                <div className="truncate text-base font-semibold leading-tight text-slate-900 dark:text-white">{pageTitle}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">{headerDate}</div>
              </div>
            </div>

            <div ref={searchWrapRef} className="order-last hidden w-full min-w-0 flex-[1.25] md:order-none md:flex md:max-w-lg md:justify-center">
              <div className="relative w-full">
                <Search className="pointer-events-none absolute left-3 top-1/2 z-[1] h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  ref={searchInputRef}
                  type="search"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  onFocus={() => setSearchFocused(true)}
                  onBlur={() => window.setTimeout(() => setSearchFocused(false), 180)}
                  placeholder="Search…"
                  autoComplete="off"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-24 text-sm text-slate-900 outline-none ring-blue-500/30 placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 dark:border-white/10 dark:bg-black/25 dark:text-white dark:placeholder:text-slate-500"
                  aria-label="Search workspace"
                />
                <div className="pointer-events-none absolute right-2 top-1/2 hidden -translate-y-1/2 items-center gap-1 sm:flex">
                  <kbd className="rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-medium text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-400">
                    Ctrl
                  </kbd>
                  <kbd className="rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-medium text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-400">
                    K
                  </kbd>
                </div>
                {searchFocused || searchText.trim().length > 0 ? (
                  <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-40 rounded-xl border border-slate-200 bg-white shadow-xl dark:border-white/10 dark:bg-[#12151c]">
                    {renderSearchHits()}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
              <button
                type="button"
                className="inline-flex rounded-xl border border-slate-300 bg-white p-2 text-slate-700 hover:bg-slate-50 md:hidden dark:border-white/15 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
                aria-label="Open search"
                onClick={() => {
                  setSearchOpen((v) => !v);
                  setNotifyOpen(false);
                  window.setTimeout(() => mobileSearchInputRef.current?.focus(), 0);
                }}
              >
                <Search size={16} />
              </button>
              <div className="flex h-9 w-[4.5rem] shrink-0 items-center justify-end gap-2 sm:w-[10.75rem]">
                <ThemeToggle className="hidden sm:inline-flex" />
                <Link
                  to="/app/trades"
                  className="hidden h-9 min-w-[5.75rem] items-center justify-center rounded-xl border border-blue-400/40 bg-blue-600 px-3 text-xs font-semibold text-white shadow-md shadow-blue-600/25 transition hover:bg-blue-500 sm:inline-flex"
                >
                  Take Trade
                </Link>
                <Link
                  to="/app/trades"
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md shadow-blue-600/25 transition hover:bg-blue-500"
                  title="Journal"
                  aria-label="Trade journal"
                >
                <Plus size={18} strokeWidth={2.5} />
              </Link>
              </div>
              <div
                className="hidden min-w-[5.5rem] tabular-nums sm:flex sm:flex-col sm:items-end sm:justify-center sm:pr-1"
                title="Local time"
              >
                <span className="text-xs font-semibold leading-none text-slate-800 dark:text-slate-100">
                  {clock.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit", second: "2-digit" })}
                </span>
                <span className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-500">Local</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setNotifyOpen((v) => !v);
                  setSearchOpen(false);
                  setSearchFocused(false);
                }}
                className="rounded-xl border border-slate-300 bg-white p-2 text-slate-700 hover:bg-slate-50 dark:border-white/15 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
                aria-label="Notifications"
              >
                <Bell size={16} />
              </button>
              <div className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-gradient-to-br from-blue-600 to-cyan-600 text-sm font-bold text-white sm:flex dark:border-white/10">
                {userInitial}
              </div>
              <div className="hidden max-w-[min(160px,28vw)] truncate rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 lg:flex dark:border-white/10 dark:bg-white/5 dark:text-slate-200">
                <span className="truncate">{user?.email}</span>
              </div>
              <div className="hidden lg:block">
                <PlanBadge tier={sub.tier} />
              </div>
            </div>
          </div>

          {searchOpen ? (
            <div
              ref={mobileSearchPanelRef}
              className="border-t border-slate-100 pt-3 md:hidden dark:border-white/[0.06]"
            >
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 z-[1] h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  ref={mobileSearchInputRef}
                  type="search"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  placeholder="Search…"
                  autoComplete="off"
                  autoFocus
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm text-slate-900 outline-none focus:border-blue-500 dark:border-white/10 dark:bg-black/25 dark:text-white"
                  aria-label="Search workspace"
                />
              </div>
              <div className="mt-2 max-h-48 overflow-auto rounded-xl border border-slate-200 bg-white dark:border-white/10 dark:bg-[#12151c]">
                {renderSearchHits()}
              </div>
            </div>
          ) : null}
        </header>

        {notifyOpen ? (
          <div className="absolute right-3 top-[4.25rem] z-40 w-[min(100vw-1.5rem,320px)] rounded-xl border border-slate-200 bg-white/98 p-3 shadow-xl sm:right-5 sm:top-[4.5rem] dark:border-slate-700 dark:bg-[#12151c]">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-slate-900 dark:text-white">Notifications</div>
              <button
                type="button"
                onClick={() => {
                  clearNotifications();
                  setNotifications([]);
                }}
                className="text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              >
                Clear
              </button>
            </div>
            <div className="mt-2 space-y-2 text-sm">
              {notifications.length === 0 ? (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-2 text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                  No new notifications.
                </div>
              ) : null}
              {notifications.map((item) => (
                <div key={item.id} className="rounded-lg border border-slate-200 bg-slate-50 p-2 dark:border-slate-700 dark:bg-slate-900">
                  <div className="text-slate-800 dark:text-slate-200">{item.message}</div>
                  <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">{new Date(item.createdAt).toLocaleString()}</div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
        <main className="p-4 sm:p-6">
          <PageTransition>
            <Outlet />
          </PageTransition>
        </main>
      </div>
    </div>
  );
}
