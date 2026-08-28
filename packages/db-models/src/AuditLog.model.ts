import {
  Schema,
  model,
  models,
  type HydratedDocument,
  type InferSchemaType,
  type Model,
} from "mongoose";

const auditLogSchema = new Schema(
  {
    actor: { type: Schema.Types.ObjectId, ref: "User", required: true },
    action: {
      type: String,
      enum: [
        "approve",
        "reject",
        "publish",
        "login",
        "role_change",
        "invite",
        "status_change",
      ],
      required: true,
    },
    targetType: { type: String, required: true },
    targetId: { type: Schema.Types.ObjectId, required: true },
    note: { type: String, default: null },
    metadata: { type: Schema.Types.Mixed, default: {} },
    ip: { type: String, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

// Append-only: no route in apps/api ever calls update/delete on this model.
auditLogSchema.index({ targetType: 1, targetId: 1, createdAt: -1 });

export type AuditLogAttrs = InferSchemaType<typeof auditLogSchema>;
export type AuditLogDocument = HydratedDocument<AuditLogAttrs>;
export const AuditLogModel =
  (models.AuditLog as Model<AuditLogAttrs>) ||
  model<AuditLogAttrs>("AuditLog", auditLogSchema);
