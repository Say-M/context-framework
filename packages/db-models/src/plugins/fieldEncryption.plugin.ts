import type { Schema } from "mongoose";
import {
  decryptField,
  encryptField,
  getEncryptionKey,
  looksEncrypted,
} from "../lib/crypto";

export interface FieldEncryptionOptions {
  fields: string[];
}

/**
 * Transparent AES-256-GCM field-level encryption for PII.
 *
 * Encrypts `fields` in place on save (so a raw DB dump never exposes
 * plaintext), and decrypts them in place after a document is hydrated from a
 * query. Deliberately does NOT use Mongoose SchemaType getters/setters,
 * whose behavior around document hydration from queries is inconsistent
 * across versions — pre('save')/post('init') hooks are explicit and easy to
 * reason about instead.
 *
 * Caveat: `.lean()` queries bypass `init()` and will return ciphertext
 * as-is. Never use `.lean()` when a caller needs decrypted values.
 */
export function fieldEncryptionPlugin(
  schema: Schema,
  options: FieldEncryptionOptions,
) {
  const { fields } = options;

  schema.pre("save", function (next) {
    const stash: Record<string, string> = {};
    for (const field of fields) {
      if (!this.isModified(field)) continue;
      const value = this.get(field) as string | undefined;
      if (typeof value !== "string" || value.length === 0) continue;
      if (looksEncrypted(value)) continue; // already encrypted, don't double-encrypt
      stash[field] = value;
      this.set(field, encryptField(value, getEncryptionKey()));
    }
    // $locals is a plain per-instance bag Mongoose provides for exactly this:
    // passing data between pre/post middleware without persisting it or
    // risking a leak if post('save') never fires.
    this.$locals.__plainFields = stash;
    next();
  });

  // Restore plaintext on the in-memory document after a successful write so
  // the caller's reference (e.g. `user` after `await user.save()`) keeps
  // reading decrypted values rather than the ciphertext just persisted.
  schema.post("save", function (doc) {
    const stash = doc.$locals.__plainFields as
      | Record<string, string>
      | undefined;
    if (!stash) return;
    for (const [field, plaintext] of Object.entries(stash)) {
      doc.set(field, plaintext);
    }
  });

  schema.post("init", function (doc) {
    for (const field of fields) {
      const value = doc.get(field) as string | undefined;
      if (typeof value !== "string" || value.length === 0) continue;
      if (!looksEncrypted(value)) continue;
      doc.set(field, decryptField(value, getEncryptionKey()));
    }
  });
}
