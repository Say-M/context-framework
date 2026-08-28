import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ApprovalStatusBadge, Button, ConfirmDialog, StatusBadge } from "@bismo/ui";
import { useAuth } from "@/context/AuthContext";
import { SpecificationPanel } from "@/features/specifications/components/SpecificationPanel";
import { useDeleteOrgContext, useOrgContext, useResubmitOrgContext } from "../queries";
import { CreateOrgContextDialog } from "./CreateOrgContextDialog";

export function OrgContextDetailPanel({ contextId }: { contextId: string | null }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: ctx, isLoading } = useOrgContext(contextId);
  const resubmit = useResubmitOrgContext();
  const deleteContext = useDeleteOrgContext();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  if (!contextId) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-[var(--bismo-text-muted)]">
        Select an organization context to view its details.
      </div>
    );
  }

  if (isLoading || !ctx) {
    return <div className="flex-1 p-6 text-sm text-[var(--bismo-text-muted)]">Loading…</div>;
  }

  const isOwner = user?.id === ctx.createdBy;
  const isAdmin = user?.role === "admin";
  const isEditableStatus = ctx.status === "pending" || ctx.status === "rejected";
  const canEdit = isAdmin || (isOwner && isEditableStatus);
  const canResubmit = ctx.status === "rejected" && (isOwner || isAdmin);

  return (
    <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded bg-[var(--bismo-bg-hover)] px-2 py-0.5 font-mono text-xs text-[var(--bismo-text-muted)]">
              {ctx.code}
            </span>
            <span className="text-xs text-[var(--bismo-text-muted)]">{ctx.structureType}</span>
          </div>
          <h2 className="mt-1 text-2xl font-bold text-[var(--bismo-text)]">{ctx.name}</h2>
        </div>
        <div className="flex items-center gap-2">
          <ApprovalStatusBadge status={ctx.status} />
          {canEdit && (
            <Button size="sm" variant="secondary" onClick={() => setEditOpen(true)}>
              Edit
            </Button>
          )}
          {canEdit && (
            <Button size="sm" variant="destructive" onClick={() => setDeleteOpen(true)}>
              Delete
            </Button>
          )}
        </div>
      </div>

      {ctx.status === "rejected" && ctx.reviewNote && (
        <div className="rounded-md border border-[var(--bismo-status-rejected)]/40 bg-[var(--bismo-status-rejected)]/10 p-3 text-sm text-[var(--bismo-text)]">
          <p className="font-medium text-[var(--bismo-status-rejected)]">Rejected: {ctx.reviewNote}</p>
          {canResubmit && (
            <Button
              size="sm"
              variant="secondary"
              className="mt-2"
              disabled={resubmit.isPending}
              onClick={() => resubmit.mutate(ctx.id)}
            >
              {resubmit.isPending ? "Resubmitting…" : "Resubmit for review"}
            </Button>
          )}
        </div>
      )}

      <p className="text-sm text-[var(--bismo-text-muted)]">{ctx.description}</p>

      <div className="grid grid-cols-2 gap-4">
        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--bismo-accent-org)]">
            Legal Entities & Subsidiaries
          </h3>
          <ul className="list-inside list-disc space-y-1 text-sm text-[var(--bismo-text)]">
            {ctx.legalEntities.length === 0 && (
              <li className="list-none text-[var(--bismo-text-muted)]">None listed.</li>
            )}
            {ctx.legalEntities.map((entity) => (
              <li key={entity}>{entity}</li>
            ))}
          </ul>
        </section>
        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--bismo-accent-domain)]">
            Operating Locations & Hubs
          </h3>
          <ul className="list-inside list-disc space-y-1 text-sm text-[var(--bismo-text)]">
            {ctx.operatingLocations.length === 0 && (
              <li className="list-none text-[var(--bismo-text-muted)]">None listed.</li>
            )}
            {ctx.operatingLocations.map((loc) => (
              <li key={loc}>{loc}</li>
            ))}
          </ul>
        </section>
      </div>

      <section className="rounded-lg border border-[var(--bismo-border)] bg-[var(--bismo-bg-elevated)] p-4">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--bismo-accent-blueprint)]">
          Delegation of Authority (DoA) Expenditure Thresholds
        </h3>
        {ctx.doaTiers.length === 0 ? (
          <p className="text-sm text-[var(--bismo-text-muted)]">No approval tiers defined yet.</p>
        ) : (
          <ul className="space-y-1.5 text-sm text-[var(--bismo-text)]">
            {ctx.doaTiers.map((tier) => (
              <li key={tier} className="rounded bg-[var(--bismo-bg-hover)] px-3 py-1.5">
                {tier}
              </li>
            ))}
          </ul>
        )}
        <div className="mt-3 flex items-center gap-2">
          <span className="text-xs text-[var(--bismo-text-muted)]">Compliance:</span>
          <div className="flex flex-wrap gap-1.5">
            {ctx.complianceTags.length === 0 && (
              <span className="text-xs text-[var(--bismo-text-muted)]">None listed.</span>
            )}
            {ctx.complianceTags.map((tag) => (
              <StatusBadge key={tag} variant="approved">
                {tag}
              </StatusBadge>
            ))}
          </div>
        </div>
      </section>

      <SpecificationPanel
        parentType="OrgContext"
        parentId={ctx.id}
        parentName={ctx.name}
        pathPrefix={ctx.code.toLowerCase()}
        sectionTitle="Context Specifications"
        canManageSpecs={isOwner || isAdmin}
        accentColor="var(--bismo-accent-org)"
      />

      <CreateOrgContextDialog open={editOpen} onOpenChange={setEditOpen} existing={ctx} />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={`Delete "${ctx.name}"?`}
        description="This permanently removes the org context and all of its specifications. This can't be undone."
        confirmLabel="Delete"
        isPending={deleteContext.isPending}
        onConfirm={() =>
          deleteContext.mutate(ctx.id, {
            onSuccess: () => {
              setDeleteOpen(false);
              navigate({ to: "/org-contexts", search: { selected: undefined } });
            },
          })
        }
      />
    </div>
  );
}
