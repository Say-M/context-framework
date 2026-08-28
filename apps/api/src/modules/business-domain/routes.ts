import { Hono } from "hono";
import { describeRoute, resolver, validator as zValidator } from "hono-openapi";
import { z } from "zod";
import {
  businessDomainSchema,
  createBusinessDomainSchema,
  listBusinessDomainsQuerySchema,
  objectIdSchema,
  updateBusinessDomainSchema,
} from "@bismo/shared-schemas";
import { authenticate, type AppVariables } from "../../middleware/auth";
import { requireRole } from "../../middleware/rbac";
import { okResponseSchema, paginatedResponseSchema } from "../../lib/openapi-responses";
import {
  createBusinessDomain,
  deleteBusinessDomain,
  getBusinessDomain,
  listBusinessDomains,
  resubmitBusinessDomain,
  serializeBusinessDomain,
  updateBusinessDomain,
} from "./service";

const idParamSchema = z.object({ id: objectIdSchema });
const tags = ["Business Domains"];

export const businessDomainRoutes = new Hono<{ Variables: AppVariables }>();

businessDomainRoutes.use("*", authenticate);

businessDomainRoutes.get(
  "/",
  describeRoute({
    tags,
    summary: "List business domains",
    description: "Paginated list of business domains, optionally filtered by status/category.",
    security: [{ bearerAuth: [] }],
    responses: {
      200: {
        description: "Paginated business domains",
        content: { "application/json": { schema: resolver(paginatedResponseSchema(businessDomainSchema)) } },
      },
    },
  }),
  zValidator("query", listBusinessDomainsQuerySchema),
  async (c) => {
    const result = await listBusinessDomains(c.req.valid("query"));
    return c.json(result);
  },
);

businessDomainRoutes.post(
  "/",
  requireRole("author", "admin"),
  describeRoute({
    tags,
    summary: "Create a business domain",
    description: "Creates a new business domain, starting in 'pending' status for admin review.",
    security: [{ bearerAuth: [] }],
    responses: {
      201: {
        description: "Created business domain",
        content: { "application/json": { schema: resolver(businessDomainSchema) } },
      },
    },
  }),
  zValidator("json", createBusinessDomainSchema),
  async (c) => {
    const doc = await createBusinessDomain(c.req.valid("json"), c.get("user"));
    return c.json(serializeBusinessDomain(doc), 201);
  },
);

businessDomainRoutes.get(
  "/:id",
  describeRoute({
    tags,
    summary: "Get a business domain",
    security: [{ bearerAuth: [] }],
    responses: {
      200: {
        description: "Business domain",
        content: { "application/json": { schema: resolver(businessDomainSchema) } },
      },
    },
  }),
  zValidator("param", idParamSchema),
  async (c) => {
    const doc = await getBusinessDomain(c.req.valid("param").id);
    return c.json(serializeBusinessDomain(doc));
  },
);

businessDomainRoutes.patch(
  "/:id",
  describeRoute({
    tags,
    summary: "Update a business domain",
    description:
      "Author may update their own domain while it's pending/rejected; an admin may update any domain at any time. No versioning applies to domain fields (only its attached specifications are versioned).",
    security: [{ bearerAuth: [] }],
    responses: {
      200: {
        description: "Updated business domain",
        content: { "application/json": { schema: resolver(businessDomainSchema) } },
      },
    },
  }),
  zValidator("param", idParamSchema),
  zValidator("json", updateBusinessDomainSchema),
  async (c) => {
    const doc = await updateBusinessDomain(
      c.req.valid("param").id,
      c.req.valid("json"),
      c.get("user"),
    );
    return c.json(serializeBusinessDomain(doc));
  },
);

businessDomainRoutes.delete(
  "/:id",
  describeRoute({
    tags,
    summary: "Delete a business domain",
    description: "Author may delete their own domain while it's pending/rejected; an admin may delete any domain at any time.",
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
    await deleteBusinessDomain(c.req.valid("param").id, c.get("user"));
    return c.json({ ok: true });
  },
);

businessDomainRoutes.post(
  "/:id/resubmit",
  describeRoute({
    tags,
    summary: "Resubmit a rejected business domain",
    description: "Moves a rejected domain back to 'pending' and clears its review note.",
    security: [{ bearerAuth: [] }],
    responses: {
      200: {
        description: "Resubmitted business domain",
        content: { "application/json": { schema: resolver(businessDomainSchema) } },
      },
    },
  }),
  zValidator("param", idParamSchema),
  async (c) => {
    const doc = await resubmitBusinessDomain(c.req.valid("param").id, c.get("user"));
    return c.json(serializeBusinessDomain(doc));
  },
);
