import React, { Suspense, lazy, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "./auth/AuthProvider";
import RequireAuth from "./auth/RequireAuth";
import StartupSplash from "./components/StartupSplash";
import AppErrorBoundary from "./components/AppErrorBoundary";
import AppLayout from "./components/AppLayout";
import DashboardPage from "./pages/app/DashboardPage";

const LandingPage = lazy(() => import("./pages/LandingPage"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const LegalPage = lazy(() => import("./pages/LegalPage"));
const TradesPage = lazy(() => import("./pages/app/TradesPage"));
const TradeDetailPage = lazy(() => import("./pages/app/TradeDetailPage"));
const AnalyticsPage = lazy(() => import("./pages/app/AnalyticsPage"));
const LiveMarketPage = lazy(() => import("./pages/app/LiveMarketPage"));
const TradeIdeasPage = lazy(() => import("./pages/app/TradeIdeasPage"));
const LearnPage = lazy(() => import("./pages/app/LearnPage"));
const TradingViewPage = lazy(() => import("./pages/app/TradingViewPage"));
const WatchlistPage = lazy(() => import("./pages/app/WatchlistPage"));
const PositionsPage = lazy(() => import("./pages/app/PositionsPage"));
const OrdersPage = lazy(() => import("./pages/app/OrdersPage"));
const AlertsPage = lazy(() => import("./pages/app/AlertsPage"));
const BacktestingPage = lazy(() => import("./pages/app/BacktestingPage"));
const AiReportsPage = lazy(() => import("./pages/app/AiReportsPage"));
const CommunityPage = lazy(() => import("./pages/app/CommunityPage"));
const LeaderboardPage = lazy(() => import("./pages/app/LeaderboardPage"));
const SettingsPage = lazy(() => import("./pages/app/SettingsPage"));
const MembershipPage = lazy(() => import("./pages/app/MembershipPage"));
const NotFoundPage = lazy(() => import("./pages/NotFoundPage"));

const queryClient = new QueryClient();

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
                    <Route path="trade-ideas" element={<TradeIdeasPage />} />
                    <Route path="learn" element={<LearnPage />} />
                    <Route path="tradingview" element={<TradingViewPage />} />
                    <Route path="watchlist" element={<WatchlistPage />} />
                    <Route path="positions" element={<PositionsPage />} />
                    <Route path="orders" element={<OrdersPage />} />
                    <Route path="alerts" element={<AlertsPage />} />
                    <Route path="backtesting" element={<BacktestingPage />} />
                    <Route path="ai-reports" element={<AiReportsPage />} />
                    <Route path="community" element={<CommunityPage />} />
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

