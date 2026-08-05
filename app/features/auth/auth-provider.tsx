import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
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

/** Tab-flipping shouldn't turn into a burst of /auth/me calls. */
const REVALIDATE_THROTTLE_MS = 5_000;

function applyIdentity(user: AuthUser | null) {
  if (user) identifyAnalyticsUser(user);
  else resetAnalyticsUser();
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<AuthUser | null>(null);
  const [error, setError] = useState<string | null>(null);
  const lastRevalidatedAt = useRef(0);

  const refresh = useCallback(async () => {
    lastRevalidatedAt.current = Date.now();
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

  // The session lives in a cookie on the API host shared with the OS, so signing in
  // or out on os.construct.computer is invisible to this tab until it asks again.
  // Different origins rule out BroadcastChannel and storage events, so revalidate
  // whenever the tab is actually looked at.
  useEffect(() => {
    const revalidate = () => {
      if (document.visibilityState !== "visible") return;
      if (Date.now() - lastRevalidatedAt.current < REVALIDATE_THROTTLE_MS) {
        return;
      }
      void refresh();
    };
    window.addEventListener("focus", revalidate);
    document.addEventListener("visibilitychange", revalidate);
    return () => {
      window.removeEventListener("focus", revalidate);
      document.removeEventListener("visibilitychange", revalidate);
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
