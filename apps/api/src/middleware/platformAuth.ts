import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";
import { verifyPlatformAccessToken } from "../lib/jwt";

export interface PlatformAuthUser {
  id: string;
  tokenVersion: number;
}

export type PlatformAppVariables = {
  platformUser: PlatformAuthUser;
};

export const authenticatePlatformUser = createMiddleware<{ Variables: PlatformAppVariables }>(
  async (c, next) => {
    const header = c.req.header("Authorization");
    const token = header?.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) {
      throw new HTTPException(401, { message: "Missing access token" });
    }
    try {
      const payload = await verifyPlatformAccessToken(token);
      c.set("platformUser", { id: payload.sub, tokenVersion: payload.tokenVersion });
    } catch {
      throw new HTTPException(401, { message: "Invalid or expired token" });
    }
    await next();
  },
);
