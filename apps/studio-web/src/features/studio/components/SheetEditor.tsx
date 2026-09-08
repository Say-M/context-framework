import { useEffect, useRef } from "react";
import { createUniver, LocaleType, mergeLocales } from "@univerjs/presets";
import { UniverSheetsCorePreset } from "@univerjs/preset-sheets-core";
import UniverPresetSheetsCoreEnUS from "@univerjs/preset-sheets-core/locales/en-US";
import "@univerjs/preset-sheets-core/lib/index.css";
import { Download, Save } from "lucide-react";
import { Button } from "@bismo/ui";
import type { StudioArtifact } from "@bismo/shared-schemas";
import { useUpdateStudioArtifact } from "../queries";
import { rowsToXlsxBlob, type SheetCell as Cell, type SheetRows as Rows } from "../lib/sheetXlsx";

function toICellData(rows: Rows) {
  return rows.map((row) => row.map((cell) => (cell.formula ? { v: cell.value, f: cell.formula } : { v: cell.value })));
}

/**
 * Reads cells back out of a live workbook's snapshot. Deliberately reads
 * the sparse row/col-keyed `cellData` matrix generically (plain object
 * indexing, not typed against Univer's IWorkbookData) rather than assuming
 * exact field names — Univer's facade API surface wasn't fully verifiable
 * from docs alone, so this is defensive against minor shape differences by
 * construction rather than by confidence.
 */
function fromSnapshot(snapshot: Record<string, unknown>): Rows {
  const sheets = (snapshot.sheets ?? {}) as Record<string, { cellData?: Record<string, Record<string, { v?: unknown; f?: string }>> }>;
  const sheetOrder = (snapshot.sheetOrder as string[] | undefined) ?? Object.keys(sheets);
  const sheet = sheets[sheetOrder[0] ?? ""];
  const cellData = sheet?.cellData ?? {};

  const rowIndices = Object.keys(cellData).map(Number);
  const maxRow = rowIndices.length ? Math.max(...rowIndices) : -1;
  let maxCol = -1;
  for (const r of rowIndices) {
    const colIndices = Object.keys(cellData[String(r)] ?? {}).map(Number);
    if (colIndices.length) maxCol = Math.max(maxCol, ...colIndices);
  }

  const rows: Rows = [];
  for (let r = 0; r <= maxRow; r++) {
    const row: Cell[] = [];
    for (let c = 0; c <= maxCol; c++) {
      const cell = cellData[String(r)]?.[String(c)];
      row.push({ value: (cell?.v ?? null) as Cell["value"], formula: cell?.f || undefined });
    }
    rows.push(row);
  }
  return rows.length ? rows : [[{ value: "" }]];
}

/**
 * Spreadsheets are stored as a plain dense 2D array of {value, formula}
 * cells (see StudioArtifact.model.ts / studioTools.ts) — far simpler for
 * the agent to produce than Univer's own sparse cellData format. This
 * component does the conversion both ways: `toICellData` on load,
 * `fromSnapshot` on save/download.
 *
 * Render with `key={artifact.id}` from the parent, same reasoning as
 * DocEditor — a full remount is needed when the artifact changes, since
 * Univer's instance is imperatively created/destroyed in this effect, not
 * driven by React state.
 */
export function SheetEditor({ artifact }: { artifact: StudioArtifact }) {
  const containerRef = useRef<HTMLDivElement>(null);
  // Untyped against Univer's facade API on purpose — its exact TS surface
  // wasn't fully confirmable from docs, and the methods used below
  // (getActiveWorkbook/getActiveSheet/save) are called defensively rather
  // than type-checked.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const apiRef = useRef<any>(null);
  const update = useUpdateStudioArtifact(artifact.id);
  const rows = ((artifact.content as { rows?: Rows } | null)?.rows?.length ? (artifact.content as { rows: Rows }).rows : [[{ value: "" }]]);

  useEffect(() => {
    if (!containerRef.current) return;

    const { univerAPI } = createUniver({
      darkMode: true,
      locale: LocaleType.EN_US,
      locales: { [LocaleType.EN_US]: mergeLocales(UniverPresetSheetsCoreEnUS) },
      presets: [UniverSheetsCorePreset({ container: containerRef.current })],
    });
    apiRef.current = univerAPI;

    univerAPI.createWorkbook({});
    // Non-null: a workbook was just created above, so an active one always exists here.
    const sheet = univerAPI.getActiveWorkbook()!.getActiveSheet();
    const height = rows.length;
    const width = Math.max(...rows.map((row: Cell[]) => row.length), 1);
    sheet.getRange(0, 0, height, width).setValues(toICellData(rows));

    return () => univerAPI.dispose();
    // Intentionally mount-only — the parent remounts this whole component
    // (via `key={artifact.id}`) when the artifact changes, rather than
    // this effect reacting to prop changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSave = () => {
    const api = apiRef.current;
    if (!api) return;
    const snapshot = api.getActiveWorkbook().save();
    update.mutate({ content: { rows: fromSnapshot(snapshot) } });
  };

  const handleDownload = async () => {
    const api = apiRef.current;
    if (!api) return;
    const rows = fromSnapshot(api.getActiveWorkbook().save());
    const blob = await rowsToXlsxBlob(artifact.title, rows);
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${artifact.title || "spreadsheet"}.xlsx`;
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
            .xlsx
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
