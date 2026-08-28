import type { AppBlueprintStatus } from "@bismo/shared-schemas";
import { ApprovalStatusBadge, StatusBadge } from "@bismo/ui";

/**
 * AppBlueprint has a 4th status ('draft') that the other 3 modules don't —
 * a draft hasn't been submitted for review yet, so it must never be shown
 * as "Pending" (which specifically means "awaiting admin review").
 */
export function AppBlueprintStatusBadge({ status }: { status: AppBlueprintStatus }) {
  if (status === "draft") return <StatusBadge variant="neutral">Draft</StatusBadge>;
  return <ApprovalStatusBadge status={status} />;
}
