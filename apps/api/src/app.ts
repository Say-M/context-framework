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

export const app = new Hono<{ Variables: AppVariables }>();

const DOCS_PATHS = ["/api/v1/docs", "/api/v1/openapi.json"];

app.use("*", logger());
// The strict data-API CSP (default-src 'none', frame-ancestors 'none') would
// also block the Scalar page's own script/style tags, so the docs routes are
// deliberately excluded from it below rather than relaxed globally.
app.use("*", async (c, next) => {
  if (DOCS_PATHS.includes(c.req.path)) return next();
  return securityHeaders(c, next);
});
app.use(
  "*",
  cors({
    origin: env.WEB_ORIGIN,
    credentials: true,
    allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
  }),
);
app.use("*", defaultRateLimiter);

app.onError(errorHandler);

app.get("/health", (c) => c.json({ ok: true }));

app.route("/api/v1/auth", authRoutes);
app.route("/api/v1/business-domains", businessDomainRoutes);
app.route("/api/v1/business-models", businessModelRoutes);
app.route("/api/v1/org-contexts", orgContextRoutes);
app.route("/api/v1/app-blueprints", appBlueprintRoutes);
app.route("/api/v1/specifications", specificationRoutes);
app.route("/api/v1/approvals", approvalRoutes);
app.route("/api/v1/users", userRoutes);

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
