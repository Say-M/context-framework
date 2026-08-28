import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";
import type { Role } from "@bismo/shared-schemas";
import type { AppVariables } from "./auth";

/** Must run after `authenticate()` so `c.get('user')` is populated. */
export const requireRole = (...roles: Role[]) =>
  createMiddleware<{ Variables: AppVariables }>(async (c, next) => {
    const user = c.get("user");
    if (!roles.includes(user.role)) {
      throw new HTTPException(403, { message: "Insufficient role" });
    }
    await next();
  });
