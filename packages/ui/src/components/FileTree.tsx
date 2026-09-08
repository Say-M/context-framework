import { useState, type ReactNode } from "react";
import { ChevronRight, FilePlus, FileText, Folder, FolderOpen, FolderPlus, MoreVertical, Trash2 } from "lucide-react";
import { cn } from "../lib/cn";
import { DropdownMenu } from "./DropdownMenu";

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
  /** When provided, a section gets its own delete button in the header (sections are a dynamic, user-managed list, not a fixed set). */
  onDeleteSection?: (sectionSlug: string) => void;
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
  onDeleteSection,
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
    <div className={cn("flex flex-col gap-0.5 overflow-y-auto text-sm", className)}>
      {rootFile && (
        <FileRow file={rootFile} selected={selectedFileId === rootFile.id} onSelect={onSelectFile} />
      )}
      {sections.map((section) => {
        const isEmpty = section.files.length === 0 && section.folders.length === 0;
        return (
          <div key={section.slug} className="mt-1">
            <div className="flex items-center justify-between gap-1 rounded-md px-2 py-1">
              <span className="truncate text-[11px] font-semibold uppercase tracking-wide text-[var(--bismo-text-muted)]">
                {section.label}
              </span>
              <div className="flex flex-shrink-0 items-center gap-0.5">
                <IconButton title="New folder" onClick={() => onAddFolder(section.slug, null)}>
                  <FolderPlus size={14} strokeWidth={1.75} />
                </IconButton>
                <IconButton title="Add spec" onClick={() => onAddSpec(section.slug, null)}>
                  <FilePlus size={14} strokeWidth={1.75} />
                </IconButton>
                {onDeleteSection && (
                  <IconButton title="Delete section" onClick={() => onDeleteSection(section.slug)}>
                    <Trash2 size={14} strokeWidth={1.75} />
                  </IconButton>
                )}
              </div>
            </div>
            {isEmpty ? (
              <p className="ml-3 border-l border-[var(--bismo-border)] py-1 pl-3 text-xs text-[var(--bismo-text-muted)]">
                No files yet.
              </p>
            ) : (
              <div className="ml-3 flex flex-col gap-0.5 border-l border-[var(--bismo-border)] pl-2">
                {section.folders.map((folder) => (
                  <FolderRow
                    key={folder.id}
                    folder={folder}
                    sectionSlug={section.slug}
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
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function IconButton({
  title,
  onClick,
  children,
}: {
  title: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      className="flex h-6 w-6 items-center justify-center rounded text-[var(--bismo-text-muted)] transition-colors hover:bg-[var(--bismo-bg-hover)] hover:text-[var(--bismo-accent-blueprint)]"
    >
      {children}
    </button>
  );
}

function FolderRow({
  folder,
  sectionSlug,
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
  expanded: Set<string>;
  onToggle: (id: string) => void;
  selectedFileId: string | null;
  onSelectFile: (id: string) => void;
  onAddSpec: (sectionSlug: string, parentFolderPath: string | null) => void;
  onAddFolder: (sectionSlug: string, parentFolderPath: string | null) => void;
  onDeleteFolder?: (sectionSlug: string, folderId: string) => void;
}) {
  const isOpen = expanded.has(folder.id);
  const isEmpty = folder.folders.length === 0 && folder.files.length === 0;

  return (
    <div>
      <div className="flex items-center gap-1 rounded-md px-1.5 py-1.5 hover:bg-[var(--bismo-bg-hover)]">
        <button
          type="button"
          onClick={() => onToggle(folder.id)}
          className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
        >
          <ChevronRight
            size={14}
            strokeWidth={1.75}
            className={cn(
              "flex-shrink-0 text-[var(--bismo-text-muted)] transition-transform",
              isOpen && "rotate-90",
            )}
          />
          {isOpen ? (
            <FolderOpen size={15} strokeWidth={1.75} className="flex-shrink-0 text-[var(--bismo-accent-blueprint)]" />
          ) : (
            <Folder size={15} strokeWidth={1.75} className="flex-shrink-0 text-[var(--bismo-accent-blueprint)]" />
          )}
          <span className="truncate text-[var(--bismo-text)]">{folder.name}</span>
        </button>
        <DropdownMenu
          trigger={<MoreVertical size={14} />}
          stopTriggerPropagation
          items={[
            {
              label: "New Folder",
              icon: <FolderPlus size={14} strokeWidth={1.75} />,
              onSelect: () => onAddFolder(sectionSlug, folder.path),
            },
            {
              label: "New Spec",
              icon: <FilePlus size={14} strokeWidth={1.75} />,
              onSelect: () => onAddSpec(sectionSlug, folder.path),
            },
            ...(onDeleteFolder
              ? ([
                  "separator",
                  {
                    label: "Delete",
                    icon: <Trash2 size={14} strokeWidth={1.75} />,
                    destructive: true,
                    onSelect: () => onDeleteFolder(sectionSlug, folder.id),
                  },
                ] as const)
              : []),
          ]}
        />
      </div>
      {isOpen && (
        <div className="ml-3 flex flex-col gap-0.5 border-l border-[var(--bismo-border)] pl-2">
          {folder.folders.map((child) => (
            <FolderRow
              key={child.id}
              folder={child}
              sectionSlug={sectionSlug}
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
            <FileRow key={file.id} file={file} selected={selectedFileId === file.id} onSelect={onSelectFile} />
          ))}
          {isEmpty && <p className="py-1 text-xs text-[var(--bismo-text-muted)]">Empty folder.</p>}
        </div>
      )}
    </div>
  );
}

function FileRow({
  file,
  selected,
  onSelect,
}: {
  file: FileTreeFile;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(file.id)}
      className={cn(
        "flex items-center gap-1.5 rounded-md px-1.5 py-1.5 text-left font-mono text-xs transition-colors hover:bg-[var(--bismo-bg-hover)]",
        selected ? "bg-[var(--bismo-bg-hover)] text-[var(--bismo-text)]" : "text-[var(--bismo-text-muted)]",
      )}
    >
      <span className="w-3.5 flex-shrink-0" aria-hidden="true" />
      <FileText size={15} strokeWidth={1.75} className="flex-shrink-0" />
      <span className="truncate">{file.filename}</span>
    </button>
  );
}
