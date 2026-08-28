import { sign, verify } from "hono/jwt";
import { env } from "../config/env";
import type { Role } from "@bismo/shared-schemas";

const ISSUER = "bismo-api";
const AUDIENCE = "bismo-web";

const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
const REFRESH_TOKEN_TTL_SECONDS = 14 * 24 * 60 * 60;
const INVITE_TOKEN_TTL_SECONDS = 48 * 60 * 60;

function nowSeconds() {
  return Math.floor(Date.now() / 1000);
}

// The index signature is required to satisfy hono/jwt's JWTPayload type.
export interface AccessTokenPayload {
  sub: string;
  role: Role;
  tokenVersion: number;
  iss: string;
  aud: string;
  exp: number;
  iat: number;
  [key: string]: unknown;
}

export interface RefreshTokenPayload {
  sub: string;
  tokenVersion: number;
  iss: string;
  aud: string;
  exp: number;
  iat: number;
  [key: string]: unknown;
}

export interface InviteTokenPayload {
  sub: string;
  iss: string;
  aud: string;
  exp: number;
  iat: number;
  [key: string]: unknown;
}

// Algorithm is always pinned explicitly (never taken from the token header)
// to eliminate alg-confusion attacks.
const ALG = "HS256";

export async function signAccessToken(user: {
  id: string;
  role: Role;
  refreshTokenVersion: number;
}) {
  const iat = nowSeconds();
  const payload: AccessTokenPayload = {
    sub: user.id,
    role: user.role,
    tokenVersion: user.refreshTokenVersion,
    iss: ISSUER,
    aud: AUDIENCE,
    iat,
    exp: iat + ACCESS_TOKEN_TTL_SECONDS,
  };
  return sign(payload, env.JWT_ACCESS_SECRET, ALG);
}

export async function verifyAccessToken(token: string) {
  const payload = (await verify(
    token,
    env.JWT_ACCESS_SECRET,
    ALG,
  )) as unknown as AccessTokenPayload;
  if (payload.iss !== ISSUER || payload.aud !== AUDIENCE) {
    throw new Error("Invalid token issuer/audience");
  }
  return payload;
}

export async function signRefreshToken(user: {
  id: string;
  refreshTokenVersion: number;
}) {
  const iat = nowSeconds();
  const payload: RefreshTokenPayload = {
    sub: user.id,
    tokenVersion: user.refreshTokenVersion,
    iss: ISSUER,
    aud: AUDIENCE,
    iat,
    exp: iat + REFRESH_TOKEN_TTL_SECONDS,
  };
  return sign(payload, env.JWT_REFRESH_SECRET, ALG);
}

export async function verifyRefreshToken(token: string) {
  const payload = (await verify(
    token,
    env.JWT_REFRESH_SECRET,
    ALG,
  )) as unknown as RefreshTokenPayload;
  if (payload.iss !== ISSUER || payload.aud !== AUDIENCE) {
    throw new Error("Invalid token issuer/audience");
  }
  return payload;
}

export async function signInviteToken(userId: string) {
  const iat = nowSeconds();
  const payload: InviteTokenPayload = {
    sub: userId,
    iss: ISSUER,
    aud: AUDIENCE,
    iat,
    exp: iat + INVITE_TOKEN_TTL_SECONDS,
  };
  return sign(payload, env.JWT_INVITE_SECRET, ALG);
}

export async function verifyInviteToken(token: string) {
  const payload = (await verify(
    token,
    env.JWT_INVITE_SECRET,
    ALG,
  )) as unknown as InviteTokenPayload;
  if (payload.iss !== ISSUER || payload.aud !== AUDIENCE) {
    throw new Error("Invalid token issuer/audience");
  }
  return payload;
}

export const REFRESH_COOKIE_NAME = "refresh_token";
export const REFRESH_COOKIE_MAX_AGE_SECONDS = REFRESH_TOKEN_TTL_SECONDS;
