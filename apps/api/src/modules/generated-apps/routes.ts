import { Hono } from "hono";
import { describeRoute, resolver, validator as zValidator } from "hono-openapi";
import { z } from "zod";
import {
  chatMessageSchema,
  createGeneratedAppSchema,
  generatedAppSchema,
  generatedAppVersionSchema,
  objectIdSchema,
  planDecisionSchema,
  sendChatMessageSchema,
} from "@bismo/shared-schemas";
import { authenticatePlatformUser, type PlatformAppVariables } from "../../middleware/platformAuth";
import { listResponseSchema, okResponseSchema } from "../../lib/openapi-responses";
import {
  createGeneratedApp,
  decidePlan,
  deleteGeneratedApp,
  downloadVersion,
  getGeneratedApp,
  listChatMessages,
  listMyGeneratedApps,
  listVersions,
  sendChatMessage,
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
  "/:id",
  describeRoute({
    tags,
    summary: "Get a generated app",
    description: "Poll this for status/lastError while a generation is in progress.",
    security: [{ bearerAuth: [] }],
    responses: {
      200: {
        description: "Generated app",
        content: { "application/json": { schema: resolver(generatedAppSchema) } },
      },
    },
  }),
  zValidator("param", idParamSchema),
  async (c) => {
    const { id } = c.req.valid("param");
    const platformUser = c.get("platformUser");
    const doc = await getGeneratedApp(id, platformUser.id);
    return c.json(await serializeGeneratedApp(doc));
  },
);

generatedAppRoutes.delete(
  "/:id",
  describeRoute({
    tags,
    summary: "Delete a generated app",
    description: "Removes the database record and its on-disk repository. Rejected while status is 'working'.",
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
    const { id } = c.req.valid("param");
    const platformUser = c.get("platformUser");
    await deleteGeneratedApp(id, platformUser.id);
    return c.json({ ok: true });
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
  "/:id/messages",
  describeRoute({
    tags,
    summary: "List a generated app's chat history",
    security: [{ bearerAuth: [] }],
    responses: {
      200: {
        description: "Chat messages",
        content: { "application/json": { schema: resolver(listResponseSchema(chatMessageSchema)) } },
      },
    },
  }),
  zValidator("param", idParamSchema),
  async (c) => {
    const { id } = c.req.valid("param");
    const platformUser = c.get("platformUser");
    const items = await listChatMessages(id, platformUser.id);
    return c.json({ items });
  },
);

generatedAppRoutes.post(
  "/:id/messages",
  describeRoute({
    tags,
    summary: "Send a chat message",
    description: "Runs a fresh agent turn against the app's existing repo. Rejected with 409 while a turn is already in progress.",
    security: [{ bearerAuth: [] }],
    responses: {
      201: {
        description: "The created user message",
        content: { "application/json": { schema: resolver(chatMessageSchema) } },
      },
    },
  }),
  zValidator("param", idParamSchema),
  zValidator("json", sendChatMessageSchema),
  async (c) => {
    const { id } = c.req.valid("param");
    const { content, mode } = c.req.valid("json");
    const platformUser = c.get("platformUser");
    const message = await sendChatMessage(id, content, mode, platformUser.id);
    return c.json(message, 201);
  },
);

generatedAppRoutes.post(
  "/:id/plan/decision",
  describeRoute({
    tags,
    summary: "Approve or request changes on a Plan-mode proposal",
    description: "Resolves the paused agent turn. Rejected with 409 if no plan is currently awaiting approval.",
    security: [{ bearerAuth: [] }],
    responses: {
      200: {
        description: "Decision recorded",
        content: { "application/json": { schema: resolver(okResponseSchema) } },
      },
    },
  }),
  zValidator("param", idParamSchema),
  zValidator("json", planDecisionSchema),
  async (c) => {
    const { id } = c.req.valid("param");
    const { decision, feedback } = c.req.valid("json");
    const platformUser = c.get("platformUser");
    await decidePlan(id, decision, feedback, platformUser.id);
    return c.json({ ok: true });
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
