import { Hono } from "hono";
import { describeRoute, resolver, validator as zValidator } from "hono-openapi";
import { z } from "zod";
import {
  appBlueprintSchema,
  blueprintFolderSchema,
  connectionsSchema,
  createAppBlueprintSchema,
  createBlueprintFolderSchema,
  listAppBlueprintsQuerySchema,
  objectIdSchema,
  okfManifestSchema,
  updateAppBlueprintMetadataSchema,
} from "@bismo/shared-schemas";
import { authenticate, type AppVariables } from "../../middleware/auth";
import { requireRole } from "../../middleware/rbac";
import { okResponseSchema, paginatedResponseSchema } from "../../lib/openapi-responses";
import {
  createAppBlueprint,
  createBlueprintFolder,
  deleteAppBlueprint,
  deleteBlueprintFolder,
  getAppBlueprint,
  getSectionTree,
  listAppBlueprints,
  previewManifest,
  publishAppBlueprint,
  serializeAppBlueprint,
  updateAppBlueprintMetadata,
  updateConnections,
} from "./service";

const idParamSchema = z.object({ id: objectIdSchema });
const folderIdParamSchema = z.object({ id: objectIdSchema, folderId: objectIdSchema });
const tags = ["App Blueprints"];

export const appBlueprintRoutes = new Hono<{ Variables: AppVariables }>();

appBlueprintRoutes.use("*", authenticate);

appBlueprintRoutes.get(
  "/",
  describeRoute({
    tags,
    summary: "List app blueprints",
    description: "Paginated list of app blueprints, optionally filtered by status.",
    security: [{ bearerAuth: [] }],
    responses: {
      200: {
        description: "Paginated app blueprints",
        content: { "application/json": { schema: resolver(paginatedResponseSchema(appBlueprintSchema)) } },
      },
    },
  }),
  zValidator("query", listAppBlueprintsQuerySchema),
  async (c) => {
    const result = await listAppBlueprints(c.req.valid("query"));
    return c.json(result);
  },
);

appBlueprintRoutes.post(
  "/",
  requireRole("author", "admin"),
  describeRoute({
    tags,
    summary: "Create an app blueprint (Studio Step 1)",
    description: "Creates a draft blueprint with its module connections and a root blueprint.md specification.",
    security: [{ bearerAuth: [] }],
    responses: {
      201: {
        description: "Created app blueprint",
        content: { "application/json": { schema: resolver(appBlueprintSchema) } },
      },
    },
  }),
  zValidator("json", createAppBlueprintSchema),
  async (c) => {
    const doc = await createAppBlueprint(c.req.valid("json"), c.get("user"));
    return c.json(serializeAppBlueprint(doc), 201);
  },
);

appBlueprintRoutes.get(
  "/:id",
  describeRoute({
    tags,
    summary: "Get an app blueprint",
    security: [{ bearerAuth: [] }],
    responses: {
      200: {
        description: "App blueprint",
        content: { "application/json": { schema: resolver(appBlueprintSchema) } },
      },
    },
  }),
  zValidator("param", idParamSchema),
  async (c) => {
    const doc = await getAppBlueprint(c.req.valid("param").id);
    return c.json(serializeAppBlueprint(doc));
  },
);

appBlueprintRoutes.patch(
  "/:id/connections",
  describeRoute({
    tags,
    summary: "Update module connections (Studio Step 1)",
    description: "Updates the selected business domains/model/org context before publish.",
    security: [{ bearerAuth: [] }],
    responses: {
      200: {
        description: "Updated app blueprint",
        content: { "application/json": { schema: resolver(appBlueprintSchema) } },
      },
    },
  }),
  zValidator("param", idParamSchema),
  zValidator("json", connectionsSchema),
  async (c) => {
    const doc = await updateConnections(
      c.req.valid("param").id,
      c.req.valid("json"),
      c.get("user"),
    );
    return c.json(serializeAppBlueprint(doc));
  },
);

appBlueprintRoutes.patch(
  "/:id/metadata",
  describeRoute({
    tags,
    summary: "Update blueprint metadata",
    description: "Updates the blueprint's name/description. Namespace is immutable once created.",
    security: [{ bearerAuth: [] }],
    responses: {
      200: {
        description: "Updated app blueprint",
        content: { "application/json": { schema: resolver(appBlueprintSchema) } },
      },
    },
  }),
  zValidator("param", idParamSchema),
  zValidator("json", updateAppBlueprintMetadataSchema),
  async (c) => {
    const doc = await updateAppBlueprintMetadata(
      c.req.valid("param").id,
      c.req.valid("json"),
      c.get("user"),
    );
    return c.json(serializeAppBlueprint(doc));
  },
);

appBlueprintRoutes.delete(
  "/:id",
  describeRoute({
    tags,
    summary: "Delete an app blueprint",
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
    await deleteAppBlueprint(c.req.valid("param").id, c.get("user"));
    return c.json({ ok: true });
  },
);

appBlueprintRoutes.get(
  "/:id/sections",
  describeRoute({
    tags,
    summary: "Get the 12-section blueprint tree (Studio Step 2)",
    description:
      "Returns the fixed 12 blueprint sections with their nested specifications and folders (folders nest to arbitrary depth, so the response body isn't schema-typed here).",
    security: [{ bearerAuth: [] }],
    responses: {
      200: {
        description: "Section tree",
      },
    },
  }),
  zValidator("param", idParamSchema),
  async (c) => {
    const tree = await getSectionTree(c.req.valid("param").id);
    return c.json(tree);
  },
);

appBlueprintRoutes.post(
  "/:id/folders",
  describeRoute({
    tags,
    summary: "Create a blueprint subfolder",
    description: "Creates a subfolder under a blueprint section, optionally nested under an existing folder (arbitrary depth).",
    security: [{ bearerAuth: [] }],
    responses: {
      201: {
        description: "Created folder",
        content: { "application/json": { schema: resolver(blueprintFolderSchema) } },
      },
    },
  }),
  zValidator("param", idParamSchema),
  zValidator("json", createBlueprintFolderSchema),
  async (c) => {
    const folder = await createBlueprintFolder(
      c.req.valid("param").id,
      c.req.valid("json"),
      c.get("user"),
    );
    return c.json(
      {
        id: String(folder._id),
        blueprintId: String(folder.blueprintId),
        section: folder.section,
        parentFolderId: folder.parentFolderId ? String(folder.parentFolderId) : null,
        name: folder.name,
        path: folder.path,
        createdBy: String(folder.createdBy),
        createdAt: folder.createdAt.toISOString(),
      },
      201,
    );
  },
);

appBlueprintRoutes.delete(
  "/:id/folders/:folderId",
  describeRoute({
    tags,
    summary: "Delete a blueprint subfolder",
    description: "Cascades: also removes every nested subfolder and specification beneath it.",
    security: [{ bearerAuth: [] }],
    responses: {
      200: {
        description: "Deleted",
        content: { "application/json": { schema: resolver(okResponseSchema) } },
      },
    },
  }),
  zValidator("param", folderIdParamSchema),
  async (c) => {
    const { id, folderId } = c.req.valid("param");
    await deleteBlueprintFolder(id, folderId, c.get("user"));
    return c.json({ ok: true });
  },
);

appBlueprintRoutes.get(
  "/:id/manifest",
  describeRoute({
    tags,
    summary: "Preview the okf.yaml manifest (Studio Step 3)",
    description: "Live-computed manifest preview, before publish freezes it into publishedManifest.",
    security: [{ bearerAuth: [] }],
    responses: {
      200: {
        description: "Manifest preview",
        content: { "application/json": { schema: resolver(okfManifestSchema) } },
      },
    },
  }),
  zValidator("param", idParamSchema),
  async (c) => {
    const manifest = await previewManifest(c.req.valid("param").id);
    return c.json(manifest);
  },
);

appBlueprintRoutes.post(
  "/:id/publish",
  describeRoute({
    tags,
    summary: "Publish an app blueprint",
    description: "Freezes the manifest, bumps the version, and moves the blueprint to 'pending' for admin review.",
    security: [{ bearerAuth: [] }],
    responses: {
      200: {
        description: "Published app blueprint",
        content: { "application/json": { schema: resolver(appBlueprintSchema) } },
      },
    },
  }),
  zValidator("param", idParamSchema),
  async (c) => {
    const doc = await publishAppBlueprint(c.req.valid("param").id, c.get("user"));
    return c.json(serializeAppBlueprint(doc));
  },
);
