import { z } from "zod";
import { paginationQuerySchema } from "./common.schema";
import { roleSchema } from "./auth.schema";

export const listUsersQuerySchema = paginationQuerySchema;
export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;

export const updateUserRoleSchema = z.object({
  role: roleSchema,
});
export type UpdateUserRoleInput = z.infer<typeof updateUserRoleSchema>;

// Only active/disabled are admin-settable — pending_activation is a
// system-managed state that resolves itself once the invitee activates.
export const updateUserStatusSchema = z.object({
  status: z.enum(["active", "disabled"]),
});
export type UpdateUserStatusInput = z.infer<typeof updateUserStatusSchema>;
