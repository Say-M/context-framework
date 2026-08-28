import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { AuthSessionResponse, LoginInput, PublicUser } from "@bismo/shared-schemas";
import { apiRequest, setAccessToken, setSessionExpiredHandler } from "@/lib/api-client";

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

interface AuthContextValue {
  status: AuthStatus;
  user: PublicUser | null;
  login: (input: LoginInput) => Promise<void>;
  logout: () => Promise<void>;
  /** Used by the activation page, which already has a fresh session from /auth/activate. */
  setSession: (session: AuthSessionResponse) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<PublicUser | null>(null);

  const setSession = useCallback((session: AuthSessionResponse) => {
    setAccessToken(session.accessToken);
    setUser(session.user);
    setStatus("authenticated");
  }, []);

  const clearSession = useCallback(() => {
    setAccessToken(null);
    setUser(null);
    setStatus("unauthenticated");
  }, []);

  useEffect(() => {
    setSessionExpiredHandler(clearSession);
  }, [clearSession]);

  // On first load there's no access token in memory yet (by design, it's
  // never persisted) — a silent refresh restores the session from the
  // httpOnly cookie if one exists.
  useEffect(() => {
    let cancelled = false;
    apiRequest<AuthSessionResponse>("/api/v1/auth/refresh", { method: "POST" })
      .then((session) => {
        if (!cancelled) setSession(session);
      })
      .catch(() => {
        if (!cancelled) clearSession();
      });
    return () => {
      cancelled = true;
    };
  }, [setSession, clearSession]);

  const login = useCallback(
    async (input: LoginInput) => {
      const session = await apiRequest<AuthSessionResponse>("/api/v1/auth/login", {
        method: "POST",
        body: JSON.stringify(input),
      });
      setSession(session);
    },
    [setSession],
  );

  const logout = useCallback(async () => {
    await apiRequest("/api/v1/auth/logout", { method: "POST" }).catch(() => {});
    clearSession();
  }, [clearSession]);

  const value = useMemo(
    () => ({ status, user, login, logout, setSession }),
    [status, user, login, logout, setSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
