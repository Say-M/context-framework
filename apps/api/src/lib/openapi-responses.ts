import { z } from "zod";

// Small response-only shapes reused across routes.ts files purely to
// describe response bodies for the Scalar/OpenAPI docs — not part of the
// shared client/server input contract in @bismo/shared-schemas.
export const okResponseSchema = z.object({ ok: z.literal(true) });

export function listResponseSchema<T extends z.ZodTypeAny>(item: T) {
  return z.object({ items: z.array(item) });
}

export function paginatedResponseSchema<T extends z.ZodTypeAny>(item: T) {
  return z.object({
    items: z.array(item),
    page: z.number(),
    limit: z.number(),
    total: z.number(),
  });
}
