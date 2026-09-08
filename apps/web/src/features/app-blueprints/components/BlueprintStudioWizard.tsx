import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Button, ConfirmDialog, WizardStepper } from "@bismo/ui";
import type { AppBlueprint } from "@bismo/shared-schemas";
import { useAuth } from "@/context/AuthContext";
import { ApiError } from "@/lib/api-client";
import { useAppBlueprint, useDeleteAppBlueprint } from "../queries";
import { BlueprintStudioProvider, useBlueprintStudio } from "../context/BlueprintStudioContext";
import { AppBlueprintStatusBadge } from "./AppBlueprintStatusBadge";
import { BlueprintStudioStep1 } from "./BlueprintStudioStep1";
import { BlueprintStudioStep2 } from "./BlueprintStudioStep2";
import { BlueprintStudioStep3 } from "./BlueprintStudioStep3";

const STEPS = [
  { label: "1. Module Connections" },
  { label: "2. Blueprint Sections" },
  { label: "3. Review & Publish" },
];

export function BlueprintStudioWizard({
  draftId,
  onDraftCreated,
}: {
  draftId: string | null;
  onDraftCreated: (id: string) => void;
}) {
  return (
    <BlueprintStudioProvider initialStep={draftId ? 1 : 0}>
      <BlueprintStudioWizardInner draftId={draftId} onDraftCreated={onDraftCreated} />
    </BlueprintStudioProvider>
  );
}

function BlueprintStudioWizardInner({
  draftId,
  onDraftCreated,
}: {
  draftId: string | null;
  onDraftCreated: (id: string) => void;
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { step, setStep } = useBlueprintStudio();
  const { data: blueprint, isLoading } = useAppBlueprint(draftId);
  const deleteBlueprint = useDeleteAppBlueprint();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const isAdmin = user?.role === "admin";
  const isOwner = !!blueprint && user?.id === blueprint.createdBy;
  const isEditableStatus = !!blueprint && (blueprint.status === "draft" || blueprint.status === "rejected");
  const canEdit = !blueprint || isAdmin || (isOwner && isEditableStatus);

  const handleCreated = (created: AppBlueprint) => {
    onDraftCreated(created.id);
    setStep(1);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--bismo-text)]">Create Application Blueprint</h1>
          <p className="text-sm text-[var(--bismo-text-muted)]">Authoring & Interconnection Studio</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {blueprint && (
            <>
              <AppBlueprintStatusBadge status={blueprint.status} />
              {canEdit && (
                <Button size="sm" variant="destructive" onClick={() => setDeleteOpen(true)}>
                  Delete
                </Button>
              )}
            </>
          )}
          <WizardStepper steps={STEPS} activeIndex={step} />
        </div>
      </div>

      {draftId && isLoading && <p className="text-sm text-[var(--bismo-text-muted)]">Loading draft…</p>}

      {step === 0 && (
        <BlueprintStudioStep1
          existing={blueprint ?? null}
          canEdit={canEdit}
          onCreated={handleCreated}
          onSaved={() => setStep(1)}
        />
      )}
      {step === 1 && blueprint && (
        <div className="flex flex-col gap-4">
          <BlueprintStudioStep2 blueprint={blueprint} />
          <div className="flex justify-between">
            <button
              type="button"
              onClick={() => setStep(0)}
              className="text-sm text-[var(--bismo-text-muted)] hover:underline"
            >
              ← Back to Module Connections
            </button>
            <button
              type="button"
              onClick={() => setStep(2)}
              className="text-sm font-medium text-[var(--bismo-accent-blueprint)] hover:underline"
            >
              Continue to Review & Publish →
            </button>
          </div>
        </div>
      )}
      {step === 2 && blueprint && (
        <div className="flex flex-col gap-4">
          <BlueprintStudioStep3 blueprint={blueprint} />
          <button
            type="button"
            onClick={() => setStep(1)}
            className="text-sm text-[var(--bismo-text-muted)] hover:underline"
          >
            ← Back to Sections Studio
          </button>
        </div>
      )}

      {blueprint && (
        <ConfirmDialog
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          title={`Delete "${blueprint.name}"?`}
          description="This permanently removes the blueprint and all of its specifications. This can't be undone."
          confirmLabel="Delete"
          isPending={deleteBlueprint.isPending}
          onConfirm={() => {
            setDeleteError(null);
            deleteBlueprint.mutate(blueprint.id, {
              onSuccess: () => {
                setDeleteOpen(false);
                navigate({ to: "/app-blueprints" });
              },
              onError: (err) => setDeleteError(err instanceof ApiError ? err.message : "Something went wrong"),
            });
          }}
        />
      )}
      {deleteError && <p className="text-sm text-[var(--bismo-status-rejected)]">{deleteError}</p>}
    </div>
  );
}
