import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import * as authApi from "../../platform/api/auth";
import type { AuthUser } from "../../platform/api/auth";
import {
  identifyAnalyticsUser,
  resetAnalyticsUser,
} from "../analytics/analytics.client";

type AuthStatus = "loading" | "authenticated" | "anonymous";

type AuthContextValue = {
  status: AuthStatus;
  user: AuthUser | null;
  error: string | null;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: AuthUser | null) => void;
  clearError: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function applyIdentity(user: AuthUser | null) {
  if (user) identifyAnalyticsUser(user);
  else resetAnalyticsUser();
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<AuthUser | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const me = await authApi.getMe();
    if (me.success) {
      setUser(me.user);
      setStatus("authenticated");
      setError(null);
      applyIdentity(me.user);
      return;
    }
    setUser(null);
    setStatus("anonymous");
    applyIdentity(null);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const returned = await authApi.handleAuthReturn();
      if (cancelled) return;
      if (returned.error) setError(returned.error);
      await refresh();
    })();
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  const logout = useCallback(async () => {
    await authApi.logout();
    setUser(null);
    setStatus("anonymous");
    applyIdentity(null);
  }, []);

  const value = useMemo(
    () => ({
      status,
      user,
      error,
      refresh,
      logout,
      setUser: (next: AuthUser | null) => {
        setUser(next);
        setStatus(next ? "authenticated" : "anonymous");
        applyIdentity(next);
      },
      clearError: () => setError(null),
    }),
    [status, user, error, refresh, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
