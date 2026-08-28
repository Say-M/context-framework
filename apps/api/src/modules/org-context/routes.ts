import { Hono } from "hono";
import { describeRoute, resolver, validator as zValidator } from "hono-openapi";
import { z } from "zod";
import {
  createOrgContextSchema,
  listOrgContextsQuerySchema,
  objectIdSchema,
  orgContextSchema,
  updateOrgContextSchema,
} from "@bismo/shared-schemas";
import { authenticate, type AppVariables } from "../../middleware/auth";
import { requireRole } from "../../middleware/rbac";
import { okResponseSchema, paginatedResponseSchema } from "../../lib/openapi-responses";
import {
  createOrgContext,
  deleteOrgContext,
  getOrgContext,
  listOrgContexts,
  resubmitOrgContext,
  serializeOrgContext,
  updateOrgContext,
} from "./service";

const idParamSchema = z.object({ id: objectIdSchema });
const tags = ["Org Contexts"];

export const orgContextRoutes = new Hono<{ Variables: AppVariables }>();

orgContextRoutes.use("*", authenticate);

orgContextRoutes.get(
  "/",
  describeRoute({
    tags,
    summary: "List org contexts",
    description: "Paginated list of org contexts, optionally filtered by status/structure type.",
    security: [{ bearerAuth: [] }],
    responses: {
      200: {
        description: "Paginated org contexts",
        content: { "application/json": { schema: resolver(paginatedResponseSchema(orgContextSchema)) } },
      },
    },
  }),
  zValidator("query", listOrgContextsQuerySchema),
  async (c) => {
    const result = await listOrgContexts(c.req.valid("query"));
    return c.json(result);
  },
);

orgContextRoutes.post(
  "/",
  requireRole("author", "admin"),
  describeRoute({
    tags,
    summary: "Create an org context",
    description: "Creates a new org context, starting in 'pending' status for admin review.",
    security: [{ bearerAuth: [] }],
    responses: {
      201: {
        description: "Created org context",
        content: { "application/json": { schema: resolver(orgContextSchema) } },
      },
    },
  }),
  zValidator("json", createOrgContextSchema),
  async (c) => {
    const doc = await createOrgContext(c.req.valid("json"), c.get("user"));
    return c.json(serializeOrgContext(doc), 201);
  },
);

orgContextRoutes.get(
  "/:id",
  describeRoute({
    tags,
    summary: "Get an org context",
    security: [{ bearerAuth: [] }],
    responses: {
      200: {
        description: "Org context",
        content: { "application/json": { schema: resolver(orgContextSchema) } },
      },
    },
  }),
  zValidator("param", idParamSchema),
  async (c) => {
    const doc = await getOrgContext(c.req.valid("param").id);
    return c.json(serializeOrgContext(doc));
  },
);

orgContextRoutes.patch(
  "/:id",
  describeRoute({
    tags,
    summary: "Update an org context",
    description:
      "Author may update their own org context while it's pending/rejected; an admin may update any org context at any time. No versioning applies to org context fields (only its attached specifications are versioned).",
    security: [{ bearerAuth: [] }],
    responses: {
      200: {
        description: "Updated org context",
        content: { "application/json": { schema: resolver(orgContextSchema) } },
      },
    },
  }),
  zValidator("param", idParamSchema),
  zValidator("json", updateOrgContextSchema),
  async (c) => {
    const doc = await updateOrgContext(
      c.req.valid("param").id,
      c.req.valid("json"),
      c.get("user"),
    );
    return c.json(serializeOrgContext(doc));
  },
);

orgContextRoutes.delete(
  "/:id",
  describeRoute({
    tags,
    summary: "Delete an org context",
    description: "Author may delete their own org context while it's pending/rejected; an admin may delete any org context at any time.",
    security: [{ bearerAuth: [] }],
    responses: {
      200: {
        description: "Deleted",
        content: { "application/json": { schema: resolver(okResponseSchema) } },
      },
    },
  }),
  zValidator("param", idParamSchema),
  async (c) => {
    await deleteOrgContext(c.req.valid("param").id, c.get("user"));
    return c.json({ ok: true });
  },
);

orgContextRoutes.post(
  "/:id/resubmit",
  describeRoute({
    tags,
    summary: "Resubmit a rejected org context",
    description: "Moves a rejected org context back to 'pending' and clears its review note.",
    security: [{ bearerAuth: [] }],
    responses: {
      200: {
        description: "Resubmitted org context",
        content: { "application/json": { schema: resolver(orgContextSchema) } },
      },
    },
  }),
  zValidator("param", idParamSchema),
  async (c) => {
    const doc = await resubmitOrgContext(c.req.valid("param").id, c.get("user"));
    return c.json(serializeOrgContext(doc));
  },
);
