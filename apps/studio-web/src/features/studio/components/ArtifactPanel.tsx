import { BookOpen, FileText, Image as ImageIcon, Presentation, Table2 } from "lucide-react";
import { cn } from "@bismo/ui";
import type { StudioArtifact, StudioArtifactKind } from "@bismo/shared-schemas";
import { DocEditor } from "./DocEditor";
import { SheetEditor } from "./SheetEditor";
import { SlideEditor } from "./SlideEditor";
import { ImageViewer } from "./ImageViewer";
import { ResearchViewer } from "./ResearchViewer";

const ICON_BY_KIND: Record<StudioArtifactKind, typeof FileText> = {
  doc: FileText,
  spreadsheet: Table2,
  slides: Presentation,
  image: ImageIcon,
  research: BookOpen,
};

/**
 * A thread can hold several artifacts over its lifetime — one per
 * create_doc/create_spreadsheet/create_slides/generate_image/
 * deliver_research_report tool call, not just the most recent — so this
 * renders a browsable tab strip (one chip per artifact, oldest to newest)
 * above whichever one is currently selected. Selection state is owned by
 * the parent (ThreadDetailPage) rather than here, since ChatPanel's
 * "→ artifact updated" links need to drive the same selection.
 */
export function ArtifactPanel({
  artifacts,
  selectedId,
  onSelect,
}: {
  artifacts: StudioArtifact[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const artifact = artifacts.find((a) => a.id === selectedId) ?? null;

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      {artifacts.length > 1 && (
        <div className="flex flex-shrink-0 gap-2 overflow-x-auto pb-1">
          {artifacts.map((a) => {
            const Icon = ICON_BY_KIND[a.kind];
            const active = a.id === selectedId;
            return (
              <button
                key={a.id}
                type="button"
                onClick={() => onSelect(a.id)}
                className={cn(
                  "flex flex-shrink-0 items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors",
                  active
                    ? "border-[var(--bismo-accent-blueprint)] bg-[var(--bismo-accent-blueprint)]/10 text-[var(--bismo-accent-blueprint)]"
                    : "border-[var(--bismo-border)] text-[var(--bismo-text-muted)] hover:bg-[var(--bismo-bg-hover)]",
                )}
              >
                <Icon size={13} strokeWidth={1.75} className="flex-shrink-0" />
                <span className="max-w-[10rem] truncate">{a.title}</span>
              </button>
            );
          })}
        </div>
      )}
      <div className="min-h-0 flex-1">
        {artifact && artifact.kind === "doc" ? (
          <DocEditor key={artifact.id} artifact={artifact} />
        ) : artifact && artifact.kind === "spreadsheet" ? (
          <SheetEditor key={artifact.id} artifact={artifact} />
        ) : artifact && artifact.kind === "slides" ? (
          <SlideEditor key={artifact.id} artifact={artifact} />
        ) : artifact && artifact.kind === "image" ? (
          <ImageViewer key={artifact.id} artifact={artifact} />
        ) : artifact && artifact.kind === "research" ? (
          <ResearchViewer key={artifact.id} artifact={artifact} />
        ) : (
          <div className="flex h-full items-center justify-center rounded-md border border-dashed border-[var(--bismo-border)] p-6 text-center text-sm text-[var(--bismo-text-muted)]">
            Ask for a document, spreadsheet, slide deck, image, or research report to see it here — you'll be able
            to view and download it.
          </div>
        )}
      </div>
    </div>
  );
}
