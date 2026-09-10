const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:5500";

// Access token lives only in memory (never localStorage) — AuthContext is
// the sole writer via setAccessToken, populated at login/activate/refresh.
let accessToken: string | null = null;
let onSessionExpired: (() => void) | null = null;
let refreshInFlight: Promise<boolean> | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function setSessionExpiredHandler(handler: () => void) {
  onSessionExpired = handler;
}

async function rawFetch(path: string, init: RequestInit = {}) {
  return fetch(`${API_URL}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...init.headers,
    },
  });
}

async function tryRefresh(): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      try {
        const res = await rawFetch("/api/v1/auth/refresh", { method: "POST" });
        if (!res.ok) return false;
        const data = (await res.json()) as { accessToken: string };
        setAccessToken(data.accessToken);
        return true;
      } catch {
        return false;
      } finally {
        refreshInFlight = null;
      }
    })();
  }
  return refreshInFlight;
}

/** Wraps fetch with the access token + a single transparent refresh-and-retry on 401. */
export async function apiFetch(path: string, init: RequestInit = {}) {
  let res = await rawFetch(path, init);
  if (res.status === 401 && !path.startsWith("/api/v1/auth/")) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      res = await rawFetch(path, init);
    } else {
      onSessionExpired?.();
    }
  }
  return res;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await apiFetch(path, init);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, body.error ?? `Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}
