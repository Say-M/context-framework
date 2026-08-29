import { useState } from "react";
import type { AppBlueprint, BlueprintSection, FolderNode } from "@bismo/shared-schemas";
import {
  Button,
  ConfirmDialog,
  Dialog,
  FileTree,
  type FileTreeFolder,
  SpecViewer,
  VersionHistoryPanel,
} from "@bismo/ui";
import { useDeleteBlueprintFolder, useSectionTree } from "../queries";
import {
  useDeleteSpecification,
  useSpecification,
  useSpecificationVersions,
} from "@/features/specifications/queries";
import { AddSpecDialog } from "@/features/specifications/components/AddSpecDialog";
import { EditSpecDialog } from "@/features/specifications/components/EditSpecDialog";
import { ApiError } from "@/lib/api-client";
import { useBlueprintStudio } from "../context/BlueprintStudioContext";
import { CreateSubfolderDialog } from "./CreateSubfolderDialog";

const SECTION_LABELS: Record<BlueprintSection, string> = {
  data_model: "Data Model",
  screens: "Screens",
  forms: "Forms",
  workflows: "Workflows",
  business_rules: "Business Rules",
  permissions: "Permissions",
  states: "States",
  ai_agents: "AI Agents",
  reports: "Reports",
  integrations: "Integrations",
  notifications: "Notifications",
  audit_trail: "Audit Trail",
};

function mapFolderNode(node: FolderNode): FileTreeFolder {
  return {
    id: node.id,
    name: node.name,
    path: node.path,
    files: node.specs.map((spec) => ({ id: spec.id, filename: spec.filename })),
    folders: node.folders.map(mapFolderNode),
  };
}

function countFolderSpecs(node: FolderNode): number {
  return node.specs.length + node.folders.reduce((n, f) => n + countFolderSpecs(f), 0);
}

interface AddSpecTarget {
  section: BlueprintSection;
  parentFolderPath: string | null;
}
interface AddFolderTarget {
  section: BlueprintSection;
  parentFolderPath: string | null;
}

export function BlueprintStudioStep2({ blueprint }: { blueprint: AppBlueprint }) {
  const { selectedFileId, setSelectedFileId } = useBlueprintStudio();
  const { data: tree, isLoading } = useSectionTree(blueprint.id);
  const [addSpecTarget, setAddSpecTarget] = useState<AddSpecTarget | null>(null);
  const [addFolderTarget, setAddFolderTarget] = useState<AddFolderTarget | null>(null);
  const [deleteFolderId, setDeleteFolderId] = useState<string | null>(null);
  const [folderDeleteError, setFolderDeleteError] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const { data: selectedSpec } = useSpecification(selectedFileId);
  const deleteSpec = useDeleteSpecification({ parentType: "AppBlueprint", parentId: blueprint.id });
  const deleteFolder = useDeleteBlueprintFolder(blueprint.id);
  const { data: versionsData, isLoading: versionsLoading } = useSpecificationVersions(
    historyOpen ? selectedFileId : null,
  );

  if (isLoading || !tree) {
    return <p className="text-sm text-[var(--bismo-text-muted)]">Loading sections…</p>;
  }

  const isRoot = selectedSpec && tree.root?.id === selectedSpec.id;
  const totalFiles =
    tree.sections.reduce(
      (n, s) => n + s.specs.length + s.folders.reduce((m, f) => m + countFolderSpecs(f), 0),
      0,
    ) + (tree.root ? 1 : 0);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[300px_1fr]">
      <div>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--bismo-text-muted)]">
            Blueprint Sections ({totalFiles} files)
          </h3>
        </div>
        <FileTree
          rootFile={tree.root ? { id: tree.root.id, filename: tree.root.filename } : null}
          sections={tree.sections.map((s) => ({
            slug: s.slug,
            label: SECTION_LABELS[s.slug],
            files: s.specs.map((spec) => ({ id: spec.id, filename: spec.filename })),
            folders: s.folders.map(mapFolderNode),
          }))}
          selectedFileId={selectedFileId}
          onSelectFile={setSelectedFileId}
          onAddSpec={(slug, parentFolderPath) =>
            setAddSpecTarget({ section: slug as BlueprintSection, parentFolderPath })
          }
          onAddFolder={(slug, parentFolderPath) =>
            setAddFolderTarget({ section: slug as BlueprintSection, parentFolderPath })
          }
          onDeleteFolder={(_slug, folderId) => {
            setFolderDeleteError(null);
            setDeleteFolderId(folderId);
          }}
        />
      </div>

      <div className="rounded-lg border border-[var(--bismo-border)] bg-[var(--bismo-bg-elevated)] p-4">
        {!selectedSpec ? (
          <p className="text-sm text-[var(--bismo-text-muted)]">
            Select a file on the left, or add a new spec to one of the 12 sections.
          </p>
        ) : (
          <>
            <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs text-[var(--bismo-text-muted)]">
                  {selectedSpec.path} · v{selectedSpec.version}
                </p>
                <p className="text-lg font-semibold text-[var(--bismo-text)]">{selectedSpec.title}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="secondary" onClick={() => setHistoryOpen(true)}>
                  History
                </Button>
                <Button size="sm" variant="secondary" onClick={() => setEditOpen(true)}>
                  Edit
                </Button>
                {!isRoot && (
                  <Button size="sm" variant="destructive" onClick={() => setDeleteOpen(true)}>
                    Delete
                  </Button>
                )}
              </div>
            </div>
            <SpecViewer
              content={selectedSpec.content}
              rawSource={selectedSpec.rawSource}
              frontmatter={selectedSpec.frontmatter}
            />
          </>
        )}
      </div>

      {addSpecTarget && (
        <AddSpecDialog
          key={`${addSpecTarget.section}-${addSpecTarget.parentFolderPath ?? "root"}`}
          open={!!addSpecTarget}
          onOpenChange={(open) => !open && setAddSpecTarget(null)}
          parentType="AppBlueprint"
          parentId={blueprint.id}
          parentName={`${blueprint.name} — ${SECTION_LABELS[addSpecTarget.section]}`}
          section={addSpecTarget.section}
          folderPath={addSpecTarget.parentFolderPath}
        />
      )}

      {addFolderTarget && (
        <CreateSubfolderDialog
          open={!!addFolderTarget}
          onOpenChange={(open) => !open && setAddFolderTarget(null)}
          blueprintId={blueprint.id}
          fixedSection={addFolderTarget.section}
          parentFolderPath={addFolderTarget.parentFolderPath}
        />
      )}

      {deleteFolderId && (
        <ConfirmDialog
          open={!!deleteFolderId}
          onOpenChange={(open) => !open && setDeleteFolderId(null)}
          title="Delete this folder?"
          description="This permanently removes the folder, any subfolders inside it, and every specification they contain. This can't be undone."
          confirmLabel="Delete"
          isPending={deleteFolder.isPending}
          onConfirm={() => {
            setFolderDeleteError(null);
            deleteFolder.mutate(deleteFolderId, {
              onSuccess: () => setDeleteFolderId(null),
              onError: (err) =>
                setFolderDeleteError(err instanceof ApiError ? err.message : "Something went wrong"),
            });
          }}
        />
      )}
      {folderDeleteError && (
        <p className="text-sm text-[var(--bismo-status-rejected)]">{folderDeleteError}</p>
      )}

      {selectedSpec && editOpen && (
        <EditSpecDialog open onOpenChange={(next) => !next && setEditOpen(false)} spec={selectedSpec} />
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
                setSelectedFileId(null);
              },
              onError: (err) =>
                setDeleteError(err instanceof ApiError ? err.message : "Something went wrong"),
            });
          }}
        />
      )}
      {deleteError && <p className="mt-2 text-sm text-[var(--bismo-status-rejected)]">{deleteError}</p>}

      {selectedSpec && historyOpen && (
        <Dialog
          open
          onOpenChange={(next) => !next && setHistoryOpen(false)}
          title={`Version History — ${selectedSpec.filename}`}
          description="Past approved content, frozen each time an edit superseded it while the blueprint was approved."
        >
          <VersionHistoryPanel versions={versionsData?.items ?? []} isLoading={versionsLoading} />
        </Dialog>
      )}
    </div>
  );
}
