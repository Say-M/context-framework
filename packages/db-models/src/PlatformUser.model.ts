import {
  Schema,
  model,
  models,
  type HydratedDocument,
  type InferSchemaType,
  type Model,
} from "mongoose";
import { fieldEncryptionPlugin } from "./plugins/fieldEncryption.plugin";
import { hmacLookupHash } from "./lib/crypto";

// Self-service public accounts for the generator app — deliberately separate
// from User.model.ts (BISMO's invite-only internal author/admin accounts):
// no role, no invite flow, status defaults straight to 'active'.
const platformUserSchema = new Schema(
  {
    email: { type: String, required: true },
    emailHash: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    passwordHash: { type: String, required: true },
    status: {
      type: String,
      enum: ["active", "disabled"],
      required: true,
      default: "active",
    },
    refreshTokenVersion: { type: Number, required: true, default: 0 },
    lastLoginAt: { type: Date, default: null },
  },
  { timestamps: true },
);

// See User.model.ts for why this must be pre('validate'), not pre('save').
platformUserSchema.pre("validate", function (next) {
  if (this.isModified("email")) {
    this.emailHash = hmacLookupHash(this.email);
  }
  next();
});

platformUserSchema.plugin(fieldEncryptionPlugin, { fields: ["email", "name"] });

platformUserSchema.set("toJSON", {
  transform: (_doc, ret: Record<string, unknown>) => {
    delete ret.passwordHash;
    delete ret.emailHash;
    delete ret.__v;
    return ret;
  },
});

export type PlatformUserAttrs = InferSchemaType<typeof platformUserSchema>;
export type PlatformUserDocument = HydratedDocument<PlatformUserAttrs>;
export const PlatformUserModel =
  (models.PlatformUser as Model<PlatformUserAttrs>) ||
  model<PlatformUserAttrs>("PlatformUser", platformUserSchema);
