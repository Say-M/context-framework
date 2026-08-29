import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ApprovalStatusBadge, Button, ConfirmDialog } from "@bismo/ui";
import { useAuth } from "@/context/AuthContext";
import { SpecificationPanel } from "@/features/specifications/components/SpecificationPanel";
import {
  useBusinessDomain,
  useDeleteBusinessDomain,
  useResubmitBusinessDomain,
} from "../queries";
import { CreateBusinessDomainDialog } from "./CreateBusinessDomainDialog";

export function BusinessDomainDetailPanel({
  domainId,
  onBack,
}: {
  domainId: string | null;
  onBack: () => void;
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: domain, isLoading } = useBusinessDomain(domainId);
  const resubmit = useResubmitBusinessDomain();
  const deleteDomain = useDeleteBusinessDomain();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  if (!domainId) {
    return (
      <div className="hidden flex-1 items-center justify-center text-sm text-[var(--bismo-text-muted)] lg:flex">
        Select a business domain to view its details.
      </div>
    );
  }

  if (isLoading || !domain) {
    return (
      <div className="flex-1 p-6 text-sm text-[var(--bismo-text-muted)]">
        Loading…
      </div>
    );
  }

  const isOwner = user?.id === domain.createdBy;
  const isAdmin = user?.role === "admin";
  const isEditableStatus =
    domain.status === "pending" || domain.status === "rejected";
  const canEdit = isAdmin || (isOwner && isEditableStatus);
  const canResubmit = domain.status === "rejected" && (isOwner || isAdmin);

  return (
    <div className="flex w-full flex-1 flex-col gap-6 overflow-y-auto p-4 sm:p-6">
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1 text-sm text-[var(--bismo-text-muted)] hover:underline lg:hidden"
      >
        ← Back to Business Domains
      </button>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded bg-[var(--bismo-bg-hover)] px-2 py-0.5 font-mono text-xs text-[var(--bismo-text-muted)]">
              {domain.code}
            </span>
            <span className="text-xs text-[var(--bismo-text-muted)]">
              {domain.category}
            </span>
          </div>
          <h2 className="mt-1 text-2xl font-bold text-[var(--bismo-text)]">
            {domain.name}
          </h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ApprovalStatusBadge status={domain.status} />
          {canEdit && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setEditOpen(true)}
            >
              Edit
            </Button>
          )}
          {canEdit && (
            <Button
              size="sm"
              variant="destructive"
              onClick={() => setDeleteOpen(true)}
            >
              Delete
            </Button>
          )}
        </div>
      </div>

      {domain.status === "rejected" && domain.reviewNote && (
        <div className="rounded-md border border-[var(--bismo-status-rejected)]/40 bg-[var(--bismo-status-rejected)]/10 p-3 text-sm text-[var(--bismo-text)]">
          <p className="font-medium text-[var(--bismo-status-rejected)]">
            Rejected: {domain.reviewNote}
          </p>
          {canResubmit && (
            <Button
              size="sm"
              variant="secondary"
              className="mt-2"
              disabled={resubmit.isPending}
              onClick={() => resubmit.mutate(domain.id)}
            >
              {resubmit.isPending ? "Resubmitting…" : "Resubmit for review"}
            </Button>
          )}
        </div>
      )}

      <p className="text-sm text-[var(--bismo-text-muted)]">
        {domain.description}
      </p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--bismo-accent-domain)]">
            Core Domain Capabilities
          </h3>
          <ul className="list-inside list-disc space-y-1 text-sm text-[var(--bismo-text)]">
            {domain.capabilities.length === 0 && (
              <li className="text-[var(--bismo-text-muted)] list-none">
                None listed.
              </li>
            )}
            {domain.capabilities.map((cap) => (
              <li key={cap}>{cap}</li>
            ))}
          </ul>
        </section>
        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--bismo-accent-model)]">
            Standard Domain Entities
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {domain.keyEntities.map((entity) => (
              <span
                key={entity}
                className="rounded bg-[var(--bismo-bg-hover)] px-2 py-1 font-mono text-xs text-[var(--bismo-text)]"
              >
                {entity}
              </span>
            ))}
          </div>
        </section>
      </div>

      <SpecificationPanel
        parentType="BusinessDomain"
        parentId={domain.id}
        parentName={domain.name}
        pathPrefix={domain.code.toLowerCase()}
        sectionTitle="Domain Specifications"
        canManageSpecs={isOwner || isAdmin}
        accentColor="var(--bismo-accent-domain)"
      />

      <CreateBusinessDomainDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        existing={domain}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={`Delete "${domain.name}"?`}
        description="This permanently removes the domain and all of its specifications. This can't be undone."
        confirmLabel="Delete"
        isPending={deleteDomain.isPending}
        onConfirm={() =>
          deleteDomain.mutate(domain.id, {
            onSuccess: () => {
              setDeleteOpen(false);
              navigate({
                to: "/business-domains",
                search: { selected: undefined },
              });
            },
          })
        }
      />
    </div>
  );
}
