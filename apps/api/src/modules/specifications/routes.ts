import { Hono } from "hono";
import { describeRoute, resolver, validator as zValidator } from "hono-openapi";
import { z } from "zod";
import {
  contentVersionSchema,
  createSpecificationSchema,
  listSpecificationsQuerySchema,
  objectIdSchema,
  specificationSchema,
  updateSpecificationSchema,
} from "@bismo/shared-schemas";
import { authenticate, type AppVariables } from "../../middleware/auth";
import { listResponseSchema, okResponseSchema } from "../../lib/openapi-responses";
import {
  createSpecification,
  deleteSpecification,
  getSpecification,
  getSpecificationVersions,
  listSpecifications,
  serializeSpecification,
  updateSpecification,
} from "./service";

const idParamSchema = z.object({ id: objectIdSchema });
const tags = ["Specifications"];

export const specificationRoutes = new Hono<{ Variables: AppVariables }>();

specificationRoutes.use("*", authenticate);

specificationRoutes.get(
  "/",
  describeRoute({
    tags,
    summary: "List specifications for a parent",
    description: "Lists markdown specifications attached to a BusinessDomain, BusinessModel, OrgContext, or AppBlueprint (optionally scoped to one of the 12 blueprint sections).",
    security: [{ bearerAuth: [] }],
    responses: {
      200: {
        description: "Specifications",
        content: { "application/json": { schema: resolver(listResponseSchema(specificationSchema)) } },
      },
    },
  }),
  zValidator("query", listSpecificationsQuerySchema),
  async (c) => {
    const items = await listSpecifications(c.req.valid("query"));
    return c.json({ items });
  },
);

specificationRoutes.post(
  "/",
  describeRoute({
    tags,
    summary: "Create a specification",
    description: "Creates a new markdown specification. If the parent was approved, it's reopened for review.",
    security: [{ bearerAuth: [] }],
    responses: {
      201: {
        description: "Created specification",
        content: { "application/json": { schema: resolver(specificationSchema) } },
      },
    },
  }),
  zValidator("json", createSpecificationSchema),
  async (c) => {
    const doc = await createSpecification(c.req.valid("json"), c.get("user"));
    return c.json(serializeSpecification(doc), 201);
  },
);

specificationRoutes.get(
  "/:id",
  describeRoute({
    tags,
    summary: "Get a specification",
    security: [{ bearerAuth: [] }],
    responses: {
      200: {
        description: "Specification",
        content: { "application/json": { schema: resolver(specificationSchema) } },
      },
    },
  }),
  zValidator("param", idParamSchema),
  async (c) => {
    const doc = await getSpecification(c.req.valid("param").id);
    return c.json(serializeSpecification(doc));
  },
);

specificationRoutes.patch(
  "/:id",
  describeRoute({
    tags,
    summary: "Update a specification",
    description:
      "Only spec-level ownership is checked (no status gate). If the parent was approved at edit time, the current content is snapshotted as a new version, the spec's version is bumped, and the parent is reopened for review.",
    security: [{ bearerAuth: [] }],
    responses: {
      200: {
        description: "Updated specification",
        content: { "application/json": { schema: resolver(specificationSchema) } },
      },
    },
  }),
  zValidator("param", idParamSchema),
  zValidator("json", updateSpecificationSchema),
  async (c) => {
    const doc = await updateSpecification(
      c.req.valid("param").id,
      c.req.valid("json"),
      c.get("user"),
    );
    return c.json(serializeSpecification(doc));
  },
);

specificationRoutes.delete(
  "/:id",
  describeRoute({
    tags,
    summary: "Delete a specification",
    description: "If the parent was approved at delete time, the parent is reopened for review.",
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
    await deleteSpecification(c.req.valid("param").id, c.get("user"));
    return c.json({ ok: true });
  },
);

specificationRoutes.get(
  "/:id/versions",
  describeRoute({
    tags,
    summary: "Get a specification's version history",
    description: "Frozen snapshots captured each time an edit superseded the spec's content while its parent was approved.",
    security: [{ bearerAuth: [] }],
    responses: {
      200: {
        description: "Version history",
        content: { "application/json": { schema: resolver(listResponseSchema(contentVersionSchema)) } },
      },
    },
  }),
  zValidator("param", idParamSchema),
  async (c) => {
    const versions = await getSpecificationVersions(c.req.valid("param").id);
    return c.json({ items: versions });
  },
);
