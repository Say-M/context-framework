import matter from "gray-matter";
import { format } from "date-fns";

export interface SpecFrontmatterFields {
  type: string;
  title: string;
  trustTier: string;
  status: string;
  staleAfter: Date;
}

/**
 * Builds the full `.md` file (YAML frontmatter + body) exactly as the
 * "Raw Source" toggle displays it — snake_case keys, date-only stale_after —
 * matching the product's existing spec document format.
 */
export function buildRawSource(fields: SpecFrontmatterFields, content: string): string {
  return matter.stringify(content, {
    type: fields.type,
    title: fields.title,
    trust_tier: fields.trustTier,
    status: fields.status,
    stale_after: format(fields.staleAfter, "yyyy-MM-dd"),
  });
}
