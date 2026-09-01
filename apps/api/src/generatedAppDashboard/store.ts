import { Database } from "bun:sqlite";
import path from "node:path";

export interface DashboardUserRow {
  id: number;
  email: string;
  passwordHash: string | null;
  role: "owner" | "member";
  inviteToken: string | null;
  inviteExpiresAt: number | null;
  createdAt: number;
}

// A tiny, self-contained store for the dashboard's own auth — deliberately
// separate from the generated app's real database (Mongo or Postgres via
// Prisma), so this never touches the agent-authored schema.prisma or
// requires a migration. bun:sqlite is a Bun-native built-in, so this needs
// no new dependency in the generated app's package.json.
let dbInstance: Database | null = null;

function db(): Database {
  if (dbInstance) return dbInstance;
  const dbPath = path.join(import.meta.dir, "..", "..", "dashboard.db");
  dbInstance = new Database(dbPath, { create: true });
  dbInstance.run(`
    CREATE TABLE IF NOT EXISTS dashboard_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      passwordHash TEXT,
      role TEXT NOT NULL DEFAULT 'member',
      inviteToken TEXT,
      inviteExpiresAt INTEGER,
      createdAt INTEGER NOT NULL
    )
  `);
  return dbInstance;
}

function toRow(r: unknown): DashboardUserRow {
  return r as DashboardUserRow;
}

export function countUsers(): number {
  const result = db().query("SELECT COUNT(*) as count FROM dashboard_users").get() as { count: number };
  return result.count;
}

export function createOwner(email: string, passwordHash: string): DashboardUserRow {
  const r = db()
    .query("INSERT INTO dashboard_users (email, passwordHash, role, createdAt) VALUES (?, ?, 'owner', ?) RETURNING *")
    .get(email, passwordHash, Date.now());
  return toRow(r);
}

export function createInvite(email: string, token: string, expiresAt: number): DashboardUserRow {
  const r = db()
    .query(
      "INSERT INTO dashboard_users (email, role, inviteToken, inviteExpiresAt, createdAt) VALUES (?, 'member', ?, ?, ?) RETURNING *",
    )
    .get(email, token, expiresAt, Date.now());
  return toRow(r);
}

export function findUserByEmail(email: string): DashboardUserRow | null {
  const r = db().query("SELECT * FROM dashboard_users WHERE email = ?").get(email);
  return r ? toRow(r) : null;
}

export function findUserById(id: number): DashboardUserRow | null {
  const r = db().query("SELECT * FROM dashboard_users WHERE id = ?").get(id);
  return r ? toRow(r) : null;
}

export function findByInviteToken(token: string): DashboardUserRow | null {
  const r = db().query("SELECT * FROM dashboard_users WHERE inviteToken = ?").get(token);
  return r ? toRow(r) : null;
}

export function acceptInvite(id: number, passwordHash: string): DashboardUserRow {
  const r = db()
    .query(
      "UPDATE dashboard_users SET passwordHash = ?, inviteToken = NULL, inviteExpiresAt = NULL WHERE id = ? RETURNING *",
    )
    .get(passwordHash, id);
  return toRow(r);
}

export function listUsers(): DashboardUserRow[] {
  const rows = db().query("SELECT * FROM dashboard_users ORDER BY createdAt ASC").all();
  return rows.map(toRow);
}

export function deleteUser(id: number): void {
  db().query("DELETE FROM dashboard_users WHERE id = ?").run(id);
}
