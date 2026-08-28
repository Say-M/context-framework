import { HTTPException } from "hono/http-exception";
import { UserModel, hmacLookupHash, type UserDocument } from "@bismo/db-models";
import type { InviteUserInput, ActivateAccountInput, LoginInput } from "@bismo/shared-schemas";
import {
  signAccessToken,
  signInviteToken,
  signRefreshToken,
  verifyInviteToken,
  verifyRefreshToken,
} from "../../lib/jwt";

export async function inviteUser(input: InviteUserInput, invitedBy: string) {
  const emailHash = hmacLookupHash(input.email);
  const existing = await UserModel.findOne({ emailHash });
  if (existing) {
    throw new HTTPException(409, { message: "A user with this email already exists" });
  }

  const user = await UserModel.create({
    email: input.email,
    name: input.email, // placeholder until the invitee sets their real name at activation
    role: input.role,
    status: "pending_activation",
    passwordHash: "unset", // never a valid Bun.password hash; login is blocked by status anyway
    invitedBy,
  });

  const inviteToken = await signInviteToken(String(user._id));
  return { user, inviteToken };
}

export async function activateAccount(input: ActivateAccountInput) {
  let userId: string;
  try {
    const payload = await verifyInviteToken(input.token);
    userId = payload.sub;
  } catch {
    throw new HTTPException(401, { message: "Invite link is invalid or has expired" });
  }

  const user = await UserModel.findById(userId);
  if (!user || user.status !== "pending_activation") {
    throw new HTTPException(400, { message: "This invite has already been used" });
  }

  user.name = input.name;
  user.passwordHash = await Bun.password.hash(input.password, "argon2id");
  user.status = "active";
  await user.save();

  return issueSession(user);
}

export async function login(input: LoginInput) {
  const emailHash = hmacLookupHash(input.email);
  const user = await UserModel.findOne({ emailHash });
  if (!user || user.status !== "active") {
    throw new HTTPException(401, { message: "Invalid email or password" });
  }

  const valid = await Bun.password.verify(input.password, user.passwordHash);
  if (!valid) {
    throw new HTTPException(401, { message: "Invalid email or password" });
  }

  user.lastLoginAt = new Date();
  await user.save();

  return issueSession(user);
}

export async function refreshSession(refreshToken: string) {
  let payload;
  try {
    payload = await verifyRefreshToken(refreshToken);
  } catch {
    throw new HTTPException(401, { message: "Session expired, please log in again" });
  }

  const user = await UserModel.findById(payload.sub);
  if (!user || user.status !== "active") {
    throw new HTTPException(401, { message: "Session expired, please log in again" });
  }
  // Reuse-detection: a refresh token minted for an older tokenVersion means
  // it was already rotated once before — treat this as token theft and
  // invalidate the entire chain rather than silently accepting it.
  if (payload.tokenVersion !== user.refreshTokenVersion) {
    user.refreshTokenVersion += 1;
    await user.save();
    throw new HTTPException(401, { message: "Session invalidated, please log in again" });
  }

  return issueSession(user);
}

async function issueSession(user: UserDocument) {
  const accessToken = await signAccessToken({
    id: String(user._id),
    role: user.role,
    refreshTokenVersion: user.refreshTokenVersion,
  });
  const refreshToken = await signRefreshToken({
    id: String(user._id),
    refreshTokenVersion: user.refreshTokenVersion,
  });

  return {
    accessToken,
    refreshToken,
    user: {
      id: String(user._id),
      email: user.email,
      name: user.name,
      role: user.role,
      status: user.status,
      lastLoginAt: user.lastLoginAt ? user.lastLoginAt.toISOString() : null,
    },
  };
}

export async function invalidateAllSessions(userId: string) {
  await UserModel.updateOne({ _id: userId }, { $inc: { refreshTokenVersion: 1 } });
}
