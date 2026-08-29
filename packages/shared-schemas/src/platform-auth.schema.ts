import { z } from "zod";
import { objectIdSchema } from "./common.schema";
import { passwordSchema } from "./auth.schema";

export const platformSignupSchema = z.object({
  name: z.string().trim().min(1).max(200),
  email: z.string().trim().toLowerCase().email(),
  password: passwordSchema,
});
export type PlatformSignupInput = z.infer<typeof platformSignupSchema>;

export const platformLoginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});
export type PlatformLoginInput = z.infer<typeof platformLoginSchema>;

// Shape returned to the client — never includes passwordHash or raw
// encrypted field ciphertext, only the decrypted display values.
export const platformUserSchema = z.object({
  id: objectIdSchema,
  email: z.string().email(),
  name: z.string(),
  createdAt: z.string().datetime(),
});
export type PlatformUser = z.infer<typeof platformUserSchema>;

export const platformAuthSessionResponseSchema = z.object({
  accessToken: z.string(),
  user: platformUserSchema,
});
export type PlatformAuthSessionResponse = z.infer<typeof platformAuthSessionResponseSchema>;
