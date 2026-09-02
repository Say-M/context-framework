import { useEffect, useRef } from "react";
import { createUniver, LocaleType, mergeLocales } from "@univerjs/presets";
import { UniverDocsCorePreset } from "@univerjs/preset-docs-core";
import UniverPresetDocsCoreEnUS from "@univerjs/preset-docs-core/locales/en-US";
import "@univerjs/preset-docs-core/lib/index.css";
import { Download, ExternalLink, Save } from "lucide-react";
import { Button } from "@bismo/ui";
import type { StudioArtifact } from "@bismo/shared-schemas";
import { useUpdateStudioArtifact } from "../queries";
import { documentDataToMarkdown, markdownToDocumentData } from "../lib/markdownDoc";
import { markdownToDocxBlob } from "../lib/markdownDocx";

type ResearchSource = { title: string; url: string };

/**
 * Same Univer-Docs-based markdown editor as DocEditor — see its doc comment
 * for why (no style-setting facade API, so formatting is built up front via
 * markdownDoc.ts). Sources are kept as a separate read-only list below the
 * editor rather than folded into the editable body: they came from real
 * WebFetch/WebSearch calls, so editing them as rich text would risk
 * silently detaching a citation from the source it backs. Download is a
 * plain .docx export (report + an appended Sources section) via
 * markdownDocx.ts.
 *
 * Render with `key={artifact.id}` from the parent, same reason as DocEditor.
 */
export function ResearchViewer({ artifact }: { artifact: StudioArtifact }) {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const apiRef = useRef<any>(null);
  const update = useUpdateStudioArtifact(artifact.id);
  const content = artifact.content as { markdownReport?: string; sources?: ResearchSource[] } | null;
  const markdown = content?.markdownReport ?? "";
  const sources = content?.sources ?? [];

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
    // Intentionally mount-only — see DocEditor's doc comment.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const currentMarkdown = (): string => {
    const api = apiRef.current;
    if (!api) return markdown;
    const snapshot = api.getActiveDocument()?.getSnapshot();
    return documentDataToMarkdown(snapshot?.body);
  };

  const handleSave = () => {
    update.mutate({ content: { markdownReport: currentMarkdown(), sources } });
  };

  const handleDownload = async () => {
    const sourcesBlock = sources.length
      ? `\n\n## Sources\n\n${sources.map((s) => `- [${s.title}](${s.url})`).join("\n")}`
      : "";
    const blob = await markdownToDocxBlob(artifact.title, currentMarkdown() + sourcesBlock);
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${artifact.title || "research-report"}.docx`;
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
      {sources.length > 0 && (
        <div className="flex max-h-40 flex-shrink-0 flex-col rounded-md border border-[var(--bismo-border)] p-3">
          <p className="mb-1.5 flex-shrink-0 text-xs font-semibold text-[var(--bismo-text-muted)]">Sources</p>
          <ul className="flex flex-col gap-1 overflow-y-auto">
            {sources.map((source, index) => (
              <li key={index}>
                <a
                  href={source.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 truncate text-xs text-[var(--bismo-accent-blueprint)] hover:underline"
                >
                  <ExternalLink size={11} strokeWidth={1.75} className="flex-shrink-0" />
                  <span className="truncate">{source.title}</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
