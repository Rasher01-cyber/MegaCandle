import React, { Suspense, lazy, useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { AuthProvider } from "./auth/AuthProvider";
import RequireAuth from "./auth/RequireAuth";
import StartupSplash from "./components/StartupSplash";
import AppErrorBoundary from "./components/AppErrorBoundary";
import AppLayout from "./components/AppLayout";
const DashboardPage = lazy(() => import("./pages/app/DashboardPage"));

const LandingPage = lazy(() => import("./pages/LandingPage"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const LegalPage = lazy(() => import("./pages/LegalPage"));
const TradesPage = lazy(() => import("./pages/app/TradesPage"));
const TradeDetailPage = lazy(() => import("./pages/app/TradeDetailPage"));
const AnalyticsPage = lazy(() => import("./pages/app/AnalyticsPage"));
const WatchlistPage = lazy(() => import("./pages/app/WatchlistPage"));
const LiveMarketRedirect = lazy(() => import("./pages/app/LiveMarketRedirect"));
const AlertsPage = lazy(() => import("./pages/app/AlertsPage"));
const BacktestingPage = lazy(() => import("./pages/app/BacktestingPage"));
const AiReportsPage = lazy(() => import("./pages/app/AiReportsPage"));
const LeaderboardPage = lazy(() => import("./pages/app/LeaderboardPage"));
const SettingsPage = lazy(() => import("./pages/app/SettingsPage"));
const MembershipPage = lazy(() => import("./pages/app/MembershipPage"));
const NotFoundPage = lazy(() => import("./pages/NotFoundPage"));
const ComingSoonPage = lazy(() => import("./pages/app/ComingSoonPage"));

export default function App() {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => setShowSplash(false), 1900);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        {showSplash ? <StartupSplash /> : null}
        <AppErrorBoundary>
          <Suspense fallback={<PageLoader />}>
            <Routes>
                  <Route path="/" element={<LandingPage />} />
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/privacy" element={<LegalPage />} />
                  <Route path="/terms" element={<LegalPage />} />

                  <Route
                    path="/app"
                    element={
                      <RequireAuth>
                        <AppLayout />
                      </RequireAuth>
                    }
                  >
                    <Route index element={<Navigate to="dashboard" replace />} />
                    <Route path="dashboard" element={<DashboardPage />} />
                    <Route path="trades" element={<TradesPage />} />
                    <Route path="trades/:id" element={<TradeDetailPage />} />
                    <Route path="analytics" element={<AnalyticsPage />} />
                    <Route path="live-market" element={<LiveMarketRedirect />} />
                    <Route path="trade-ideas" element={<ComingSoonPage title="Trade ideas" />} />
                    <Route path="learn" element={<ComingSoonPage title="Learn" description="Educational content and playbooks are coming soon." />} />
                    <Route path="positions" element={<Navigate to="/app/trades" replace />} />
                    <Route path="watchlist" element={<WatchlistPage />} />
                    <Route path="alerts" element={<AlertsPage />} />
                    <Route path="backtesting" element={<BacktestingPage />} />
                    <Route path="ai-reports" element={<AiReportsPage />} />
                    <Route path="community" element={<ComingSoonPage title="Community" description="Social features and shared journals are coming soon." />} />
                    <Route path="leaderboard" element={<LeaderboardPage />} />
                    <Route path="settings" element={<SettingsPage />} />
                    <Route path="membership" element={<MembershipPage />} />
                  </Route>

                  <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Suspense>
        </AppErrorBoundary>
      </AuthProvider>
    </QueryClientProvider>
  );
}

function PageLoader() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center p-6">
      <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white/80 px-4 py-3 text-sm text-slate-600 shadow-lg dark:border-white/10 dark:bg-slate-900/80 dark:text-slate-300">
        <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
        Loading workspace…
      </div>
    </div>
  );
}

