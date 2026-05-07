import React, { useEffect, useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { Bell, BookOpenCheck, ChartCandlestick, ClipboardList, Gauge, Lightbulb, LineChart, ListPlus, Menu, Search, Settings, Shield, Sparkles, SquareActivity, Trophy, Users, WalletCards, X } from "lucide-react";
import { UiButton } from "./ui";
import ThemeToggle from "./ThemeToggle";
import BrandLogo from "./BrandLogo";
import { clearNotifications, getNotifications, type AppNotification } from "../lib/notifications";

const navItems = [
  { to: "/app/dashboard", label: "Dashboard", icon: Gauge },
  { to: "/app/trades", label: "Trades", icon: ClipboardList },
  { to: "/app/analytics", label: "Analytics", icon: ChartCandlestick },
  { to: "/app/live-market", label: "Live Market", icon: LineChart },
  { to: "/app/trade-ideas", label: "Trade Ideas", icon: Lightbulb },
  { to: "/app/learn", label: "Learn", icon: BookOpenCheck },
  { to: "/app/tradingview", label: "TradingView", icon: ChartCandlestick },
  { to: "/app/watchlist", label: "Watchlist", icon: ListPlus },
  { to: "/app/positions", label: "Positions", icon: WalletCards },
  { to: "/app/orders", label: "Orders", icon: SquareActivity },
  { to: "/app/alerts", label: "Alerts", icon: Bell },
  { to: "/app/backtesting", label: "Backtesting", icon: Shield },
  { to: "/app/ai-reports", label: "AI Reports", icon: Sparkles },
  { to: "/app/community", label: "Community", icon: Users },
  { to: "/app/leaderboard", label: "Leaderboard", icon: Trophy },
  { to: "/app/membership", label: "Membership", icon: WalletCards },
  { to: "/app/settings", label: "Settings", icon: Settings },
];

export default function AppLayout() {
  const location = useLocation();
  const { user } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [notifyOpen, setNotifyOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const pageTitle = navItems.find((item) => location.pathname.startsWith(item.to))?.label ?? "Workspace";
  const filteredNav = navItems.filter((item) => item.label.toLowerCase().includes(searchText.toLowerCase().trim()));

  useEffect(() => {
    setNotifications(getNotifications());
  }, [notifyOpen, location.pathname]);

  return (
    <div className="app-grid-bg min-h-screen text-slate-900 dark:text-white md:grid md:grid-cols-[260px_1fr]">
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
        <div className="mb-6 mt-3 text-xs text-slate-600 dark:text-slate-400">AI-powered trading workspace</div>
        <nav className="space-y-1">
          {navItems.map((item) => {
            const active =
              location.pathname === item.to || location.pathname.startsWith(`${item.to}/`);
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setMenuOpen(false)}
                className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm ${
                  active
                    ? "bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold shadow-lg shadow-blue-500/20"
                    : "text-slate-700 hover:bg-slate-900/5 dark:text-white/80 dark:hover:bg-white/10"
                }`}
              >
                <item.icon size={15} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-8 rounded-xl border border-slate-200 bg-white/70 p-3 dark:border-slate-500/25 dark:bg-slate-900/70">
          <div className="text-xs uppercase tracking-[0.12em] text-slate-600 dark:text-slate-400">Release</div>
          <div className="mt-1 text-sm font-semibold">Core Pro v1</div>
          <p className="mt-1 text-xs text-slate-700 dark:text-slate-300">MegaCandle multi-module platform is active.</p>
        </div>
      </aside>

      <div className="min-w-0 relative">
        <header className="sticky top-0 z-20 border-b border-slate-200 px-4 py-4 sm:px-6 flex items-center justify-between bg-white/80 backdrop-blur-lg dark:border-slate-500/20 dark:bg-slate-950/80">
          <div className="flex items-start gap-3">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="mt-1 rounded-md border border-slate-300 bg-white p-1.5 text-slate-700 md:hidden dark:border-white/20 dark:bg-white/5 dark:text-white"
              aria-label="Open navigation menu"
            >
              {menuOpen ? <X size={16} /> : <Menu size={16} />}
            </button>
            <div>
              <div className="text-xs uppercase tracking-[0.2em] text-slate-600 dark:text-slate-400">MegaCandle Trading Suite</div>
              <div className="text-base font-semibold mt-0.5">{pageTitle}</div>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <ThemeToggle className="hidden sm:inline-flex" />
            <button
              type="button"
              onClick={() => {
                setSearchOpen((v) => !v);
                setNotifyOpen(false);
              }}
              className="hidden sm:inline-flex rounded-xl border border-slate-300 bg-white p-2 text-slate-700 hover:bg-slate-50 dark:border-white/15 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
            >
              <Search size={15} />
            </button>
            <button
              type="button"
              onClick={() => {
                setNotifyOpen((v) => !v);
                setSearchOpen(false);
              }}
              className="hidden sm:inline-flex rounded-xl border border-slate-300 bg-white p-2 text-slate-700 hover:bg-slate-50 dark:border-white/15 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
            >
              <Bell size={15} />
            </button>
            <UiButton href="/app/trades" variant="ghost" className="hidden sm:inline-flex">
              New Trade
            </UiButton>
            <div className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs sm:text-sm max-w-[40vw] truncate dark:border-white/10 dark:bg-white/5">
              {user?.email}
            </div>
          </div>
        </header>
        {searchOpen ? (
          <div className="absolute right-6 top-[70px] z-30 w-[320px] rounded-xl border border-slate-300 bg-white/95 p-3 shadow-xl dark:border-slate-700 dark:bg-slate-950/95">
            <input
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Search pages..."
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-900"
            />
            <div className="mt-2 max-h-52 overflow-auto">
              {filteredNav.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setSearchOpen(false)}
                  className="block rounded-lg px-2 py-2 text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  {item.label}
                </Link>
              ))}
              {filteredNav.length === 0 ? <div className="px-2 py-2 text-xs text-slate-500">No matching pages</div> : null}
            </div>
          </div>
        ) : null}
        {notifyOpen ? (
          <div className="absolute right-6 top-[70px] z-30 w-[320px] rounded-xl border border-slate-300 bg-white/95 p-3 shadow-xl dark:border-slate-700 dark:bg-slate-950/95">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold">Notifications</div>
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
                  <div>{item.message}</div>
                  <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">{new Date(item.createdAt).toLocaleString()}</div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
        <main className="p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

