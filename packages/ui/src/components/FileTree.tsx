import { useState } from "react";
import { cn } from "../lib/cn";

export interface FileTreeFile {
  id: string;
  filename: string;
}

export interface FileTreeFolder {
  id: string;
  name: string;
  path: string;
  files: FileTreeFile[];
  folders: FileTreeFolder[];
}

export interface FileTreeSection {
  slug: string;
  label: string;
  files: FileTreeFile[];
  folders: FileTreeFolder[];
}

export interface FileTreeProps {
  rootFile?: FileTreeFile | null;
  sections: FileTreeSection[];
  selectedFileId: string | null;
  onSelectFile: (fileId: string) => void;
  /** parentFolderPath is null when adding directly under the section root. */
  onAddSpec: (sectionSlug: string, parentFolderPath: string | null) => void;
  onAddFolder: (sectionSlug: string, parentFolderPath: string | null) => void;
  onDeleteFolder?: (sectionSlug: string, folderId: string) => void;
  className?: string;
}

export function FileTree({
  rootFile,
  sections,
  selectedFileId,
  onSelectFile,
  onAddSpec,
  onAddFolder,
  onDeleteFolder,
  className,
}: FileTreeProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  return (
    <div className={cn("flex flex-col gap-1 overflow-y-auto", className)}>
      {rootFile && (
        <FileRow file={rootFile} selected={selectedFileId === rootFile.id} onSelect={onSelectFile} depth={0} />
      )}
      {sections.map((section) => (
        <div key={section.slug} className="mt-1">
          <div className="flex items-center justify-between px-2 py-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-[var(--bismo-text-muted)]">
              {section.label}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => onAddFolder(section.slug, null)}
                className="text-xs text-[var(--bismo-accent-blueprint)] hover:underline"
              >
                + New Folder
              </button>
              <button
                type="button"
                onClick={() => onAddSpec(section.slug, null)}
                className="text-xs text-[var(--bismo-accent-blueprint)] hover:underline"
              >
                + Add Spec
              </button>
            </div>
          </div>
          {section.files.length === 0 && section.folders.length === 0 ? (
            <p className="px-4 py-1 text-xs text-[var(--bismo-text-muted)]">No files yet.</p>
          ) : (
            <>
              {section.folders.map((folder) => (
                <FolderRow
                  key={folder.id}
                  folder={folder}
                  sectionSlug={section.slug}
                  depth={1}
                  expanded={expanded}
                  onToggle={toggle}
                  selectedFileId={selectedFileId}
                  onSelectFile={onSelectFile}
                  onAddSpec={onAddSpec}
                  onAddFolder={onAddFolder}
                  onDeleteFolder={onDeleteFolder}
                />
              ))}
              {section.files.map((file) => (
                <FileRow
                  key={file.id}
                  file={file}
                  selected={selectedFileId === file.id}
                  onSelect={onSelectFile}
                  depth={1}
                />
              ))}
            </>
          )}
        </div>
      ))}
    </div>
  );
}

function FolderRow({
  folder,
  sectionSlug,
  depth,
  expanded,
  onToggle,
  selectedFileId,
  onSelectFile,
  onAddSpec,
  onAddFolder,
  onDeleteFolder,
}: {
  folder: FileTreeFolder;
  sectionSlug: string;
  depth: number;
  expanded: Set<string>;
  onToggle: (id: string) => void;
  selectedFileId: string | null;
  onSelectFile: (id: string) => void;
  onAddSpec: (sectionSlug: string, parentFolderPath: string | null) => void;
  onAddFolder: (sectionSlug: string, parentFolderPath: string | null) => void;
  onDeleteFolder?: (sectionSlug: string, folderId: string) => void;
}) {
  const isOpen = expanded.has(folder.id);
  return (
    <div>
      <div
        className="flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-[var(--bismo-bg-hover)]"
        style={{ marginLeft: depth * 12 }}
      >
        <button
          type="button"
          onClick={() => onToggle(folder.id)}
          className="flex items-center gap-1.5 text-xs text-[var(--bismo-text)]"
        >
          <span className="text-[var(--bismo-text-muted)]">{isOpen ? "▾" : "▸"}</span>
          📁 {folder.name}/
        </button>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onAddFolder(sectionSlug, folder.path)}
            className="text-[10px] text-[var(--bismo-accent-blueprint)] hover:underline"
          >
            +Folder
          </button>
          <button
            type="button"
            onClick={() => onAddSpec(sectionSlug, folder.path)}
            className="text-[10px] text-[var(--bismo-accent-blueprint)] hover:underline"
          >
            +Spec
          </button>
          {onDeleteFolder && (
            <button
              type="button"
              onClick={() => onDeleteFolder(sectionSlug, folder.id)}
              className="text-[10px] text-[var(--bismo-status-rejected)] hover:underline"
            >
              Delete
            </button>
          )}
        </div>
      </div>
      {isOpen && (
        <div>
          {folder.folders.map((child) => (
            <FolderRow
              key={child.id}
              folder={child}
              sectionSlug={sectionSlug}
              depth={depth + 1}
              expanded={expanded}
              onToggle={onToggle}
              selectedFileId={selectedFileId}
              onSelectFile={onSelectFile}
              onAddSpec={onAddSpec}
              onAddFolder={onAddFolder}
              onDeleteFolder={onDeleteFolder}
            />
          ))}
          {folder.files.map((file) => (
            <FileRow
              key={file.id}
              file={file}
              selected={selectedFileId === file.id}
              onSelect={onSelectFile}
              depth={depth + 1}
            />
          ))}
          {folder.folders.length === 0 && folder.files.length === 0 && (
            <p className="px-2 py-1 text-xs text-[var(--bismo-text-muted)]" style={{ marginLeft: (depth + 1) * 12 }}>
              Empty folder.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function FileRow({
  file,
  selected,
  onSelect,
  depth,
}: {
  file: FileTreeFile;
  selected: boolean;
  onSelect: (id: string) => void;
  depth: number;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(file.id)}
      style={{ marginLeft: depth * 12 }}
      className={cn(
        "block rounded-md px-2 py-1.5 text-left font-mono text-xs transition-colors hover:bg-[var(--bismo-bg-hover)]",
        selected
          ? "bg-[var(--bismo-bg-hover)] text-[var(--bismo-text)]"
          : "text-[var(--bismo-text-muted)]",
      )}
    >
      {file.filename}
    </button>
  );
}
