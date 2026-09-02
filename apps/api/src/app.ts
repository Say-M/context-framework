import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { openAPIRouteHandler } from "hono-openapi";
import { Scalar } from "@scalar/hono-api-reference";
import { env } from "./config/env";
import { securityHeaders } from "./middleware/securityHeaders";
import { defaultRateLimiter } from "./middleware/rateLimit";
import { errorHandler } from "./middleware/errorHandler";
import type { AppVariables } from "./middleware/auth";
import { authRoutes } from "./modules/auth/routes";
import { businessDomainRoutes } from "./modules/business-domain/routes";
import { businessModelRoutes } from "./modules/business-model/routes";
import { orgContextRoutes } from "./modules/org-context/routes";
import { appBlueprintRoutes } from "./modules/app-blueprint/routes";
import { specificationRoutes } from "./modules/specifications/routes";
import { approvalRoutes } from "./modules/approvals/routes";
import { userRoutes } from "./modules/users/routes";
import { platformAuthRoutes } from "./modules/platform-auth/routes";
import { catalogRoutes } from "./modules/catalog/routes";
import { generatedAppRoutes } from "./modules/generated-apps/routes";
import { studioRoutes } from "./modules/studio/routes";
import { engine } from "./lib/socket";
import type { WebSocketData } from "@socket.io/bun-engine";

export const app = new Hono<{ Variables: AppVariables }>();

const DOCS_PATHS = ["/api/v1/docs", "/api/v1/openapi.json"];
// Everything these three middlewares apply to — deliberately excludes
// /socket.io/*, which isn't a REST endpoint: the engine.io handshake/polling
// requests don't want a data-API CSP, rate limiting real-time connections by
// request count doesn't make sense, and the Engine sets its own CORS headers
// via the `cors` option passed to it — layering Hono's cors() on top too
// would risk duplicate/conflicting headers.
const GUARDED_PATHS = ["/health", "/api/*"] as const;

app.use("*", logger());
for (const path of GUARDED_PATHS) {
  // The strict data-API CSP (default-src 'none', frame-ancestors 'none')
  // would also block the Scalar page's own script/style tags, so the docs
  // routes are deliberately excluded from it below rather than relaxed
  // globally.
  app.use(path, async (c, next) => {
    if (DOCS_PATHS.includes(c.req.path)) return next();
    return securityHeaders(c, next);
  });
  app.use(
    path,
    cors({
      origin: [env.WEB_ORIGIN, env.GENERATOR_WEB_ORIGIN, env.STUDIO_WEB_ORIGIN],
      credentials: true,
      allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
      allowHeaders: ["Content-Type", "Authorization"],
    }),
  );
  app.use(path, defaultRateLimiter);
}

app.onError(errorHandler);

app.get("/health", (c) => c.json({ ok: true }));

app.all("/socket.io/*", (c) => engine.handleRequest(c.req.raw, c.env as Bun.Server<WebSocketData>));

app.route("/api/v1/auth", authRoutes);
app.route("/api/v1/business-domains", businessDomainRoutes);
app.route("/api/v1/business-models", businessModelRoutes);
app.route("/api/v1/org-contexts", orgContextRoutes);
app.route("/api/v1/app-blueprints", appBlueprintRoutes);
app.route("/api/v1/specifications", specificationRoutes);
app.route("/api/v1/approvals", approvalRoutes);
app.route("/api/v1/users", userRoutes);
app.route("/api/v1/platform-auth", platformAuthRoutes);
app.route("/api/v1/catalog", catalogRoutes);
app.route("/api/v1/generated-apps", generatedAppRoutes);
app.route("/api/v1/studio", studioRoutes);

app.get(
  "/api/v1/openapi.json",
  openAPIRouteHandler(app, {
    documentation: {
      info: {
        title: "BISMO API",
        version: "1.0.0",
        description:
          "Business context authoring platform — Business Domain, Business Model, Org Context, and App Blueprint modules, plus their shared specifications and admin approval workflow.",
      },
      servers: [{ url: `http://localhost:${env.PORT}`, description: "Local server" }],
      components: {
        securitySchemes: {
          bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
        },
      },
    },
  }),
);

app.get(
  "/api/v1/docs",
  Scalar({ url: "/api/v1/openapi.json", pageTitle: "BISMO API Reference", theme: "purple" }),
);
