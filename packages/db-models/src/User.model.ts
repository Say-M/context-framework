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

const userSchema = new Schema(
  {
    email: { type: String, required: true },
    emailHash: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      enum: ["author", "admin"],
      required: true,
      default: "author",
    },
    status: {
      type: String,
      enum: ["pending_activation", "active", "disabled"],
      required: true,
      default: "pending_activation",
    },
    refreshTokenVersion: { type: Number, required: true, default: 0 },
    invitedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    lastLoginAt: { type: Date, default: null },
  },
  { timestamps: true },
);

// Must run on pre('validate'), not pre('save') — Mongoose runs schema
// validation (which requires emailHash to already be present) before any
// pre('save') hook fires, so computing it in pre('save') would always fail
// validation on a document where email is being set for the first time.
// Being pre('validate') also guarantees it runs before the encryption
// plugin's pre('save') hook, so it always sees the plaintext email.
userSchema.pre("validate", function (next) {
  if (this.isModified("email")) {
    this.emailHash = hmacLookupHash(this.email);
  }
  next();
});

userSchema.plugin(fieldEncryptionPlugin, { fields: ["email", "name"] });

userSchema.set("toJSON", {
  transform: (_doc, ret: Record<string, unknown>) => {
    delete ret.passwordHash;
    delete ret.emailHash;
    delete ret.__v;
    return ret;
  },
});

export type UserAttrs = InferSchemaType<typeof userSchema>;
export type UserDocument = HydratedDocument<UserAttrs>;
// Cast the `models.User` branch to the same concrete Model<T> type as the
// `model()` branch — otherwise TS infers a union of two differently
// overloaded call signatures and every .find/.create call on UserModel
// fails to typecheck.
export const UserModel =
  (models.User as Model<UserAttrs>) || model<UserAttrs>("User", userSchema);
