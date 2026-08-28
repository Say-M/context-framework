import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ApprovalStatusBadge, Button, ConfirmDialog } from "@bismo/ui";
import { useAuth } from "@/context/AuthContext";
import { SpecificationPanel } from "@/features/specifications/components/SpecificationPanel";
import { useBusinessModel, useDeleteBusinessModel, useResubmitBusinessModel } from "../queries";
import { CreateBusinessModelDialog } from "./CreateBusinessModelDialog";

export function BusinessModelDetailPanel({ modelId }: { modelId: string | null }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: model, isLoading } = useBusinessModel(modelId);
  const resubmit = useResubmitBusinessModel();
  const deleteModel = useDeleteBusinessModel();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  if (!modelId) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-[var(--bismo-text-muted)]">
        Select a business model to view its details.
      </div>
    );
  }

  if (isLoading || !model) {
    return <div className="flex-1 p-6 text-sm text-[var(--bismo-text-muted)]">Loading…</div>;
  }

  const isOwner = user?.id === model.createdBy;
  const isAdmin = user?.role === "admin";
  const isEditableStatus = model.status === "pending" || model.status === "rejected";
  const canEdit = isAdmin || (isOwner && isEditableStatus);
  const canResubmit = model.status === "rejected" && (isOwner || isAdmin);

  return (
    <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded bg-[var(--bismo-bg-hover)] px-2 py-0.5 font-mono text-xs text-[var(--bismo-text-muted)]">
              {model.code}
            </span>
            <span className="text-xs text-[var(--bismo-text-muted)]">{model.archetypeCategory}</span>
          </div>
          <h2 className="mt-1 text-2xl font-bold text-[var(--bismo-text)]">{model.name}</h2>
        </div>
        <div className="flex items-center gap-2">
          <ApprovalStatusBadge status={model.status} />
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

      {model.status === "rejected" && model.reviewNote && (
        <div className="rounded-md border border-[var(--bismo-status-rejected)]/40 bg-[var(--bismo-status-rejected)]/10 p-3 text-sm text-[var(--bismo-text)]">
          <p className="font-medium text-[var(--bismo-status-rejected)]">Rejected: {model.reviewNote}</p>
          {canResubmit && (
            <Button
              size="sm"
              variant="secondary"
              className="mt-2"
              disabled={resubmit.isPending}
              onClick={() => resubmit.mutate(model.id)}
            >
              {resubmit.isPending ? "Resubmitting…" : "Resubmit for review"}
            </Button>
          )}
        </div>
      )}

      <p className="text-sm text-[var(--bismo-text-muted)]">{model.description}</p>

      <div className="grid grid-cols-2 gap-4">
        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--bismo-accent-model)]">
            Monetization & Margins
          </h3>
          <p className="text-sm text-[var(--bismo-text)]">
            {model.monetizationMechanics || "Not specified yet."}
          </p>
        </section>
        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--bismo-accent-domain)]">
            Distribution & Channel Flow
          </h3>
          <ul className="list-inside list-disc space-y-1 text-sm text-[var(--bismo-text)]">
            {model.distributionChannels.length === 0 && (
              <li className="list-none text-[var(--bismo-text-muted)]">None listed.</li>
            )}
            {model.distributionChannels.map((channel) => (
              <li key={channel}>{channel}</li>
            ))}
          </ul>
        </section>
      </div>

      <SpecificationPanel
        parentType="BusinessModel"
        parentId={model.id}
        parentName={model.name}
        pathPrefix={model.code.toLowerCase()}
        sectionTitle="Model Specifications"
        canManageSpecs={isOwner || isAdmin}
        accentColor="var(--bismo-accent-model)"
      />

      <CreateBusinessModelDialog open={editOpen} onOpenChange={setEditOpen} existing={model} />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={`Delete "${model.name}"?`}
        description="This permanently removes the model and all of its specifications. This can't be undone."
        confirmLabel="Delete"
        isPending={deleteModel.isPending}
        onConfirm={() =>
          deleteModel.mutate(model.id, {
            onSuccess: () => {
              setDeleteOpen(false);
              navigate({ to: "/business-models", search: { selected: undefined } });
            },
          })
        }
      />
    </div>
  );
}
