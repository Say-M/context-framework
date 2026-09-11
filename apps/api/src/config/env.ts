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
  GENERATOR_WEB_ORIGIN: z.string().url(),
  STUDIO_WEB_ORIGIN: z.string().url(),
  GENERATED_APPS_DIR: z.string().min(1).default("./data/generated-apps"),
  STUDIO_ASSETS_DIR: z.string().min(1).default("./data/studio-assets"),
  MONGODB_URI: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_INVITE_SECRET: z.string().min(32),
  PII_ENCRYPTION_KEY: base64OfLength(32, "PII_ENCRYPTION_KEY"),
  EMAIL_HASH_SECRET: base64OfMinLength(32, "EMAIL_HASH_SECRET"),
  // Only validated for the fail-fast-at-boot guarantee — the Claude Agent
  // SDK subprocess reads it (and the optional ANTHROPIC_BASE_URL, for
  // routing through a compatible gateway instead of api.anthropic.com)
  // straight from its inherited process.env, not from this parsed object.
  ANTHROPIC_API_KEY: z.string().min(1),
  // Optional, unlike ANTHROPIC_API_KEY — Studio's generate_image tool
  // degrades gracefully (a normal tool-error result, not a boot crash) when
  // this is unset, since image generation is one capability among several,
  // not something the whole platform depends on.
  // Preprocessed because "unset" doesn't always mean absent from
  // process.env: docker-compose.dev.yml's `${GOOGLE_API_KEY:-}` fallback
  // materializes an unset var as an empty string, not a missing key, and
  // `.optional()` alone only accepts `undefined` — an empty string still
  // fails `.min(1)` and crashes boot under Docker even though the same var
  // being genuinely absent (the non-Docker case) works fine.
  GOOGLE_API_KEY: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.string().min(1).optional(),
  ),
});

// Parsed once at module load (first import, i.e. app boot) and never again —
// any missing/malformed secret throws immediately instead of failing later,
// deep inside a request handler, in a way that's hard to trace.
export const env = envSchema.parse(process.env);
export type Env = typeof env;
