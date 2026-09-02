import { BooleanNumber, BulletAlignment, ListGlyphType, NamedStyleType } from "@univerjs/presets";
import type { IDocumentBody, IDocumentData, IListData, IParagraph, ITextRun } from "@univerjs/presets";

/**
 * Shared markdown <-> Univer-document-data conversion, used by both
 * DocEditor and ResearchViewer (both store their body as markdown — see
 * StudioArtifact.model.ts — and both render it in a Univer Docs editor).
 *
 * Univer's Docs facade (FDocument) has no style-setting API — only plain
 * text insertion (appendText/insertText/insertParagraph) — so there's no
 * way to build a formatted document imperatively after creating it. The
 * only way to get headings/bold/lists to appear on load is to construct
 * the raw IDocumentData up front and pass it to createUniverDoc(). The
 * dataStream encoding (paragraph mark \r, section break \n, offsets into
 * dataStream for every paragraph/textRun) follows the documented contract
 * in @univerjs/core's IDocumentBody interface comment.
 *
 * Scope is deliberately narrow — headings (#/##/###), flat bullet/numbered
 * lists, bold/italic — matching what the Studio agent is asked to produce
 * (see studioTools.ts's create_doc/deliver_research_report descriptions)
 * and what the previous Lexical-based editor supported via
 * @lexical/markdown's TRANSFORMERS.
 */

interface InlineSegment {
  text: string;
  bold?: boolean;
  italic?: boolean;
}

// The only inline markdown syntax the Studio agent is asked to produce.
// Doesn't handle nesting (e.g. bold-within-italic) or other markdown inline
// syntax (links, code spans).
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

const BULLET_LIST_ID = "studio-bullet-list";
const ORDER_LIST_ID = "studio-order-list";

const BULLET_LIST_DATA: IListData = {
  listType: "BULLET_LIST",
  nestingLevel: [
    {
      bulletAlignment: BulletAlignment.START,
      glyphFormat: "%0",
      glyphType: ListGlyphType.BULLET,
      glyphSymbol: "●",
      startNumber: 1,
    },
  ],
};

const ORDER_LIST_DATA: IListData = {
  listType: "ORDER_LIST",
  nestingLevel: [
    {
      bulletAlignment: BulletAlignment.START,
      glyphFormat: "%1.",
      glyphType: ListGlyphType.DECIMAL,
      startNumber: 1,
    },
  ],
};

const HEADING_BY_LEVEL = [NamedStyleType.HEADING_1, NamedStyleType.HEADING_2, NamedStyleType.HEADING_3];

interface ParsedLine {
  text: string;
  namedStyleType?: NamedStyleType;
  bullet?: IParagraph["bullet"];
}

function parseLine(line: string): ParsedLine {
  const heading = /^(#{1,3})\s+(.*)$/.exec(line);
  if (heading) {
    return { text: heading[2] ?? "", namedStyleType: HEADING_BY_LEVEL[(heading[1] ?? "#").length - 1] };
  }
  const bulletItem = /^[-*]\s+(.*)$/.exec(line);
  if (bulletItem) {
    return { text: bulletItem[1] ?? "", bullet: { listType: "BULLET_LIST", listId: BULLET_LIST_ID, nestingLevel: 0 } };
  }
  const orderItem = /^\d+\.\s+(.*)$/.exec(line);
  if (orderItem) {
    return { text: orderItem[1] ?? "", bullet: { listType: "ORDER_LIST", listId: ORDER_LIST_ID, nestingLevel: 0 } };
  }
  return { text: line };
}

export function markdownToDocumentData(id: string, markdown: string): Partial<IDocumentData> {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  let dataStream = "";
  const paragraphs: IParagraph[] = [];
  const textRuns: ITextRun[] = [];
  let usesBullet = false;
  let usesOrder = false;

  for (const rawLine of lines) {
    const { text, namedStyleType, bullet } = parseLine(rawLine);
    if (bullet?.listId === BULLET_LIST_ID) usesBullet = true;
    if (bullet?.listId === ORDER_LIST_ID) usesOrder = true;

    for (const segment of parseInlineSegments(text)) {
      if (!segment.text) continue;
      const start = dataStream.length;
      dataStream += segment.text;
      if (segment.bold || segment.italic) {
        textRuns.push({
          st: start,
          ed: dataStream.length,
          ts: { bl: segment.bold ? BooleanNumber.TRUE : undefined, it: segment.italic ? BooleanNumber.TRUE : undefined },
        });
      }
    }

    dataStream += "\r";
    paragraphs.push({
      startIndex: dataStream.length - 1,
      paragraphStyle: namedStyleType !== undefined ? { namedStyleType } : undefined,
      bullet,
    });
  }
  dataStream += "\n";

  const lists: Record<string, IListData> = {};
  if (usesBullet) lists[BULLET_LIST_ID] = BULLET_LIST_DATA;
  if (usesOrder) lists[ORDER_LIST_ID] = ORDER_LIST_DATA;

  return {
    id,
    body: {
      dataStream,
      textRuns,
      paragraphs,
      sectionBreaks: [{ startIndex: dataStream.length - 1 }],
    },
    documentStyle: {},
    lists: usesBullet || usesOrder ? lists : undefined,
  };
}

const HEADING_LEVEL_OF: Partial<Record<NamedStyleType, number>> = {
  [NamedStyleType.HEADING_1]: 1,
  [NamedStyleType.HEADING_2]: 2,
  [NamedStyleType.HEADING_3]: 3,
};

/** Re-applies bold/italic markdown markers to the parts of `text` covered by styled textRuns. */
function renderInline(text: string, offset: number, textRuns: ITextRun[]): string {
  const styled = textRuns
    .map((run) => ({ st: Math.max(run.st, offset), ed: Math.min(run.ed, offset + text.length), ts: run.ts }))
    .filter((run) => run.ed > run.st && (run.ts?.bl === BooleanNumber.TRUE || run.ts?.it === BooleanNumber.TRUE))
    .sort((a, b) => a.st - b.st);
  if (!styled.length) return text;

  let result = "";
  let pos = offset;
  for (const run of styled) {
    if (run.st < pos) continue; // skip overlaps rather than producing malformed markers
    if (run.st > pos) result += text.slice(pos - offset, run.st - offset);
    const marker = run.ts?.bl === BooleanNumber.TRUE ? "**" : "*";
    result += `${marker}${text.slice(run.st - offset, run.ed - offset)}${marker}`;
    pos = run.ed;
  }
  if (pos < offset + text.length) result += text.slice(pos - offset);
  return result;
}

/** The inverse of markdownToDocumentData, reading a live/edited Univer document body back into markdown for persistence. */
export function documentDataToMarkdown(body: IDocumentBody | undefined): string {
  if (!body?.dataStream) return "";
  const { dataStream, paragraphs = [], textRuns = [] } = body;
  const lines: string[] = [];
  let cursor = 0;

  for (const paragraph of paragraphs) {
    const end = Math.min(paragraph.startIndex, dataStream.length);
    const text = dataStream.slice(cursor, end);
    const rendered = renderInline(text, cursor, textRuns);
    const level = paragraph.paragraphStyle?.namedStyleType !== undefined
      ? HEADING_LEVEL_OF[paragraph.paragraphStyle.namedStyleType]
      : undefined;

    if (level) lines.push(`${"#".repeat(level)} ${rendered}`);
    else if (paragraph.bullet?.listId === BULLET_LIST_ID) lines.push(`- ${rendered}`);
    else if (paragraph.bullet?.listId === ORDER_LIST_ID) lines.push(`1. ${rendered}`);
    else lines.push(rendered);

    cursor = end + 1; // past the paragraph mark
  }
  return lines.join("\n");
}
