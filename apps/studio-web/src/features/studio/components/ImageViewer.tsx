import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@bismo/ui";
import type { StudioArtifact } from "@bismo/shared-schemas";
import { apiFetch } from "@/lib/api-client";

/**
 * Images have no "Save" — unlike docs/sheets/slides there's nothing to
 * edit in place; re-prompting via chat is how you get a different result.
 * The raw file is fetched as a Blob (not a plain <img src="..."> URL)
 * because the serving route requires the platform access token — a
 * bearer-authenticated request, not something a plain <img> tag can send.
 */
export function ImageViewer({ artifact }: { artifact: StudioArtifact }) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;
    apiFetch(`/api/v1/studio/artifacts/${artifact.id}/image`)
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to load image");
        const blob = await res.blob();
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setImageUrl(objectUrl);
      })
      .catch(() => {
        if (!cancelled) setError("Couldn't load this image.");
      });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [artifact.id]);

  const content = artifact.content as { prompt?: string; mimeType?: string } | null;

  const handleDownload = () => {
    if (!imageUrl) return;
    const extension = (content?.mimeType ?? "image/png").split("/")[1] ?? "png";
    const anchor = document.createElement("a");
    anchor.href = imageUrl;
    anchor.download = `${artifact.title || "image"}.${extension}`;
    anchor.click();
  };

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="truncate font-semibold text-[var(--bismo-text)]">{artifact.title}</h3>
        <Button variant="secondary" size="sm" onClick={handleDownload} disabled={!imageUrl}>
          <Download size={14} strokeWidth={1.75} />
          Download
        </Button>
      </div>
      <div className="flex flex-1 items-center justify-center overflow-hidden rounded-md border border-[var(--bismo-border)] bg-[var(--bismo-bg)] p-2">
        {error && <p className="text-sm text-[var(--bismo-status-rejected)]">{error}</p>}
        {!error && !imageUrl && <p className="text-sm text-[var(--bismo-text-muted)]">Loading…</p>}
        {imageUrl && (
          // eslint-disable-next-line jsx-a11y/img-redundant-alt
          <img src={imageUrl} alt={artifact.title} className="max-h-full max-w-full object-contain" />
        )}
      </div>
      {content?.prompt && (
        <p className="truncate text-xs text-[var(--bismo-text-muted)]" title={content.prompt}>
          Prompt: {content.prompt}
        </p>
      )}
    </div>
  );
}
