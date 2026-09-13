// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// This dashboard has no backend of its own — it authenticates against the
// dashboard access-auth API mounted at /__dashboard/api/* on the generated
// app's own backend (see ../server.ts, injected by context-framework's
// dashboardScaffold.ts), and reads/writes the generated app's real business
// data at /api/* on that same backend (its per-entity CRUD routes, plus
// /api/logs and, when agents are generated, /api/agents — see
// generation.ts's fixed response-shape contract). Proxying both here, rather
// than calling them cross-origin from the browser, keeps the session cookie
// same-origin from the browser's point of view and avoids CORS/SameSite
// complications in dev. Point DASHBOARD_BACKEND_URL at wherever `bun run
// dev` in `backend/` is actually listening if it differs from the default
// below.
const dashboardBackendUrl = process.env["DASHBOARD_BACKEND_URL"] ?? "http://localhost:3000";

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    server: {
      proxy: {
        "/__dashboard/api": {
          target: dashboardBackendUrl,
          changeOrigin: true,
        },
        "/api": {
          target: dashboardBackendUrl,
          changeOrigin: true,
        },
      },
    },
  },
});
