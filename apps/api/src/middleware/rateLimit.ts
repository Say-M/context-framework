import { rateLimiter } from "hono-rate-limiter";

/** Applied globally. In-memory store is fine for a single-process deploy. */
export const defaultRateLimiter = rateLimiter({
  windowMs: 60_000,
  limit: 300,
  standardHeaders: "draft-7",
  keyGenerator: (c) =>
    c.req.header("x-forwarded-for") ?? c.req.header("cf-connecting-ip") ?? "unknown",
});

/** Applied only to /auth/login and /auth/refresh — brute-force resistance. */
export const authRateLimiter = rateLimiter({
  windowMs: 60_000,
  limit: 10,
  standardHeaders: "draft-7",
  keyGenerator: (c) =>
    c.req.header("x-forwarded-for") ?? c.req.header("cf-connecting-ip") ?? "unknown",
});
