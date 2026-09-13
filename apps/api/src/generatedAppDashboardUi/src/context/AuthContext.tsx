import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export interface DashboardUser {
  id: number;
  email: string;
  role: "owner" | "member";
}

interface AuthState {
  loading: boolean;
  authenticated: boolean;
  needsSetup: boolean;
  user: DashboardUser | null;
}

type AuthResult = { ok: true } | { ok: false; error: string };

interface AuthCtx extends AuthState {
  refresh: () => Promise<void>;
  login: (email: string, password: string) => Promise<AuthResult>;
  setup: (email: string, password: string) => Promise<AuthResult>;
  acceptInvite: (token: string, password: string) => Promise<AuthResult>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthCtx | undefined>(undefined);

// Talks to the dashboard access-authentication API mounted at
// /__dashboard/api/* on the generated app's own backend (see
// backend/src/dashboard/server.ts). In dev this path is proxied
// same-origin by vite.config.ts, so the session cookie works without CORS.
const API_BASE = "/__dashboard/api";

async function parseJson(res: Response): Promise<Record<string, unknown>> {
  return res.json().catch(() => ({}));
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    loading: true,
    authenticated: false,
    needsSetup: false,
    user: null,
  });

  const refresh = async () => {
    try {
      const res = await fetch(`${API_BASE}/session`, { credentials: "include" });
      const body = await parseJson(res);
      setState({
        loading: false,
        authenticated: Boolean(body["authenticated"]),
        needsSetup: Boolean(body["needsSetup"]),
        user: (body["user"] as DashboardUser | undefined) ?? null,
      });
    } catch {
      setState({ loading: false, authenticated: false, needsSetup: false, user: null });
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const postJson = async (path: string, payload: unknown) => {
    const res = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = await parseJson(res);
    return { res, body };
  };

  const login = async (email: string, password: string): Promise<AuthResult> => {
    const { res, body } = await postJson("/login", { email, password });
    if (!res.ok) return { ok: false, error: (body["error"] as string) ?? "Invalid email or password." };
    await refresh();
    return { ok: true };
  };

  const setup = async (email: string, password: string): Promise<AuthResult> => {
    const { res, body } = await postJson("/setup", { email, password });
    if (!res.ok) return { ok: false, error: (body["error"] as string) ?? "Could not set up the dashboard." };
    await refresh();
    return { ok: true };
  };

  const acceptInvite = async (token: string, password: string): Promise<AuthResult> => {
    const { res, body } = await postJson("/accept-invite", { token, password });
    if (!res.ok) return { ok: false, error: (body["error"] as string) ?? "This invite link is invalid or has expired." };
    await refresh();
    return { ok: true };
  };

  const logout = async () => {
    await fetch(`${API_BASE}/logout`, { method: "POST", credentials: "include" });
    await refresh();
  };

  return (
    <AuthContext.Provider value={{ ...state, refresh, login, setup, acceptInvite, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
