import type { Model } from "mongoose";
import { AppBlueprintModel, BusinessDomainModel, BusinessModelModel, OrgContextModel } from "@bismo/db-models";
import type { ContentTypeSlug, ParentType } from "@bismo/shared-schemas";

export interface ContentTypeEntry {
  slug: ContentTypeSlug;
  parentType: ParentType;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Model: Model<any>;
  /** Default frontmatter.type for a Specification attached directly to this content type. */
  defaultSpecType: string;
}

// Every consumer (specifications, approvals) is written against this
// registry, not hard-coded model names.
export const CONTENT_TYPES: ContentTypeEntry[] = [
  {
    slug: "business-domain",
    parentType: "BusinessDomain",
    Model: BusinessDomainModel,
    defaultSpecType: "Domain Specification",
  },
  {
    slug: "business-model",
    parentType: "BusinessModel",
    Model: BusinessModelModel,
    defaultSpecType: "Model Specification",
  },
  {
    slug: "org-context",
    parentType: "OrgContext",
    Model: OrgContextModel,
    defaultSpecType: "Governance Specification",
  },
  {
    slug: "app-blueprint",
    parentType: "AppBlueprint",
    Model: AppBlueprintModel,
    // Fallback for any of the 12 sections not given a specific badge in
    // specifications/service.ts's APP_BLUEPRINT_SECTION_TYPES map.
    defaultSpecType: "Concept Specification Document",
  },
];

export function getContentTypeBySlug(slug: string): ContentTypeEntry {
  const entry = CONTENT_TYPES.find((e) => e.slug === slug);
  if (!entry) throw new Error(`Unknown content type slug: ${slug}`);
  return entry;
}

export function getContentTypeByParentType(parentType: string): ContentTypeEntry {
  const entry = CONTENT_TYPES.find((e) => e.parentType === parentType);
  if (!entry) throw new Error(`Unknown parentType: ${parentType}`);
  return entry;
}
