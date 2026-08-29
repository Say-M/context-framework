import { HTTPException } from "hono/http-exception";
import { PlatformUserModel, hmacLookupHash, type PlatformUserDocument } from "@bismo/db-models";
import type { PlatformLoginInput, PlatformSignupInput } from "@bismo/shared-schemas";
import {
  signPlatformAccessToken,
  signPlatformRefreshToken,
  verifyPlatformRefreshToken,
} from "../../lib/jwt";

export async function signup(input: PlatformSignupInput) {
  const emailHash = hmacLookupHash(input.email);
  const existing = await PlatformUserModel.findOne({ emailHash });
  if (existing) {
    throw new HTTPException(409, { message: "An account with this email already exists" });
  }

  const user = await PlatformUserModel.create({
    email: input.email,
    name: input.name,
    passwordHash: await Bun.password.hash(input.password, "argon2id"),
    status: "active",
  });

  return issueSession(user);
}

export async function login(input: PlatformLoginInput) {
  const emailHash = hmacLookupHash(input.email);
  const user = await PlatformUserModel.findOne({ emailHash });
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
    payload = await verifyPlatformRefreshToken(refreshToken);
  } catch {
    throw new HTTPException(401, { message: "Session expired, please log in again" });
  }

  const user = await PlatformUserModel.findById(payload.sub);
  if (!user || user.status !== "active") {
    throw new HTTPException(401, { message: "Session expired, please log in again" });
  }
  // Reuse-detection: see auth/service.ts's refreshSession for the rationale.
  if (payload.tokenVersion !== user.refreshTokenVersion) {
    user.refreshTokenVersion += 1;
    await user.save();
    throw new HTTPException(401, { message: "Session invalidated, please log in again" });
  }

  return issueSession(user);
}

async function issueSession(user: PlatformUserDocument) {
  const accessToken = await signPlatformAccessToken({
    id: String(user._id),
    refreshTokenVersion: user.refreshTokenVersion,
  });
  const refreshToken = await signPlatformRefreshToken({
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
      createdAt: user.createdAt.toISOString(),
    },
  };
}
