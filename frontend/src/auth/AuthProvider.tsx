import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import { clearDemoWorkspaceMode, enableDemoWorkspaceMode, isDemoWorkspaceFlagSet } from "../lib/demoMode";

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
  isDemoWorkspace: boolean;
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
    try {
      const res = await api.get("/api/auth/me");
      clearDemoWorkspaceMode();
      setUser(res.data.user);
      return;
    } catch {
      /* fall through to demo workspace if enabled */
    }

    if (isDemoWorkspaceFlagSet()) {
      setUser({
        id: "demo",
        email: "demo@megacandle.local",
        name: "Demo User",
        picture: null,
        currentSessionId: "demo",
      });
      return;
    }

    setUser(null);
  };

  const logout = async () => {
    if (isDemoWorkspaceFlagSet()) {
      clearDemoWorkspaceMode();
      setUser(null);
      return;
    }
    try {
      await api.post("/api/auth/logout");
    } catch {
      /* still clear local user */
    }
    clearDemoWorkspaceMode();
    setUser(null);
  };

  useEffect(() => {
    refresh()
      .finally(() => setLoading(false))
      .catch(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isDemoWorkspace = user?.id === "demo";

  const value = useMemo(
    () => ({ user, loading, isDemoWorkspace, refresh, logout }),
    [user, loading, isDemoWorkspace],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
