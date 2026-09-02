import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type {
  PlatformAuthSessionResponse,
  PlatformLoginInput,
  PlatformSignupInput,
  PlatformUser,
} from "@bismo/shared-schemas";
import { apiRequest, setAccessToken, setSessionExpiredHandler } from "@/lib/api-client";

// Identical to apps/generator-web's PlatformAuthContext — Studio reuses the
// exact same platform accounts (verifyPlatformAccessToken checks only
// issuer/audience/signature, no origin claim), so this is the same client
// pattern, not a new one.
type AuthStatus = "loading" | "authenticated" | "unauthenticated";

interface PlatformAuthContextValue {
  status: AuthStatus;
  user: PlatformUser | null;
  signup: (input: PlatformSignupInput) => Promise<void>;
  login: (input: PlatformLoginInput) => Promise<void>;
  logout: () => Promise<void>;
}

const PlatformAuthContext = createContext<PlatformAuthContextValue | null>(null);

export function PlatformAuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<PlatformUser | null>(null);

  const setSession = useCallback((session: PlatformAuthSessionResponse) => {
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

  // On first load there's no access token in memory yet — a silent refresh
  // restores the session from the httpOnly platform_refresh_token cookie if
  // one exists.
  useEffect(() => {
    let cancelled = false;
    apiRequest<PlatformAuthSessionResponse>("/api/v1/platform-auth/refresh", { method: "POST" })
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

  const signup = useCallback(
    async (input: PlatformSignupInput) => {
      const session = await apiRequest<PlatformAuthSessionResponse>("/api/v1/platform-auth/signup", {
        method: "POST",
        body: JSON.stringify(input),
      });
      setSession(session);
    },
    [setSession],
  );

  const login = useCallback(
    async (input: PlatformLoginInput) => {
      const session = await apiRequest<PlatformAuthSessionResponse>("/api/v1/platform-auth/login", {
        method: "POST",
        body: JSON.stringify(input),
      });
      setSession(session);
    },
    [setSession],
  );

  const logout = useCallback(async () => {
    await apiRequest("/api/v1/platform-auth/logout", { method: "POST" }).catch(() => {});
    clearSession();
  }, [clearSession]);

  const value = useMemo(
    () => ({ status, user, signup, login, logout }),
    [status, user, signup, login, logout],
  );

  return <PlatformAuthContext.Provider value={value}>{children}</PlatformAuthContext.Provider>;
}

export function usePlatformAuth() {
  const ctx = useContext(PlatformAuthContext);
  if (!ctx) throw new Error("usePlatformAuth must be used within PlatformAuthProvider");
  return ctx;
}
