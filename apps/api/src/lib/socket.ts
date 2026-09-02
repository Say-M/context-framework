import { Server as Engine } from "@socket.io/bun-engine";
import { Server } from "socket.io";
import { GeneratedAppModel, StudioThreadModel } from "@bismo/db-models";
import { env } from "../config/env";
import { verifyPlatformAccessToken } from "./jwt";

export type ProgressEvent =
  | { type: "assistant_text"; text: string }
  | { type: "tool_use"; tool: string; summary: string }
  | { type: "plan_proposed"; plan: string }
  | { type: "done"; status: "idle" | "failed"; lastError: string | null };

interface SocketData {
  platformUserId: string;
}

// Late joiners (a client that connects mid-generation, or reconnects) don't
// get Socket.IO room history for free — this backlog is what lets a fresh
// subscribe catch up before it starts receiving live events. Capped per id
// and dropped a while after the generation settles, so this stays bounded
// without a DB table for what's genuinely ephemeral progress.
const BACKLOG_LIMIT = 200;
const BACKLOG_TTL_MS = 10 * 60 * 1000;
const backlogs = new Map<string, ProgressEvent[]>();
const backlogTimers = new Map<string, ReturnType<typeof setTimeout>>();

export const io = new Server<
  { subscribe: (payload: { generatedAppId?: string; studioThreadId?: string }) => void },
  // The emitted field stays `generatedAppId` even for a Studio subscription
  // (it just holds a threadId then) — this is really "the room id",
  // unchanged to avoid touching generator-web's already-working consumer.
  { progress: (payload: { generatedAppId: string; event: ProgressEvent }) => void },
  Record<string, never>,
  SocketData
>();

export const engine = new Engine({
  path: "/socket.io/",
  cors: { origin: [env.GENERATOR_WEB_ORIGIN, env.STUDIO_WEB_ORIGIN] },
});
io.bind(engine);

// Auth travels in Socket.IO's own handshake payload, not a header or a URL
// query string — the browser's native WebSocket API can't set custom
// headers on the handshake, and a query-string token is one careless log
// line away from leaking.
io.use(async (socket, next) => {
  const token = socket.handshake.auth?.token;
  if (typeof token !== "string") {
    next(new Error("Missing token"));
    return;
  }
  try {
    const payload = await verifyPlatformAccessToken(token);
    socket.data.platformUserId = payload.sub;
    next();
  } catch {
    next(new Error("Invalid or expired token"));
  }
});

io.on("connection", (socket) => {
  socket.on("subscribe", async (payload) => {
    const id = payload?.generatedAppId ?? payload?.studioThreadId;
    if (typeof id !== "string") return;

    // Same ownership rule as every other endpoint for the resource being
    // subscribed to — a platform user only ever sees their own generated
    // apps / Studio threads. Room ids (Mongo ObjectIds) are unique across
    // collections, so a GeneratedApp id and a StudioThread id can never
    // collide as the same room. Branched (not a shared `ownerModel`
    // variable) because Mongoose's `findById` overloads don't unify across
    // differently-typed models.
    const createdBy = payload?.generatedAppId
      ? (await GeneratedAppModel.findById(id).select("createdBy"))?.createdBy
      : (await StudioThreadModel.findById(id).select("createdBy"))?.createdBy;
    if (!createdBy || String(createdBy) !== socket.data.platformUserId) return;

    socket.join(id);
    for (const event of backlogs.get(id) ?? []) {
      socket.emit("progress", { generatedAppId: id, event });
    }
  });
});

/** Broadcasts a progress event to every socket subscribed to `generatedAppId`, and remembers it for late joiners. */
export function publish(generatedAppId: string, event: ProgressEvent) {
  const backlog = backlogs.get(generatedAppId) ?? [];
  backlog.push(event);
  if (backlog.length > BACKLOG_LIMIT) backlog.shift();
  backlogs.set(generatedAppId, backlog);

  io.to(generatedAppId).emit("progress", { generatedAppId, event });

  if (event.type === "done") {
    io.socketsLeave(generatedAppId);
    const existingTimer = backlogTimers.get(generatedAppId);
    if (existingTimer) clearTimeout(existingTimer);
    backlogTimers.set(
      generatedAppId,
      setTimeout(() => {
        backlogs.delete(generatedAppId);
        backlogTimers.delete(generatedAppId);
      }, BACKLOG_TTL_MS),
    );
  }
}
