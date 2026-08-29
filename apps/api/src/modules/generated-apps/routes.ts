import { Hono } from "hono";
import { describeRoute, resolver, validator as zValidator } from "hono-openapi";
import { z } from "zod";
import {
  createGeneratedAppSchema,
  generatedAppSchema,
  generatedAppVersionSchema,
  objectIdSchema,
} from "@bismo/shared-schemas";
import { authenticatePlatformUser, type PlatformAppVariables } from "../../middleware/platformAuth";
import { listResponseSchema } from "../../lib/openapi-responses";
import {
  createGeneratedApp,
  downloadVersion,
  listMyGeneratedApps,
  listVersions,
  serializeGeneratedApp,
} from "./service";

const idParamSchema = z.object({ id: objectIdSchema });
const versionParamSchema = z.object({
  id: objectIdSchema,
  sha: z.string().regex(/^[0-9a-f]{7,40}$/),
});
const tags = ["Generated Apps"];

export const generatedAppRoutes = new Hono<{ Variables: PlatformAppVariables }>();

generatedAppRoutes.use("*", authenticatePlatformUser);

generatedAppRoutes.post(
  "/",
  describeRoute({
    tags,
    summary: "Generate an app from a catalog blueprint",
    security: [{ bearerAuth: [] }],
    responses: {
      201: {
        description: "Generated app",
        content: { "application/json": { schema: resolver(generatedAppSchema) } },
      },
    },
  }),
  zValidator("json", createGeneratedAppSchema),
  async (c) => {
    const input = c.req.valid("json");
    const platformUser = c.get("platformUser");
    const doc = await createGeneratedApp(input, platformUser.id);
    return c.json(await serializeGeneratedApp(doc), 201);
  },
);

generatedAppRoutes.get(
  "/",
  describeRoute({
    tags,
    summary: "List my generated apps",
    security: [{ bearerAuth: [] }],
    responses: {
      200: {
        description: "Generated apps",
        content: { "application/json": { schema: resolver(listResponseSchema(generatedAppSchema)) } },
      },
    },
  }),
  async (c) => {
    const platformUser = c.get("platformUser");
    const items = await listMyGeneratedApps(platformUser.id);
    return c.json({ items });
  },
);

generatedAppRoutes.get(
  "/:id/versions",
  describeRoute({
    tags,
    summary: "List a generated app's versions",
    security: [{ bearerAuth: [] }],
    responses: {
      200: {
        description: "Versions",
        content: { "application/json": { schema: resolver(listResponseSchema(generatedAppVersionSchema)) } },
      },
    },
  }),
  zValidator("param", idParamSchema),
  async (c) => {
    const { id } = c.req.valid("param");
    const platformUser = c.get("platformUser");
    const items = await listVersions(id, platformUser.id);
    return c.json({ items });
  },
);

generatedAppRoutes.get(
  "/:id/versions/:sha/download",
  describeRoute({
    tags,
    summary: "Download a version as a zip",
    security: [{ bearerAuth: [] }],
    responses: { 200: { description: "Zip archive" } },
  }),
  zValidator("param", versionParamSchema),
  async (c) => {
    const { id, sha } = c.req.valid("param");
    const platformUser = c.get("platformUser");
    const buffer = await downloadVersion(id, sha, platformUser.id);
    c.header("Content-Type", "application/zip");
    c.header("Content-Disposition", `attachment; filename="${id}-${sha.slice(0, 7)}.zip"`);
    return c.body(new Uint8Array(buffer));
  },
);
