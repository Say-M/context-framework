import { Schema, type Types } from "mongoose";

// Mirrors the fields `approvablePlugin` adds at runtime via `schema.add()`.
// InferSchemaType can't see those (they're added after schema construction,
// not part of the literal passed to `new Schema({...})`), so every content
// model intersects its own InferSchemaType with this by hand.
//
// Generic over the status union so AppBlueprint can add its pre-publish
// 'draft' status without loosening the type for BusinessDomain/BusinessModel/
// OrgContext, which stay exactly 'pending'|'approved'|'rejected'.
export interface ApprovableFields<TStatus extends string = "pending" | "approved" | "rejected"> {
  status: TStatus;
  createdBy: Types.ObjectId;
  reviewedBy: Types.ObjectId | null;
  reviewNote: string | null;
  reviewedAt: Date | null;
  submittedAt: Date;
}

export interface ApprovablePluginOptions {
  /** @default ["pending", "approved", "rejected"] */
  statuses?: string[];
  /** @default "pending" */
  defaultStatus?: string;
}

/**
 * Shared pending/approved/rejected review fields applied to every content
 * module (BusinessDomain, BusinessModel, OrgContext, AppBlueprint) so the
 * cross-module Approval Queue can query all four collections with one
 * consistent shape.
 *
 * AppBlueprint overrides `statuses`/`defaultStatus` to add a 'draft' status:
 * a blueprint isn't submitted for review until the author explicitly clicks
 * Publish, unlike the other 3 modules where creation itself submits it.
 */
export function approvablePlugin(schema: Schema, options: ApprovablePluginOptions = {}) {
  const statuses = options.statuses ?? ["pending", "approved", "rejected"];
  const defaultStatus = options.defaultStatus ?? "pending";
  schema.add({
    status: {
      type: String,
      enum: statuses,
      default: defaultStatus,
      index: true,
    },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    reviewedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    reviewNote: { type: String, default: null },
    reviewedAt: { type: Date, default: null },
    submittedAt: { type: Date, default: () => new Date() },
  });
}
