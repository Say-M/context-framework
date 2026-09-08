import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Download, ExternalLink, Loader2 } from "lucide-react";
import { Button, Card } from "@bismo/ui";
import type { StudioArtifact } from "@bismo/shared-schemas";
import { apiFetch } from "@/lib/api-client";
import { useStudioArtifact } from "../queries";
import { ICON_BY_KIND, KIND_LABEL } from "../lib/artifactKind";
import { markdownToDocxBlob } from "../lib/markdownDocx";
import { rowsToXlsxBlob, type SheetRows } from "../lib/sheetXlsx";
import { slidesToPptx } from "../lib/slidesPptx";
import type { SlideData } from "@bismo/shared-schemas";

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

/** Every export path here reads straight from the artifact's stored `content` — none of them need a live editor instance mounted, matching how each editor's own download button already works. */
async function downloadArtifact(artifact: StudioArtifact) {
  const title = artifact.title || "artifact";
  if (artifact.kind === "doc") {
    const markdown = (artifact.content as { markdown?: string } | null)?.markdown ?? "";
    downloadBlob(await markdownToDocxBlob(title, markdown), `${title}.docx`);
  } else if (artifact.kind === "spreadsheet") {
    const rows = (artifact.content as { rows?: SheetRows } | null)?.rows ?? [[{ value: "" }]];
    downloadBlob(await rowsToXlsxBlob(title, rows), `${title}.xlsx`);
  } else if (artifact.kind === "slides") {
    const slides = (artifact.content as { slides?: SlideData[] } | null)?.slides ?? [];
    await slidesToPptx(title, slides);
  } else if (artifact.kind === "research") {
    const content = artifact.content as { markdownReport?: string; sources?: { title: string; url: string }[] } | null;
    const sources = content?.sources ?? [];
    const sourcesBlock = sources.length
      ? `\n\n## Sources\n\n${sources.map((s) => `- [${s.title}](${s.url})`).join("\n")}`
      : "";
    downloadBlob(await markdownToDocxBlob(title, (content?.markdownReport ?? "") + sourcesBlock), `${title}.docx`);
  } else if (artifact.kind === "image") {
    const mimeType = (artifact.content as { mimeType?: string } | null)?.mimeType ?? "image/png";
    const extension = mimeType.split("/")[1] ?? "png";
    const res = await apiFetch(`/api/v1/studio/artifacts/${artifact.id}/image`);
    if (!res.ok) throw new Error("Failed to load image");
    downloadBlob(await res.blob(), `${title}.${extension}`);
  }
}

/**
 * Renders inline in ChatPanel for any assistant message with an
 * `artifactId` — replaces the old bare "artifact updated" link with a real
 * card (icon, title, description, format badge, an "Open & edit" link that
 * opens the full-page editor in a new tab via `target="_blank"`, and a
 * quick-download button that doesn't require opening the editor at all).
 */
export function ArtifactCard({ artifactId }: { artifactId: string }) {
  const { data: artifact, isLoading } = useStudioArtifact(artifactId);
  const [downloading, setDownloading] = useState(false);

  if (isLoading || !artifact) {
    return <Card className="h-20 animate-pulse" />;
  }

  const Icon = ICON_BY_KIND[artifact.kind];

  const handleDownload = async () => {
    setDownloading(true);
    try {
      await downloadArtifact(artifact);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Card className="max-w-sm text-left">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-2.5">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md bg-[var(--bismo-accent-blueprint)]/10 text-[var(--bismo-accent-blueprint)]">
            <Icon size={16} strokeWidth={1.75} />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-[var(--bismo-text)]">{artifact.title}</p>
            {artifact.description && (
              <p className="mt-0.5 line-clamp-2 text-xs text-[var(--bismo-text-muted)]">{artifact.description}</p>
            )}
          </div>
        </div>
        <span className="flex-shrink-0 rounded-full border border-[var(--bismo-border)] px-2 py-0.5 text-[10px] font-medium text-[var(--bismo-text-muted)]">
          {KIND_LABEL[artifact.kind]}
        </span>
      </div>
      <div className="mt-3 flex gap-2">
        <Link to="/artifacts/$id" params={{ id: artifact.id }} target="_blank" className="flex-1">
          <Button size="sm" className="w-full">
            <ExternalLink size={13} strokeWidth={1.75} />
            Open &amp; edit
          </Button>
        </Link>
        <Button variant="secondary" size="sm" onClick={handleDownload} disabled={downloading}>
          {downloading ? <Loader2 size={13} strokeWidth={1.75} className="animate-spin" /> : <Download size={13} strokeWidth={1.75} />}
        </Button>
      </div>
    </Card>
  );
}
