import ExcelJS from "exceljs";

export interface SheetCell {
  value: string | number | boolean | null;
  formula?: string;
}
export type SheetRows = SheetCell[][];

/**
 * Builds a real .xlsx Blob directly from the stored {value, formula} rows —
 * extracted out of SheetEditor so a chat-inline artifact card can download
 * a spreadsheet without mounting the full Univer editor. Not built via
 * Univer's own export (exportSheetBySnapshotAsync requires the paid Pro
 * tier plus a self-hosted exchange server — confirmed live, see
 * SheetEditor.tsx's history); exceljs is free and needs nothing extra.
 */
export async function rowsToXlsxBlob(title: string, rows: SheetRows): Promise<Blob> {
  const workbook = new ExcelJS.Workbook();
  // Excel worksheet names: max 31 chars, and can't contain \/*?:[] — an
  // AI-generated title could plausibly contain any of these.
  const sheetName = title.replace(/[\\/*?:[\]]/g, " ").slice(0, 31).trim() || "Sheet1";
  const sheet = workbook.addWorksheet(sheetName);
  rows.forEach((row, r) => {
    row.forEach((cell, c) => {
      const target = sheet.getCell(r + 1, c + 1);
      target.value = cell.formula
        ? { formula: cell.formula.replace(/^=/, ""), result: typeof cell.value === "number" ? cell.value : undefined }
        : cell.value;
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}
