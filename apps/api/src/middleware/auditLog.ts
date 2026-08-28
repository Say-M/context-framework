import type { Context } from "hono";
import { AuditLogModel } from "@bismo/db-models";

export type AuditAction =
  | "approve"
  | "reject"
  | "publish"
  | "login"
  | "role_change"
  | "invite"
  | "status_change";

interface RecordAuditParams {
  c: Context;
  actor: string;
  action: AuditAction;
  targetType: string;
  targetId: string;
  note?: string | null;
  metadata?: Record<string, unknown>;
}

/**
 * Called explicitly at the end of each mutating handler that needs an audit
 * trail, after the underlying write has already succeeded — never before,
 * so a failed attempt is never recorded as if it happened.
 */
export async function recordAudit({
  c,
  actor,
  action,
  targetType,
  targetId,
  note = null,
  metadata = {},
}: RecordAuditParams) {
  const ip =
    c.req.header("x-forwarded-for") ??
    c.req.header("cf-connecting-ip") ??
    null;
  await AuditLogModel.create({
    actor,
    action,
    targetType,
    targetId,
    note,
    metadata,
    ip,
  });
}
