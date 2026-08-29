import { z } from "zod";
import { objectIdSchema } from "./common.schema";

export const catalogBlueprintSummarySchema = z.object({
  id: objectIdSchema,
  namespace: z.string(),
  name: z.string(),
  description: z.string(),
  version: z.string(),
});
export type CatalogBlueprintSummary = z.infer<typeof catalogBlueprintSummarySchema>;

export const catalogRefSchema = z.object({
  id: objectIdSchema,
  code: z.string(),
  name: z.string(),
});
export type CatalogRef = z.infer<typeof catalogRefSchema>;

export const catalogBlueprintDetailSchema = catalogBlueprintSummarySchema.extend({
  domains: z.array(catalogRefSchema),
  businessModel: catalogRefSchema.nullable(),
  orgContext: catalogRefSchema.nullable(),
});
export type CatalogBlueprintDetail = z.infer<typeof catalogBlueprintDetailSchema>;
