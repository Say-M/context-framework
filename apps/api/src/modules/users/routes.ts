import { Hono } from "hono";
import { describeRoute, resolver, validator as zValidator } from "hono-openapi";
import { z } from "zod";
import {
  listUsersQuerySchema,
  objectIdSchema,
  publicUserSchema,
  updateUserRoleSchema,
  updateUserStatusSchema,
} from "@bismo/shared-schemas";
import { authenticate, type AppVariables } from "../../middleware/auth";
import { requireRole } from "../../middleware/rbac";
import { recordAudit } from "../../middleware/auditLog";
import { paginatedResponseSchema } from "../../lib/openapi-responses";
import { listUsers, serializePublicUser, updateUserRole, updateUserStatus } from "./service";

const idParamSchema = z.object({ id: objectIdSchema });
const tags = ["Team Settings"];

export const userRoutes = new Hono<{ Variables: AppVariables }>();

userRoutes.use("*", authenticate, requireRole("admin"));

userRoutes.get(
  "/",
  describeRoute({
    tags,
    summary: "List team members",
    description: "Admin only.",
    security: [{ bearerAuth: [] }],
    responses: {
      200: {
        description: "Paginated users",
        content: { "application/json": { schema: resolver(paginatedResponseSchema(publicUserSchema)) } },
      },
    },
  }),
  zValidator("query", listUsersQuerySchema),
  async (c) => {
    const result = await listUsers(c.req.valid("query"));
    return c.json(result);
  },
);

userRoutes.patch(
  "/:id/role",
  describeRoute({
    tags,
    summary: "Change a user's role",
    description: "Admin only. Writes an audit log entry.",
    security: [{ bearerAuth: [] }],
    responses: {
      200: {
        description: "Updated user",
        content: { "application/json": { schema: resolver(publicUserSchema) } },
      },
    },
  }),
  zValidator("param", idParamSchema),
  zValidator("json", updateUserRoleSchema),
  async (c) => {
    const { id } = c.req.valid("param");
    const { role } = c.req.valid("json");
    const actor = c.get("user");
    const doc = await updateUserRole(id, { role }, actor);

    await recordAudit({
      c,
      actor: actor.id,
      action: "role_change",
      targetType: "User",
      targetId: id,
      metadata: { role },
    });

    return c.json(serializePublicUser(doc));
  },
);

userRoutes.patch(
  "/:id/status",
  describeRoute({
    tags,
    summary: "Enable or disable a user",
    description: "Admin only. Writes an audit log entry.",
    security: [{ bearerAuth: [] }],
    responses: {
      200: {
        description: "Updated user",
        content: { "application/json": { schema: resolver(publicUserSchema) } },
      },
    },
  }),
  zValidator("param", idParamSchema),
  zValidator("json", updateUserStatusSchema),
  async (c) => {
    const { id } = c.req.valid("param");
    const { status } = c.req.valid("json");
    const actor = c.get("user");
    const doc = await updateUserStatus(id, { status }, actor);

    await recordAudit({
      c,
      actor: actor.id,
      action: "status_change",
      targetType: "User",
      targetId: id,
      metadata: { status },
    });

    return c.json(serializePublicUser(doc));
  },
);
