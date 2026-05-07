import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  picture?: string | null;
  currentSessionId?: string | null;
};

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    const demoEnabled = localStorage.getItem("tradefx_demo_mode") === "1";
    if (demoEnabled) {
      setUser({
        id: "demo",
        email: "demo@megacandle.local",
        name: "Demo User",
        picture: null,
        currentSessionId: "demo",
      });
      return;
    }
    try {
      const res = await api.get("/api/auth/me");
      setUser(res.data.user);
    } catch {
      setUser(null);
    }
  };

  const logout = async () => {
    const demoEnabled = localStorage.getItem("tradefx_demo_mode") === "1";
    if (demoEnabled) {
      localStorage.removeItem("tradefx_demo_mode");
      setUser(null);
      return;
    }
    try {
      await api.post("/api/auth/logout");
    } catch {
      /* still clear local user */
    }
    setUser(null);
  };

  useEffect(() => {
    refresh()
      .finally(() => setLoading(false))
      .catch(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo(() => ({ user, loading, refresh, logout }), [user, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
