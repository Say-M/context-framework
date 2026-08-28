import { z } from "zod";

const base64OfLength = (bytes: number, label: string) =>
  z.string().refine(
    (value) => {
      try {
        return Buffer.from(value, "base64").length === bytes;
      } catch {
        return false;
      }
    },
    { message: `${label} must be base64 decoding to exactly ${bytes} bytes` },
  );

const base64OfMinLength = (bytes: number, label: string) =>
  z.string().refine(
    (value) => {
      try {
        return Buffer.from(value, "base64").length >= bytes;
      } catch {
        return false;
      }
    },
    {
      message: `${label} must be base64 decoding to at least ${bytes} bytes`,
    },
  );

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  WEB_ORIGIN: z.string().url(),
  MONGODB_URI: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_INVITE_SECRET: z.string().min(32),
  PII_ENCRYPTION_KEY: base64OfLength(32, "PII_ENCRYPTION_KEY"),
  EMAIL_HASH_SECRET: base64OfMinLength(32, "EMAIL_HASH_SECRET"),
});

// Parsed once at module load (first import, i.e. app boot) and never again —
// any missing/malformed secret throws immediately instead of failing later,
// deep inside a request handler, in a way that's hard to trace.
export const env = envSchema.parse(process.env);
export type Env = typeof env;
