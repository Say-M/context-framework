import crypto from "node:crypto";

const AES_ALGO = "aes-256-gcm";
const IV_LENGTH = 12;
const KEY_LENGTH = 32;

let cachedEncryptionKey: Buffer | null = null;
let cachedHashSecret: Buffer | null = null;

/**
 * Lazily resolved (not read at module-import time) so this package never
 * depends on load order relative to apps/api's own zod-validated env
 * bootstrap — the first field save/read after boot is what fails fast if
 * misconfigured, not module import.
 */
export function getEncryptionKey(): Buffer {
  if (cachedEncryptionKey) return cachedEncryptionKey;
  const raw = process.env.PII_ENCRYPTION_KEY;
  if (!raw) throw new Error("PII_ENCRYPTION_KEY is not set");
  const key = Buffer.from(raw, "base64");
  if (key.length !== KEY_LENGTH) {
    throw new Error(
      `PII_ENCRYPTION_KEY must decode to exactly ${KEY_LENGTH} bytes, got ${key.length}`,
    );
  }
  cachedEncryptionKey = key;
  return key;
}

export function getEmailHashSecret(): Buffer {
  if (cachedHashSecret) return cachedHashSecret;
  const raw = process.env.EMAIL_HASH_SECRET;
  if (!raw) throw new Error("EMAIL_HASH_SECRET is not set");
  const secret = Buffer.from(raw, "base64");
  if (secret.length < KEY_LENGTH) {
    throw new Error(
      `EMAIL_HASH_SECRET must decode to at least ${KEY_LENGTH} bytes, got ${secret.length}`,
    );
  }
  cachedHashSecret = secret;
  return secret;
}

const ENCRYPTED_FORMAT = /^[A-Za-z0-9+/=]+:[A-Za-z0-9+/=]+:[A-Za-z0-9+/=]+$/;

export function looksEncrypted(value: string): boolean {
  return ENCRYPTED_FORMAT.test(value);
}

export function encryptField(plaintext: string, key: Buffer): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(AES_ALGO, key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return [
    iv.toString("base64"),
    authTag.toString("base64"),
    ciphertext.toString("base64"),
  ].join(":");
}

export function decryptField(payload: string, key: Buffer): string {
  const [ivB64, authTagB64, cipherB64] = payload.split(":");
  if (!ivB64 || !authTagB64 || !cipherB64) {
    throw new Error("Malformed encrypted field payload");
  }
  const iv = Buffer.from(ivB64, "base64");
  const authTag = Buffer.from(authTagB64, "base64");
  const ciphertext = Buffer.from(cipherB64, "base64");
  const decipher = crypto.createDecipheriv(AES_ALGO, key, iv);
  decipher.setAuthTag(authTag);
  const plaintext = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);
  return plaintext.toString("utf8");
}

/** Deterministic lookup hash for an otherwise-encrypted field (e.g. email). */
export function hmacLookupHash(value: string): string {
  return crypto
    .createHmac("sha256", getEmailHashSecret())
    .update(value.trim().toLowerCase())
    .digest("hex");
}
