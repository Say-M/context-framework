import { Hono, type Context } from "hono";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import { sign, verify } from "hono/jwt";
import { randomBytes } from "node:crypto";
import path from "node:path";
import {
  acceptInvite,
  countUsers,
  createInvite,
  createOwner,
  deleteUser,
  findByInviteToken,
  findUserByEmail,
  findUserById,
  listUsers,
  type DashboardUserRow,
} from "./store";
import { loadSchema } from "./schema";

const SESSION_COOKIE = "dashboard_session";
const SESSION_TTL_SECONDS = 60 * 60;
const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const ALG = "HS256";
const MIN_PASSWORD_LENGTH = 8;

function publicUser(row: DashboardUserRow) {
  return { id: row.id, email: row.email, role: row.role };
}

function readEmail(body: Record<string, unknown>): string {
  return String(body.email ?? "").trim().toLowerCase();
}

/**
 * Mounts the shared, non-agent-written admin dashboard at /__dashboard on
 * an already-built Hono app. Its own auth (bun:sqlite, see store.ts) is
 * entirely self-contained per deployment — the first person to open the
 * dashboard on a fresh instance sets an email+password and becomes its
 * owner; nothing here ever calls back to BISMO. Data reads/writes are not
 * proxied through this router — the dashboard's frontend calls the app's
 * own real /api/<entity> endpoints directly, so this never bypasses
 * whatever validation the generated routes already enforce.
 */
export function mountDashboard(app: Hono) {
  const router = new Hono();
  const rawSecret = process.env.DASHBOARD_SESSION_SECRET;

  if (!rawSecret) {
    router.all("*", (c) => c.json({ error: "Dashboard is not configured (missing DASHBOARD_SESSION_SECRET)." }, 503));
    app.route("/__dashboard", router);
    return;
  }
  // A fresh, explicitly-typed binding — referencing the plain `rawSecret`
  // (declared type `string | undefined`) inside the nested function
  // declarations below wouldn't carry this guard's narrowing with it.
  const secret: string = rawSecret;

  const schemaPath = path.join(import.meta.dir, "..", "..", "prisma", "schema.prisma");
  const publicDir = path.join(import.meta.dir, "public");

  async function requireSession(c: Context): Promise<DashboardUserRow | null> {
    const token = getCookie(c, SESSION_COOKIE);
    if (!token) return null;
    try {
      const payload = (await verify(token, secret, ALG)) as { sub: string };
      const user = findUserById(Number(payload.sub));
      return user && user.passwordHash ? user : null;
    } catch {
      return null;
    }
  }

  async function requireOwner(c: Context): Promise<DashboardUserRow | null> {
    const user = await requireSession(c);
    return user && user.role === "owner" ? user : null;
  }

  async function startSession(c: Context, user: DashboardUserRow) {
    const token = await sign(
      { sub: String(user.id), exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS },
      secret,
      ALG,
    );
    setCookie(c, SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: "Strict",
      path: "/",
      maxAge: SESSION_TTL_SECONDS,
    });
  }

  const servePage = async () => {
    const file = Bun.file(path.join(publicDir, "index.html"));
    return new Response(file, { headers: { "Content-Type": "text/html; charset=utf-8" } });
  };
  router.get("/", servePage);
  router.get("/accept-invite/:token", servePage);

  router.get("/api/session", async (c) => {
    const user = await requireSession(c);
    if (!user) return c.json({ authenticated: false, needsSetup: countUsers() === 0 });
    return c.json({ authenticated: true, user: publicUser(user) });
  });

  router.post("/api/setup", async (c) => {
    if (countUsers() > 0) return c.json({ error: "This dashboard has already been set up." }, 409);
    const body = await c.req.json().catch(() => ({}));
    const email = readEmail(body);
    const password = String(body.password ?? "");
    if (!email || password.length < MIN_PASSWORD_LENGTH) {
      return c.json({ error: `Email and a ${MIN_PASSWORD_LENGTH}+ character password are required.` }, 400);
    }
    const passwordHash = await Bun.password.hash(password, "argon2id");
    const user = createOwner(email, passwordHash);
    await startSession(c, user);
    return c.json({ user: publicUser(user) }, 201);
  });

  router.post("/api/login", async (c) => {
    const body = await c.req.json().catch(() => ({}));
    const email = readEmail(body);
    const password = String(body.password ?? "");
    const user = findUserByEmail(email);
    if (!user || !user.passwordHash || !(await Bun.password.verify(password, user.passwordHash))) {
      return c.json({ error: "Invalid email or password." }, 401);
    }
    await startSession(c, user);
    return c.json({ user: publicUser(user) });
  });

  router.post("/api/logout", async (c) => {
    deleteCookie(c, SESSION_COOKIE, { path: "/" });
    return c.json({ ok: true });
  });

  router.get("/api/schema", async (c) => {
    const user = await requireSession(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    return c.json({ models: loadSchema(schemaPath) });
  });

  router.get("/api/users", async (c) => {
    const owner = await requireOwner(c);
    if (!owner) return c.json({ error: "Owner access required." }, 403);
    return c.json({ items: listUsers().map(publicUser) });
  });

  router.post("/api/users/invite", async (c) => {
    const owner = await requireOwner(c);
    if (!owner) return c.json({ error: "Owner access required." }, 403);
    const body = await c.req.json().catch(() => ({}));
    const email = readEmail(body);
    if (!email) return c.json({ error: "Email is required." }, 400);
    if (findUserByEmail(email)) return c.json({ error: "That email is already a dashboard user." }, 409);
    const token = randomBytes(24).toString("hex");
    createInvite(email, token, Date.now() + INVITE_TTL_MS);
    return c.json({ inviteUrl: `/__dashboard/accept-invite/${token}` }, 201);
  });

  router.delete("/api/users/:id", async (c) => {
    const owner = await requireOwner(c);
    if (!owner) return c.json({ error: "Owner access required." }, 403);
    const id = Number(c.req.param("id"));
    if (id === owner.id) return c.json({ error: "The owner account can't be removed." }, 400);
    deleteUser(id);
    return c.json({ ok: true });
  });

  router.get("/api/invite/:token", async (c) => {
    const invite = findByInviteToken(c.req.param("token"));
    if (!invite || !invite.inviteExpiresAt || invite.inviteExpiresAt < Date.now()) {
      return c.json({ error: "This invite link is invalid or has expired." }, 404);
    }
    return c.json({ email: invite.email });
  });

  router.post("/api/accept-invite", async (c) => {
    const body = await c.req.json().catch(() => ({}));
    const token = String(body.token ?? "");
    const password = String(body.password ?? "");
    const invite = findByInviteToken(token);
    if (!invite || !invite.inviteExpiresAt || invite.inviteExpiresAt < Date.now()) {
      return c.json({ error: "This invite link is invalid or has expired." }, 404);
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      return c.json({ error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.` }, 400);
    }
    const passwordHash = await Bun.password.hash(password, "argon2id");
    const user = acceptInvite(invite.id, passwordHash);
    await startSession(c, user);
    return c.json({ user: publicUser(user) });
  });

  app.route("/__dashboard", router);
}
