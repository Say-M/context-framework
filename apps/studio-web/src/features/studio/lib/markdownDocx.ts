import { Document, HeadingLevel, Packer, Paragraph, TextRun } from "docx";

const NUMBERING_REFERENCE = "studio-numbering";
const HEADING_BY_LEVEL = [HeadingLevel.HEADING_1, HeadingLevel.HEADING_2, HeadingLevel.HEADING_3];

interface InlineSegment {
  text: string;
  bold?: boolean;
  italic?: boolean;
}

// Same subset of inline markdown as markdownDoc.ts's parseInlineSegments —
// kept as a separate small copy rather than a shared import since the two
// modules target different libraries' object models (Univer's offset-based
// textRuns vs. docx's ordered TextRun list) and have nothing else in common.
function parseInlineSegments(line: string): InlineSegment[] {
  const segments: InlineSegment[] = [];
  const pattern = /\*\*(.+?)\*\*|\*(.+?)\*/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(line))) {
    if (match.index > lastIndex) segments.push({ text: line.slice(lastIndex, match.index) });
    if (match[1] !== undefined) segments.push({ text: match[1], bold: true });
    else if (match[2] !== undefined) segments.push({ text: match[2], italic: true });
    lastIndex = pattern.lastIndex;
  }
  if (lastIndex < line.length) segments.push({ text: line.slice(lastIndex) });
  return segments;
}

/**
 * Builds a real .docx Blob directly from markdown — independent of Univer
 * entirely, same reasoning as SheetEditor's exceljs export: Univer's own
 * document export (@univerjs-pro/docs-exchange-client) requires the paid
 * Pro tier plus a self-hosted exchange server, the same trap M2's Excel
 * export hit. `docx` is free, runs client-side, and needs nothing extra.
 */
export async function markdownToDocxBlob(title: string, markdown: string): Promise<Blob> {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");

  const paragraphs = lines.map((line) => {
    const heading = /^(#{1,3})\s+(.*)$/.exec(line);
    const bulletItem = /^[-*]\s+(.*)$/.exec(line);
    const orderItem = /^\d+\.\s+(.*)$/.exec(line);

    let text = line;
    let headingLevel: (typeof HeadingLevel)[keyof typeof HeadingLevel] | undefined;
    let bullet: { level: number } | undefined;
    let numbering: { reference: string; level: number } | undefined;

    if (heading) {
      text = heading[2] ?? "";
      headingLevel = HEADING_BY_LEVEL[(heading[1] ?? "#").length - 1];
    } else if (bulletItem) {
      text = bulletItem[1] ?? "";
      bullet = { level: 0 };
    } else if (orderItem) {
      text = orderItem[1] ?? "";
      numbering = { reference: NUMBERING_REFERENCE, level: 0 };
    }

    const runs = parseInlineSegments(text).map(
      (segment) => new TextRun({ text: segment.text, bold: segment.bold, italics: segment.italic }),
    );
    return new Paragraph({ heading: headingLevel, bullet, numbering, children: runs });
  });

  const doc = new Document({
    title,
    numbering: {
      config: [
        {
          reference: NUMBERING_REFERENCE,
          levels: [{ level: 0, format: "decimal", text: "%1.", alignment: "start" }],
        },
      ],
    },
    sections: [{ children: paragraphs }],
  });

  return Packer.toBlob(doc);
}
