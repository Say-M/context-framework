import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { describeRoute, resolver, validator as zValidator } from "hono-openapi";
import {
  platformAuthSessionResponseSchema,
  platformLoginSchema,
  platformSignupSchema,
} from "@bismo/shared-schemas";
import { env } from "../../config/env";
import { authRateLimiter } from "../../middleware/rateLimit";
import { okResponseSchema } from "../../lib/openapi-responses";
import { PLATFORM_REFRESH_COOKIE_NAME, REFRESH_COOKIE_MAX_AGE_SECONDS } from "../../lib/jwt";
import { login, refreshSession, signup } from "./service";

const tags = ["Platform Auth"];

export const platformAuthRoutes = new Hono();

function setRefreshCookie(c: Parameters<typeof setCookie>[0], token: string) {
  setCookie(c, PLATFORM_REFRESH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "Strict",
    path: "/api/v1/platform-auth",
    maxAge: REFRESH_COOKIE_MAX_AGE_SECONDS,
  });
}

platformAuthRoutes.post(
  "/signup",
  authRateLimiter,
  describeRoute({
    tags,
    summary: "Create a public generator account",
    responses: {
      201: {
        description: "Session",
        content: { "application/json": { schema: resolver(platformAuthSessionResponseSchema) } },
      },
    },
  }),
  zValidator("json", platformSignupSchema),
  async (c) => {
    const input = c.req.valid("json");
    const session = await signup(input);
    setRefreshCookie(c, session.refreshToken);
    return c.json({ accessToken: session.accessToken, user: session.user }, 201);
  },
);

platformAuthRoutes.post(
  "/login",
  authRateLimiter,
  describeRoute({
    tags,
    summary: "Log in",
    description: "Returns a short-lived access token; a refresh token is set as an httpOnly cookie.",
    responses: {
      200: {
        description: "Session",
        content: { "application/json": { schema: resolver(platformAuthSessionResponseSchema) } },
      },
    },
  }),
  zValidator("json", platformLoginSchema),
  async (c) => {
    const input = c.req.valid("json");
    const session = await login(input);
    setRefreshCookie(c, session.refreshToken);
    return c.json({ accessToken: session.accessToken, user: session.user });
  },
);

platformAuthRoutes.post(
  "/refresh",
  authRateLimiter,
  describeRoute({
    tags,
    summary: "Refresh the access token",
    responses: {
      200: {
        description: "Session",
        content: { "application/json": { schema: resolver(platformAuthSessionResponseSchema) } },
      },
    },
  }),
  async (c) => {
    const refreshToken = getCookie(c, PLATFORM_REFRESH_COOKIE_NAME);
    if (!refreshToken) {
      throw new HTTPException(401, { message: "Missing refresh token" });
    }
    const session = await refreshSession(refreshToken);
    setRefreshCookie(c, session.refreshToken);
    return c.json({ accessToken: session.accessToken, user: session.user });
  },
);

platformAuthRoutes.post(
  "/logout",
  describeRoute({
    tags,
    summary: "Log out",
    responses: {
      200: {
        description: "Logged out",
        content: { "application/json": { schema: resolver(okResponseSchema) } },
      },
    },
  }),
  async (c) => {
    deleteCookie(c, PLATFORM_REFRESH_COOKIE_NAME, { path: "/api/v1/platform-auth" });
    return c.json({ ok: true });
  },
);
