import { HTTPException } from "hono/http-exception";
import { UserModel, type UserDocument } from "@bismo/db-models";
import type {
  ListUsersQuery,
  UpdateUserRoleInput,
  UpdateUserStatusInput,
} from "@bismo/shared-schemas";
import type { AuthUser } from "../../middleware/auth";

export function serializePublicUser(doc: UserDocument) {
  return {
    id: String(doc._id),
    email: doc.email,
    name: doc.name,
    role: doc.role,
    status: doc.status,
    lastLoginAt: doc.lastLoginAt ? doc.lastLoginAt.toISOString() : null,
  };
}

export async function listUsers(query: ListUsersQuery) {
  const skip = (query.page - 1) * query.limit;
  // Encrypted email can't be searched server-side by regex, so `search` here
  // only matches name — consistent with the other modules' free-text search
  // being best-effort, not exhaustive.
  const filter: Record<string, unknown> = {};
  if (query.search) {
    filter.name = { $regex: query.search, $options: "i" };
  }

  const [items, total] = await Promise.all([
    UserModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(query.limit),
    UserModel.countDocuments(filter),
  ]);

  return {
    items: items.map(serializePublicUser),
    page: query.page,
    limit: query.limit,
    total,
  };
}

async function getUserOrThrow(id: string) {
  const doc = await UserModel.findById(id);
  if (!doc) throw new HTTPException(404, { message: "User not found" });
  return doc;
}

function assertNotSelf(targetId: string, actor: AuthUser, message: string) {
  if (targetId === actor.id) {
    throw new HTTPException(400, { message });
  }
}

export async function updateUserRole(id: string, input: UpdateUserRoleInput, actor: AuthUser) {
  assertNotSelf(id, actor, "You can't change your own role");
  const doc = await getUserOrThrow(id);
  doc.role = input.role;
  await doc.save();
  return doc;
}

export async function updateUserStatus(id: string, input: UpdateUserStatusInput, actor: AuthUser) {
  assertNotSelf(id, actor, "You can't disable your own account");
  const doc = await getUserOrThrow(id);
  doc.status = input.status;
  if (input.status === "disabled") {
    // Also kills any outstanding refresh tokens immediately, rather than
    // waiting for the access token to expire on its own.
    doc.refreshTokenVersion += 1;
  }
  await doc.save();
  return doc;
}
