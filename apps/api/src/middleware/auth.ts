import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";
import type { Role } from "@bismo/shared-schemas";
import { verifyAccessToken } from "../lib/jwt";

export interface AuthUser {
  id: string;
  role: Role;
  tokenVersion: number;
}

export type AppVariables = {
  user: AuthUser;
};

export const authenticate = createMiddleware<{ Variables: AppVariables }>(
  async (c, next) => {
    const header = c.req.header("Authorization");
    const token = header?.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) {
      throw new HTTPException(401, { message: "Missing access token" });
    }
    try {
      const payload = await verifyAccessToken(token);
      c.set("user", {
        id: payload.sub,
        role: payload.role,
        tokenVersion: payload.tokenVersion,
      });
    } catch {
      throw new HTTPException(401, { message: "Invalid or expired token" });
    }
    await next();
  },
);
