import { z } from "zod";
import { objectIdSchema } from "./common.schema";

export const roleSchema = z.enum(["author", "admin"]);
export type Role = z.infer<typeof roleSchema>;

export const userStatusSchema = z.enum([
  "pending_activation",
  "active",
  "disabled",
]);
export type UserStatus = z.infer<typeof userStatusSchema>;

// Enforced consistently on both the activation form (client) and the
// activate endpoint (server) so a weak password can never be set via a
// direct API call that bypasses client-side validation.
export const passwordSchema = z
  .string()
  .min(10, "Password must be at least 10 characters")
  .max(128, "Password must be at most 128 characters");

export const inviteUserSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  role: roleSchema,
});
export type InviteUserInput = z.infer<typeof inviteUserSchema>;

export const activateAccountSchema = z.object({
  token: z.string().min(1),
  name: z.string().trim().min(1).max(200),
  password: passwordSchema,
});
export type ActivateAccountInput = z.infer<typeof activateAccountSchema>;

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});
export type LoginInput = z.infer<typeof loginSchema>;

// Shape returned to the client — never includes passwordHash or raw
// encrypted field ciphertext, only the decrypted display values.
export const publicUserSchema = z.object({
  id: objectIdSchema,
  email: z.string().email(),
  name: z.string(),
  role: roleSchema,
  status: userStatusSchema,
  lastLoginAt: z.string().datetime().nullable(),
});
export type PublicUser = z.infer<typeof publicUserSchema>;

export const authSessionResponseSchema = z.object({
  accessToken: z.string(),
  user: publicUserSchema,
});
export type AuthSessionResponse = z.infer<typeof authSessionResponseSchema>;
