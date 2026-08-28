import type { ErrorHandler } from "hono";
import { HTTPException } from "hono/http-exception";
import { ZodError } from "zod";
import { env } from "../config/env";

export const errorHandler: ErrorHandler = (err, c) => {
  if (err instanceof HTTPException) {
    return c.json({ error: err.message }, err.status);
  }
  if (err instanceof ZodError) {
    return c.json(
      { error: "Validation failed", issues: err.issues },
      400,
    );
  }
  // Never leak internals (stack traces, raw DB errors that may echo back
  // PII) to the client — log server-side only.
  console.error(err);
  return c.json(
    { error: env.NODE_ENV === "production" ? "Internal server error" : String(err) },
    500,
  );
};
