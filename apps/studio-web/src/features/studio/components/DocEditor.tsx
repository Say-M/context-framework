import { useEffect, useRef } from "react";
import { createUniver, LocaleType, mergeLocales } from "@univerjs/presets";
import { UniverDocsCorePreset } from "@univerjs/preset-docs-core";
import UniverPresetDocsCoreEnUS from "@univerjs/preset-docs-core/locales/en-US";
import "@univerjs/preset-docs-core/lib/index.css";
import { Download, Save } from "lucide-react";
import { Button } from "@bismo/ui";
import type { StudioArtifact } from "@bismo/shared-schemas";
import { useUpdateStudioArtifact } from "../queries";
import { documentDataToMarkdown, markdownToDocumentData } from "../lib/markdownDoc";
import { markdownToDocxBlob } from "../lib/markdownDocx";

/**
 * Docs are stored as markdown (see StudioArtifact.model.ts) — far simpler
 * for the agent to produce reliably than Univer's own raw document-body
 * format. This editor converts that markdown to/from Univer's IDocumentData
 * via markdownDoc.ts: to on load (Univer's Docs facade has no
 * style-setting API, only plain-text insertion, so headings/bold/lists have
 * to be constructed up front, not applied after the fact), from on
 * save/download. .docx export goes through `docx` directly from that same
 * markdown (see markdownDocx.ts) rather than Univer's own export, which
 * requires the paid Pro tier — the same trap SheetEditor's exceljs export
 * sidesteps.
 *
 * Render with `key={artifact.id}` from the parent — Univer's instance is
 * imperatively created/destroyed in this effect, not driven by React state,
 * so a full remount is needed when the artifact changes (same as
 * SheetEditor). No dirty-tracking here either, same reasoning as
 * SheetEditor: Univer's facade exposes no live change event to hook, so
 * Save just stays enabled outright rather than approximating "dirty".
 */
export function DocEditor({ artifact }: { artifact: StudioArtifact }) {
  const containerRef = useRef<HTMLDivElement>(null);
  // Untyped against Univer's facade on purpose — same reasoning as
  // SheetEditor's apiRef: the exact FDocument/FUniver TS surface wasn't
  // fully confirmable from docs alone, so methods are called defensively.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const apiRef = useRef<any>(null);
  const update = useUpdateStudioArtifact(artifact.id);
  const markdown = (artifact.content as { markdown?: string } | null)?.markdown ?? "";

  useEffect(() => {
    if (!containerRef.current) return;

    const { univerAPI } = createUniver({
      darkMode: true,
      locale: LocaleType.EN_US,
      locales: { [LocaleType.EN_US]: mergeLocales(UniverPresetDocsCoreEnUS) },
      presets: [UniverDocsCorePreset({ container: containerRef.current })],
    });
    apiRef.current = univerAPI;

    univerAPI.createUniverDoc(markdownToDocumentData(artifact.id, markdown));

    return () => univerAPI.dispose();
    // Intentionally mount-only — see the component doc comment above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const currentMarkdown = (): string => {
    const api = apiRef.current;
    if (!api) return markdown;
    const snapshot = api.getActiveDocument()?.getSnapshot();
    return documentDataToMarkdown(snapshot?.body);
  };

  const handleSave = () => {
    update.mutate({ content: { markdown: currentMarkdown() } });
  };

  const handleDownload = async () => {
    const blob = await markdownToDocxBlob(artifact.title, currentMarkdown());
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${artifact.title || "document"}.docx`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="truncate font-semibold text-[var(--bismo-text)]">{artifact.title}</h3>
        <div className="flex flex-shrink-0 gap-2">
          <Button variant="secondary" size="sm" onClick={handleDownload}>
            <Download size={14} strokeWidth={1.75} />
            .docx
          </Button>
          <Button size="sm" onClick={handleSave} disabled={update.isPending}>
            <Save size={14} strokeWidth={1.75} />
            {update.isPending ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>
      <div ref={containerRef} className="flex-1 overflow-hidden rounded-md border border-[var(--bismo-border)]" />
    </div>
  );
}
