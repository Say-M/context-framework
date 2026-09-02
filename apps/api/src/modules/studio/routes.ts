import { Hono } from "hono";
import { describeRoute, resolver, validator as zValidator } from "hono-openapi";
import { z } from "zod";
import {
  createStudioThreadSchema,
  objectIdSchema,
  sendStudioMessageSchema,
  studioArtifactSchema,
  studioMessageSchema,
  studioThreadSchema,
  updateStudioArtifactSchema,
} from "@bismo/shared-schemas";
import { authenticatePlatformUser, type PlatformAppVariables } from "../../middleware/platformAuth";
import { listResponseSchema } from "../../lib/openapi-responses";
import {
  createStudioThread,
  getStudioArtifact,
  getStudioThread,
  listMyStudioThreads,
  listStudioArtifacts,
  listStudioMessages,
  readStudioArtifactImage,
  sendStudioMessage,
  updateStudioArtifact,
} from "./service";

const idParamSchema = z.object({ id: objectIdSchema });
const tags = ["Studio"];

export const studioRoutes = new Hono<{ Variables: PlatformAppVariables }>();

studioRoutes.use("*", authenticatePlatformUser);

studioRoutes.post(
  "/threads",
  describeRoute({
    tags,
    summary: "Start a new Studio thread",
    security: [{ bearerAuth: [] }],
    responses: {
      201: { description: "Thread", content: { "application/json": { schema: resolver(studioThreadSchema) } } },
    },
  }),
  zValidator("json", createStudioThreadSchema),
  async (c) => {
    const input = c.req.valid("json");
    const platformUser = c.get("platformUser");
    const thread = await createStudioThread(input, platformUser.id);
    return c.json(thread, 201);
  },
);

studioRoutes.get(
  "/threads",
  describeRoute({
    tags,
    summary: "List my Studio threads",
    security: [{ bearerAuth: [] }],
    responses: {
      200: {
        description: "Threads",
        content: { "application/json": { schema: resolver(listResponseSchema(studioThreadSchema)) } },
      },
    },
  }),
  async (c) => {
    const platformUser = c.get("platformUser");
    const items = await listMyStudioThreads(platformUser.id);
    return c.json({ items });
  },
);

studioRoutes.get(
  "/threads/:id",
  describeRoute({
    tags,
    summary: "Get a Studio thread",
    security: [{ bearerAuth: [] }],
    responses: {
      200: { description: "Thread", content: { "application/json": { schema: resolver(studioThreadSchema) } } },
    },
  }),
  zValidator("param", idParamSchema),
  async (c) => {
    const { id } = c.req.valid("param");
    const platformUser = c.get("platformUser");
    const thread = await getStudioThread(id, platformUser.id);
    return c.json(thread);
  },
);

studioRoutes.get(
  "/threads/:id/messages",
  describeRoute({
    tags,
    summary: "List a thread's messages",
    security: [{ bearerAuth: [] }],
    responses: {
      200: {
        description: "Messages",
        content: { "application/json": { schema: resolver(listResponseSchema(studioMessageSchema)) } },
      },
    },
  }),
  zValidator("param", idParamSchema),
  async (c) => {
    const { id } = c.req.valid("param");
    const platformUser = c.get("platformUser");
    const items = await listStudioMessages(id, platformUser.id);
    return c.json({ items });
  },
);

studioRoutes.post(
  "/threads/:id/messages",
  describeRoute({
    tags,
    summary: "Send a message",
    description: "Runs an agent turn. Rejected with 409 while a turn is already in progress.",
    security: [{ bearerAuth: [] }],
    responses: {
      201: {
        description: "The created user message",
        content: { "application/json": { schema: resolver(studioMessageSchema) } },
      },
    },
  }),
  zValidator("param", idParamSchema),
  zValidator("json", sendStudioMessageSchema),
  async (c) => {
    const { id } = c.req.valid("param");
    const { content, deepResearch } = c.req.valid("json");
    const platformUser = c.get("platformUser");
    const message = await sendStudioMessage(id, content, platformUser.id, deepResearch);
    return c.json(message, 201);
  },
);

studioRoutes.get(
  "/threads/:id/artifacts",
  describeRoute({
    tags,
    summary: "List a thread's artifacts",
    description: "Every artifact created or updated in this thread — a thread can hold several at once.",
    security: [{ bearerAuth: [] }],
    responses: {
      200: {
        description: "Artifacts",
        content: { "application/json": { schema: resolver(listResponseSchema(studioArtifactSchema)) } },
      },
    },
  }),
  zValidator("param", idParamSchema),
  async (c) => {
    const { id } = c.req.valid("param");
    const platformUser = c.get("platformUser");
    const items = await listStudioArtifacts(id, platformUser.id);
    return c.json({ items });
  },
);

studioRoutes.get(
  "/artifacts/:id",
  describeRoute({
    tags,
    summary: "Get an artifact",
    security: [{ bearerAuth: [] }],
    responses: {
      200: { description: "Artifact", content: { "application/json": { schema: resolver(studioArtifactSchema) } } },
    },
  }),
  zValidator("param", idParamSchema),
  async (c) => {
    const { id } = c.req.valid("param");
    const platformUser = c.get("platformUser");
    const artifact = await getStudioArtifact(id, platformUser.id);
    return c.json(artifact);
  },
);

studioRoutes.get(
  "/artifacts/:id/image",
  describeRoute({
    tags,
    summary: "Get an image artifact's raw file",
    security: [{ bearerAuth: [] }],
    responses: { 200: { description: "Image bytes" } },
  }),
  zValidator("param", idParamSchema),
  async (c) => {
    const { id } = c.req.valid("param");
    const platformUser = c.get("platformUser");
    const { buffer, mimeType } = await readStudioArtifactImage(id, platformUser.id);
    c.header("Content-Type", mimeType);
    return c.body(new Uint8Array(buffer));
  },
);

studioRoutes.patch(
  "/artifacts/:id",
  describeRoute({
    tags,
    summary: "Save edits to an artifact",
    description: "Bumps the artifact's version.",
    security: [{ bearerAuth: [] }],
    responses: {
      200: { description: "Artifact", content: { "application/json": { schema: resolver(studioArtifactSchema) } } },
    },
  }),
  zValidator("param", idParamSchema),
  zValidator("json", updateStudioArtifactSchema),
  async (c) => {
    const { id } = c.req.valid("param");
    const update = c.req.valid("json");
    const platformUser = c.get("platformUser");
    const artifact = await updateStudioArtifact(id, platformUser.id, update);
    return c.json(artifact);
  },
);
