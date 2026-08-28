import { Hono } from "hono";
import { describeRoute, resolver, validator as zValidator } from "hono-openapi";
import { z } from "zod";
import {
  businessModelSchema,
  createBusinessModelSchema,
  listBusinessModelsQuerySchema,
  objectIdSchema,
  updateBusinessModelSchema,
} from "@bismo/shared-schemas";
import { authenticate, type AppVariables } from "../../middleware/auth";
import { requireRole } from "../../middleware/rbac";
import { okResponseSchema, paginatedResponseSchema } from "../../lib/openapi-responses";
import {
  createBusinessModel,
  deleteBusinessModel,
  getBusinessModel,
  listBusinessModels,
  resubmitBusinessModel,
  serializeBusinessModel,
  updateBusinessModel,
} from "./service";

const idParamSchema = z.object({ id: objectIdSchema });
const tags = ["Business Models"];

export const businessModelRoutes = new Hono<{ Variables: AppVariables }>();

businessModelRoutes.use("*", authenticate);

businessModelRoutes.get(
  "/",
  describeRoute({
    tags,
    summary: "List business models",
    description: "Paginated list of business models, optionally filtered by status/archetype category.",
    security: [{ bearerAuth: [] }],
    responses: {
      200: {
        description: "Paginated business models",
        content: { "application/json": { schema: resolver(paginatedResponseSchema(businessModelSchema)) } },
      },
    },
  }),
  zValidator("query", listBusinessModelsQuerySchema),
  async (c) => {
    const result = await listBusinessModels(c.req.valid("query"));
    return c.json(result);
  },
);

businessModelRoutes.post(
  "/",
  requireRole("author", "admin"),
  describeRoute({
    tags,
    summary: "Create a business model",
    description: "Creates a new business model, starting in 'pending' status for admin review.",
    security: [{ bearerAuth: [] }],
    responses: {
      201: {
        description: "Created business model",
        content: { "application/json": { schema: resolver(businessModelSchema) } },
      },
    },
  }),
  zValidator("json", createBusinessModelSchema),
  async (c) => {
    const doc = await createBusinessModel(c.req.valid("json"), c.get("user"));
    return c.json(serializeBusinessModel(doc), 201);
  },
);

businessModelRoutes.get(
  "/:id",
  describeRoute({
    tags,
    summary: "Get a business model",
    security: [{ bearerAuth: [] }],
    responses: {
      200: {
        description: "Business model",
        content: { "application/json": { schema: resolver(businessModelSchema) } },
      },
    },
  }),
  zValidator("param", idParamSchema),
  async (c) => {
    const doc = await getBusinessModel(c.req.valid("param").id);
    return c.json(serializeBusinessModel(doc));
  },
);

businessModelRoutes.patch(
  "/:id",
  describeRoute({
    tags,
    summary: "Update a business model",
    description:
      "Author may update their own model while it's pending/rejected; an admin may update any model at any time. No versioning applies to model fields (only its attached specifications are versioned).",
    security: [{ bearerAuth: [] }],
    responses: {
      200: {
        description: "Updated business model",
        content: { "application/json": { schema: resolver(businessModelSchema) } },
      },
    },
  }),
  zValidator("param", idParamSchema),
  zValidator("json", updateBusinessModelSchema),
  async (c) => {
    const doc = await updateBusinessModel(
      c.req.valid("param").id,
      c.req.valid("json"),
      c.get("user"),
    );
    return c.json(serializeBusinessModel(doc));
  },
);

businessModelRoutes.delete(
  "/:id",
  describeRoute({
    tags,
    summary: "Delete a business model",
    description: "Author may delete their own model while it's pending/rejected; an admin may delete any model at any time.",
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
    await deleteBusinessModel(c.req.valid("param").id, c.get("user"));
    return c.json({ ok: true });
  },
);

businessModelRoutes.post(
  "/:id/resubmit",
  describeRoute({
    tags,
    summary: "Resubmit a rejected business model",
    description: "Moves a rejected model back to 'pending' and clears its review note.",
    security: [{ bearerAuth: [] }],
    responses: {
      200: {
        description: "Resubmitted business model",
        content: { "application/json": { schema: resolver(businessModelSchema) } },
      },
    },
  }),
  zValidator("param", idParamSchema),
  async (c) => {
    const doc = await resubmitBusinessModel(c.req.valid("param").id, c.get("user"));
    return c.json(serializeBusinessModel(doc));
  },
);
