import { useState } from "react";
import { format } from "date-fns";
import type { ApprovalQueueItem } from "@bismo/shared-schemas";
import { Button, StatusBadge } from "@bismo/ui";
import { useApprovalQueue, useApproveQueueItem, useRejectQueueItem } from "../queries";
import { RejectItemDialog } from "./RejectItemDialog";

const TYPE_LABELS: Record<ApprovalQueueItem["type"], string> = {
  "business-domain": "Business Domain",
  "business-model": "Business Model",
  "org-context": "Org Context",
  "app-blueprint": "App Blueprint",
};

export function ApprovalQueueList() {
  const { data, isLoading } = useApprovalQueue();
  const approve = useApproveQueueItem();
  const reject = useRejectQueueItem();
  const [rejectTarget, setRejectTarget] = useState<ApprovalQueueItem | null>(null);

  const items = data?.items ?? [];

  if (isLoading) return <p className="text-sm text-[var(--bismo-text-muted)]">Loading queue…</p>;
  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-[var(--bismo-border)] p-8 text-center text-sm text-[var(--bismo-text-muted)]">
        Nothing pending review right now.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {items.map((item) => (
        <div
          key={`${item.type}-${item.id}`}
          className="flex flex-col gap-3 rounded-lg border border-[var(--bismo-border)] bg-[var(--bismo-bg-elevated)] p-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-center gap-3">
            <StatusBadge variant="neutral">{TYPE_LABELS[item.type]}</StatusBadge>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs text-[var(--bismo-text-muted)]">{item.code}</span>
                <span className="font-semibold text-[var(--bismo-text)]">{item.name}</span>
              </div>
              <p className="text-xs text-[var(--bismo-text-muted)]">
                Submitted {format(new Date(item.submittedAt), "MMM d, yyyy p")}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="secondary"
              disabled={approve.isPending}
              onClick={() => setRejectTarget(item)}
            >
              Reject
            </Button>
            <Button
              size="sm"
              disabled={approve.isPending}
              onClick={() => approve.mutate({ type: item.type, id: item.id })}
            >
              Approve
            </Button>
          </div>
        </div>
      ))}

      {rejectTarget && (
        <RejectItemDialog
          open={!!rejectTarget}
          onOpenChange={(open) => !open && setRejectTarget(null)}
          itemName={rejectTarget.name}
          isPending={reject.isPending}
          onConfirm={(reason) => {
            reject.mutate(
              { type: rejectTarget.type, id: rejectTarget.id, reason },
              { onSuccess: () => setRejectTarget(null) },
            );
          }}
        />
      )}
    </div>
  );
}
