import { useEffect, useState } from "react";
import type { ParentType } from "@bismo/shared-schemas";
import {
  Button,
  ConfirmDialog,
  Dialog,
  SpecViewer,
  VersionHistoryPanel,
} from "@bismo/ui";
import { ApiError } from "@/lib/api-client";
import {
  useDeleteSpecification,
  useSpecificationVersions,
  useSpecifications,
} from "../queries";
import { AddSpecDialog } from "./AddSpecDialog";
import { EditSpecDialog } from "./EditSpecDialog";

export function SpecificationPanel({
  parentType,
  parentId,
  parentName,
  pathPrefix,
  sectionTitle,
  canManageSpecs,
  accentColor,
}: {
  parentType: ParentType;
  parentId: string;
  parentName: string;
  pathPrefix: string;
  sectionTitle: string;
  canManageSpecs: boolean;
  accentColor: string;
}) {
  const { data: specsData } = useSpecifications(parentType, parentId);
  const [selectedSpecId, setSelectedSpecId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const specs = specsData?.items ?? [];

  useEffect(() => {
    setSelectedSpecId(specs[0]?.id ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parentId, specs.length]);

  const selectedSpec = specs.find((s) => s.id === selectedSpecId) ?? null;
  const deleteSpec = useDeleteSpecification(
    selectedSpec
      ? { parentType: selectedSpec.parentType, parentId: selectedSpec.parentId }
      : { parentType, parentId },
  );
  const { data: versionsData, isLoading: versionsLoading } =
    useSpecificationVersions(historyOpen ? selectedSpecId : null);

  return (
    <section>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--bismo-text-muted)]">
          {sectionTitle} ({specs.length})
        </h3>
        {canManageSpecs && (
          <Button
            size="sm"
            onClick={() => setAddOpen(true)}
            style={{ backgroundColor: accentColor }}
          >
            + Add Spec (.md)
          </Button>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {specs.map((spec) => (
          <button
            key={spec.id}
            onClick={() => setSelectedSpecId(spec.id)}
            className="rounded-md border px-3 py-1.5 text-xs font-mono transition-colors hover:bg-[var(--bismo-bg-hover)]"
            style={{
              borderColor:
                spec.id === selectedSpecId
                  ? accentColor
                  : "var(--bismo-border)",
              color:
                spec.id === selectedSpecId
                  ? "var(--bismo-text)"
                  : "var(--bismo-text-muted)",
            }}
          >
            {spec.filename}
          </button>
        ))}
      </div>

      {selectedSpec && (
        <div className="mt-4 rounded-lg border border-[var(--bismo-border)] bg-[var(--bismo-bg-elevated)] p-4">
          <div className="mb-3 flex flex-wrap gap-3 justify-between">
            <div>
              <p className="text-xs text-[var(--bismo-text-muted)]">
                {pathPrefix}/{selectedSpec.path} · v{selectedSpec.version}
              </p>
              <p className="text-lg font-semibold text-[var(--bismo-text)]">
                {selectedSpec.title}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setHistoryOpen(true)}
              >
                History
              </Button>
              {canManageSpecs && (
                <>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setEditOpen(true)}
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => setDeleteOpen(true)}
                  >
                    Delete
                  </Button>
                </>
              )}
            </div>
          </div>
          <SpecViewer
            content={selectedSpec.content}
            rawSource={selectedSpec.rawSource}
            frontmatter={selectedSpec.frontmatter}
          />
        </div>
      )}

      {addOpen && (
        <AddSpecDialog
          open
          onOpenChange={(next) => !next && setAddOpen(false)}
          parentType={parentType}
          parentId={parentId}
          parentName={parentName}
        />
      )}

      {selectedSpec && editOpen && (
        <EditSpecDialog
          open
          onOpenChange={(next) => !next && setEditOpen(false)}
          spec={selectedSpec}
        />
      )}

      {selectedSpec && deleteOpen && (
        <ConfirmDialog
          open
          onOpenChange={(next) => !next && setDeleteOpen(false)}
          title={`Delete "${selectedSpec.filename}"?`}
          description="This permanently removes the specification. This can't be undone."
          confirmLabel="Delete"
          isPending={deleteSpec.isPending}
          onConfirm={() => {
            setDeleteError(null);
            deleteSpec.mutate(selectedSpec.id, {
              onSuccess: () => {
                setDeleteOpen(false);
                setSelectedSpecId(null);
              },
              onError: (err) =>
                setDeleteError(
                  err instanceof ApiError
                    ? err.message
                    : "Something went wrong",
                ),
            });
          }}
        />
      )}
      {deleteError && (
        <p className="mt-2 text-sm text-[var(--bismo-status-rejected)]">
          {deleteError}
        </p>
      )}

      {selectedSpec && historyOpen && (
        <Dialog
          open
          onOpenChange={(next) => !next && setHistoryOpen(false)}
          title={`Version History — ${selectedSpec.filename}`}
          description="Past approved content, frozen each time an edit superseded it while its parent was approved."
        >
          <VersionHistoryPanel
            versions={versionsData?.items ?? []}
            isLoading={versionsLoading}
          />
        </Dialog>
      )}
    </section>
  );
}
