import { Hono } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { describeRoute, resolver, validator as zValidator } from "hono-openapi";
import { z } from "zod";
import {
  activateAccountSchema,
  authSessionResponseSchema,
  inviteUserSchema,
  loginSchema,
  objectIdSchema,
} from "@bismo/shared-schemas";
import { HTTPException } from "hono/http-exception";
import { env } from "../../config/env";
import { authenticate, type AppVariables } from "../../middleware/auth";
import { requireRole } from "../../middleware/rbac";
import { authRateLimiter } from "../../middleware/rateLimit";
import { recordAudit } from "../../middleware/auditLog";
import { okResponseSchema } from "../../lib/openapi-responses";
import { REFRESH_COOKIE_MAX_AGE_SECONDS, REFRESH_COOKIE_NAME } from "../../lib/jwt";
import {
  activateAccount,
  inviteUser,
  login,
  refreshSession,
} from "./service";

const tags = ["Auth"];
const inviteResponseSchema = z.object({
  userId: objectIdSchema,
  email: z.string().email(),
  activationLink: z.string(),
});

export const authRoutes = new Hono<{ Variables: AppVariables }>();

function setRefreshCookie(c: Parameters<typeof setCookie>[0], token: string) {
  setCookie(c, REFRESH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "Strict",
    path: "/api/v1/auth",
    maxAge: REFRESH_COOKIE_MAX_AGE_SECONDS,
  });
}

authRoutes.post(
  "/invite",
  authenticate,
  requireRole("admin"),
  describeRoute({
    tags,
    summary: "Invite a new user",
    description: "Admin only. Email delivery isn't wired up — the activation link is returned directly for the admin to share manually.",
    security: [{ bearerAuth: [] }],
    responses: {
      201: {
        description: "Invited user",
        content: { "application/json": { schema: resolver(inviteResponseSchema) } },
      },
    },
  }),
  zValidator("json", inviteUserSchema),
  async (c) => {
    const input = c.req.valid("json");
    const actor = c.get("user").id;
    const { user, inviteToken } = await inviteUser(input, actor);

    await recordAudit({
      c,
      actor,
      action: "invite",
      targetType: "User",
      targetId: String(user._id),
    });

    const activationLink = `${env.WEB_ORIGIN}/activate?token=${inviteToken}`;
    return c.json({ userId: String(user._id), email: user.email, activationLink }, 201);
  },
);

authRoutes.post(
  "/activate",
  describeRoute({
    tags,
    summary: "Activate an invited account",
    description: "Sets the invitee's name and password using their invite token, then logs them in.",
    responses: {
      200: {
        description: "Session",
        content: { "application/json": { schema: resolver(authSessionResponseSchema) } },
      },
    },
  }),
  zValidator("json", activateAccountSchema),
  async (c) => {
    const input = c.req.valid("json");
    const session = await activateAccount(input);
    setRefreshCookie(c, session.refreshToken);
    return c.json({ accessToken: session.accessToken, user: session.user });
  },
);

authRoutes.post(
  "/login",
  authRateLimiter,
  describeRoute({
    tags,
    summary: "Log in",
    description: "Returns a short-lived access token; a refresh token is set as an httpOnly cookie.",
    responses: {
      200: {
        description: "Session",
        content: { "application/json": { schema: resolver(authSessionResponseSchema) } },
      },
    },
  }),
  zValidator("json", loginSchema),
  async (c) => {
    const input = c.req.valid("json");
    const session = await login(input);
    setRefreshCookie(c, session.refreshToken);

    await recordAudit({
      c,
      actor: session.user.id,
      action: "login",
      targetType: "User",
      targetId: session.user.id,
    });

    return c.json({ accessToken: session.accessToken, user: session.user });
  },
);

authRoutes.post(
  "/refresh",
  authRateLimiter,
  describeRoute({
    tags,
    summary: "Refresh the access token",
    description: "Rotates the refresh token cookie; reuse of an already-rotated refresh token invalidates the session.",
    responses: {
      200: {
        description: "Session",
        content: { "application/json": { schema: resolver(authSessionResponseSchema) } },
      },
    },
  }),
  async (c) => {
    const refreshToken = getCookie(c, REFRESH_COOKIE_NAME);
    if (!refreshToken) {
      throw new HTTPException(401, { message: "Missing refresh token" });
    }
    const session = await refreshSession(refreshToken);
    setRefreshCookie(c, session.refreshToken);
    return c.json({ accessToken: session.accessToken, user: session.user });
  },
);

authRoutes.post(
  "/logout",
  describeRoute({
    tags,
    summary: "Log out",
    description: "Clears the refresh cookie and invalidates the user's outstanding refresh tokens.",
    responses: {
      200: {
        description: "Logged out",
        content: { "application/json": { schema: resolver(okResponseSchema) } },
      },
    },
  }),
  async (c) => {
    deleteCookie(c, REFRESH_COOKIE_NAME, { path: "/api/v1/auth" });
    return c.json({ ok: true });
  },
);
