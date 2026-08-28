import { z } from "zod";
import { objectIdSchema } from "./common.schema";

export const contentVersionSchema = z.object({
  id: objectIdSchema,
  // Number for the 3 simple modules' integer counter, string for
  // AppBlueprint's "vX.Y.Z" — kept loose here since `snapshot` itself is
  // also intentionally untyped (it's a frozen bag of whatever fields that
  // module had at the time).
  version: z.union([z.number(), z.string()]),
  snapshot: z.record(z.string(), z.unknown()),
  createdBy: objectIdSchema,
  approvedBy: objectIdSchema.nullable(),
  approvedAt: z.string().datetime().nullable(),
  supersededAt: z.string().datetime(),
});
export type ContentVersion = z.infer<typeof contentVersionSchema>;
