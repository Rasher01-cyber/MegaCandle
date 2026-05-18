import React, { Suspense, lazy, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
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
const OrdersPage = lazy(() => import("./pages/app/OrdersPage"));
const LiveMarketPage = lazy(() => import("./pages/app/LiveMarketPage"));
const AlertsPage = lazy(() => import("./pages/app/AlertsPage"));
const BacktestingPage = lazy(() => import("./pages/app/BacktestingPage"));
const AiReportsPage = lazy(() => import("./pages/app/AiReportsPage"));
const LeaderboardPage = lazy(() => import("./pages/app/LeaderboardPage"));
const SettingsPage = lazy(() => import("./pages/app/SettingsPage"));
const MembershipPage = lazy(() => import("./pages/app/MembershipPage"));
const NotFoundPage = lazy(() => import("./pages/NotFoundPage"));

export default function App() {
  const location = useLocation();
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
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.24, ease: "easeOut" }}
              >
                <Routes location={location}>
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
                    <Route path="live-market" element={<LiveMarketPage />} />
                    <Route path="trade-ideas" element={<NotFoundPage />} />
                    <Route path="learn" element={<NotFoundPage />} />
                    <Route path="positions" element={<NotFoundPage />} />
                    <Route path="watchlist" element={<WatchlistPage />} />
                    <Route path="orders" element={<OrdersPage />} />
                    <Route path="alerts" element={<AlertsPage />} />
                    <Route path="backtesting" element={<BacktestingPage />} />
                    <Route path="ai-reports" element={<AiReportsPage />} />
                    <Route path="community" element={<NotFoundPage />} />
                    <Route path="leaderboard" element={<LeaderboardPage />} />
                    <Route path="settings" element={<SettingsPage />} />
                    <Route path="membership" element={<MembershipPage />} />
                  </Route>

                  <Route path="*" element={<NotFoundPage />} />
                </Routes>
              </motion.div>
            </AnimatePresence>
          </Suspense>
        </AppErrorBoundary>
      </AuthProvider>
    </QueryClientProvider>
  );
}

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/70">
        Loading...
      </div>
    </div>
  );
}

