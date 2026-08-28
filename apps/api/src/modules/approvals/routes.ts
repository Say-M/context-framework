import { Hono } from "hono";
import { describeRoute, resolver, validator as zValidator } from "hono-openapi";
import { z } from "zod";
import { approvalQueueItemSchema, contentTypeSlugSchema, objectIdSchema, rejectItemSchema } from "@bismo/shared-schemas";
import { authenticate, type AppVariables } from "../../middleware/auth";
import { requireRole } from "../../middleware/rbac";
import { recordAudit } from "../../middleware/auditLog";
import { listResponseSchema } from "../../lib/openapi-responses";
import { approveItem, listApprovalQueue, rejectItem } from "./service";

const typeIdParamSchema = z.object({ type: contentTypeSlugSchema, id: objectIdSchema });
const approvalResultSchema = z.object({ id: objectIdSchema, status: z.string() });
const tags = ["Approvals"];

export const approvalRoutes = new Hono<{ Variables: AppVariables }>();

approvalRoutes.use("*", authenticate, requireRole("admin"));

approvalRoutes.get(
  "/queue",
  describeRoute({
    tags,
    summary: "List the pending approval queue",
    description: "Merged pending items across all 4 content collections (admin only).",
    security: [{ bearerAuth: [] }],
    responses: {
      200: {
        description: "Approval queue",
        content: { "application/json": { schema: resolver(listResponseSchema(approvalQueueItemSchema)) } },
      },
    },
  }),
  async (c) => {
    const items = await listApprovalQueue();
    return c.json({ items });
  },
);

approvalRoutes.patch(
  "/:type/:id/approve",
  describeRoute({
    tags,
    summary: "Approve a pending item",
    description: "Admin only. Writes an audit log entry.",
    security: [{ bearerAuth: [] }],
    responses: {
      200: {
        description: "Approval result",
        content: { "application/json": { schema: resolver(approvalResultSchema) } },
      },
    },
  }),
  zValidator("param", typeIdParamSchema),
  async (c) => {
    const { type, id } = c.req.valid("param");
    const actor = c.get("user");
    const { doc, entry } = await approveItem(type, id, actor);

    await recordAudit({
      c,
      actor: actor.id,
      action: "approve",
      targetType: entry.parentType,
      targetId: id,
    });

    return c.json({ id: String(doc._id), status: doc.status });
  },
);

approvalRoutes.patch(
  "/:type/:id/reject",
  describeRoute({
    tags,
    summary: "Reject a pending item",
    description: "Admin only. Requires a reason; the author may revise and resubmit. Writes an audit log entry.",
    security: [{ bearerAuth: [] }],
    responses: {
      200: {
        description: "Rejection result",
        content: { "application/json": { schema: resolver(approvalResultSchema) } },
      },
    },
  }),
  zValidator("param", typeIdParamSchema),
  zValidator("json", rejectItemSchema),
  async (c) => {
    const { type, id } = c.req.valid("param");
    const { reason } = c.req.valid("json");
    const actor = c.get("user");
    const { doc, entry } = await rejectItem(type, id, reason, actor);

    await recordAudit({
      c,
      actor: actor.id,
      action: "reject",
      targetType: entry.parentType,
      targetId: id,
      note: reason,
    });

    return c.json({ id: String(doc._id), status: doc.status });
  },
);
