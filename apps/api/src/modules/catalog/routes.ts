import { Hono } from "hono";
import { describeRoute, resolver, validator as zValidator } from "hono-openapi";
import { z } from "zod";
import {
  catalogBlueprintDetailSchema,
  catalogBlueprintSummarySchema,
  objectIdSchema,
} from "@bismo/shared-schemas";
import { listResponseSchema } from "../../lib/openapi-responses";
import { getCatalogBlueprint, listCatalogBlueprints } from "./service";

const idParamSchema = z.object({ id: objectIdSchema });
const tags = ["Catalog"];

export const catalogRoutes = new Hono();

catalogRoutes.get(
  "/blueprints",
  describeRoute({
    tags,
    summary: "List publicly available blueprints",
    description: "Every blueprint that has reached status 'approved' — no separate publish step.",
    responses: {
      200: {
        description: "Blueprints",
        content: {
          "application/json": { schema: resolver(listResponseSchema(catalogBlueprintSummarySchema)) },
        },
      },
    },
  }),
  async (c) => {
    const items = await listCatalogBlueprints();
    return c.json({ items });
  },
);

catalogRoutes.get(
  "/blueprints/:id",
  describeRoute({
    tags,
    summary: "Get a publicly available blueprint",
    responses: {
      200: {
        description: "Blueprint",
        content: { "application/json": { schema: resolver(catalogBlueprintDetailSchema) } },
      },
    },
  }),
  zValidator("param", idParamSchema),
  async (c) => {
    const { id } = c.req.valid("param");
    const detail = await getCatalogBlueprint(id);
    return c.json(detail);
  },
);
