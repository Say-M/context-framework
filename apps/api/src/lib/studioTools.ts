import { mkdir, writeFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import path from "node:path";
import { z } from "zod";
import { tool, createSdkMcpServer } from "@anthropic-ai/claude-agent-sdk";
import { GoogleGenAI, Modality } from "@google/genai";
import { StudioArtifactModel } from "@bismo/db-models";
import { SLIDE_LAYOUTS, buildSlideFromLayout, type SlideLayout } from "@bismo/shared-schemas";
import { env } from "../config/env";

const IMAGE_MODEL = "gemini-2.5-flash-image"; // "Nano Banana"
const EXTENSION_BY_MIME_TYPE: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

export interface StudioToolContext {
  threadId: string;
  createdBy: string;
  /** Called once a tool creates/updates an artifact, so the caller can link it to this turn's assistant message. */
  onArtifactReady: (artifactId: string) => void;
}

function textResult(text: string) {
  return { content: [{ type: "text" as const, text }] };
}

// Fully-qualified tool names the model can call — mirrors how ExitPlanMode
// has to be explicitly listed in agentRun.ts's `tools` allow-list; MCP
// tools are namespaced mcp__<server>__<tool> and need the same treatment.
export const STUDIO_TOOL_NAMES = [
  "mcp__studio__create_doc",
  "mcp__studio__create_spreadsheet",
  "mcp__studio__create_slides",
  "mcp__studio__generate_image",
  "mcp__studio__deliver_research_report",
] as const;

const cellSchema = z.object({
  value: z.union([z.string(), z.number(), z.boolean()]).nullable().describe("The cell's literal value."),
  formula: z
    .string()
    .optional()
    .describe('An Excel-style formula string starting with "=", e.g. "=SUM(B2:B5)". Omit for a literal cell.'),
});

// A model asked to invent raw pixel coordinates tends to produce
// overlapping, ugly slides — instead it picks one of a small set of layout
// templates and fills in content slots; buildSlideFromLayout (from
// @bismo/shared-schemas, shared with the frontend's own layout picker)
// expands that into real, well-positioned, fully freeform-editable
// elements. See slide-layouts.ts for the template definitions.
const slideLayoutIds = SLIDE_LAYOUTS.map((l) => l.id) as [SlideLayout, ...SlideLayout[]];
const slideLayoutGuide = SLIDE_LAYOUTS.map((l) => `- ${l.id}: ${l.description}`).join("\n");

const slideInputSchema = z.object({
  layout: z.enum(slideLayoutIds).describe("Which layout template this slide uses."),
  heading: z.string().max(200).optional().describe("The slide's main heading/title text — used by every layout except quote."),
  subheading: z.string().max(300).optional().describe("A smaller line below the heading — used by the title layout."),
  bodyText: z.string().max(2000).optional().describe("A paragraph of body copy — used by the title-body and image-left/image-right layouts."),
  bullets: z
    .array(z.string().max(300))
    .optional()
    .describe("A list of points — used by the bullets layout, and split roughly in half between the two columns for two-column."),
  quote: z.string().max(500).optional().describe("The quotation text — used by the quote layout."),
  author: z.string().max(200).optional().describe("The quote's attribution — used by the quote layout."),
  notes: z.string().max(2000).optional().describe("Optional speaker notes for this slide."),
});

/**
 * Builds the Studio agent's custom in-process tool server. One `query()`
 * session registers all of these; the model's choice of tool (or no tool,
 * just a text reply) is the router between "just chat" and "produce an
 * artifact" — see agentRun.ts's `mcpServers` option and studioAgent.ts.
 *
 * Each handler persists directly to Mongo rather than returning structured
 * data for an outer layer to save — keeps the artifact-creation logic in
 * one place per kind, and means agentRun.ts's generic tool_use publishing
 * needs no special-casing for Studio (only ExitPlanMode gets that, and
 * only because its result has to pause the turn, not just persist something).
 */
export function buildStudioMcpServer(ctx: StudioToolContext) {
  const createDoc = tool(
    "create_doc",
    "Create a new document artifact for the user — a report, memo, letter, or any other written content they'll want to keep, edit, and download as a Word file. Use this whenever the request is for a piece of writing, not just a conversational answer.",
    {
      title: z.string().min(1).max(200).describe("A short, descriptive title for the document."),
      description: z.string().min(1).max(300).describe("A one-sentence summary of what this document contains, shown on its card — not a restatement of the title."),
      // Markdown, not a rich document-tree format: far more reliable for
      // the model to produce correctly, and the frontend's Lexical editor
      // round-trips markdown on load/save via @lexical/markdown — so this
      // never needs the model to emit Lexical's own node-graph JSON.
      markdown: z.string().min(1).describe("The document's full content, formatted as markdown."),
    },
    async (args) => {
      const artifact = await StudioArtifactModel.create({
        threadId: ctx.threadId,
        createdBy: ctx.createdBy,
        kind: "doc",
        title: args.title,
        description: args.description,
        content: { markdown: args.markdown },
      });
      ctx.onArtifactReady(String(artifact._id));
      return textResult(`Created the document "${args.title}".`);
    },
  );

  const createSpreadsheet = tool(
    "create_spreadsheet",
    "Create a new spreadsheet artifact for the user — budgets, trackers, tabular data, anything they'll want to edit as a real spreadsheet (with working formulas) and download as an Excel file. Use this instead of create_doc when the content is naturally tabular/numeric rather than prose.",
    {
      title: z.string().min(1).max(200).describe("A short, descriptive title for the spreadsheet."),
      description: z.string().min(1).max(300).describe("A one-sentence summary of what this spreadsheet tracks, shown on its card — not a restatement of the title."),
      // A plain dense 2D array — every row must have the same number of
      // cells — rather than Univer's own sparse row/col-keyed cellData
      // format: far simpler for the model to produce reliably. The
      // frontend converts to/from Univer's native shape at load/save time.
      rows: z
        .array(z.array(cellSchema))
        .min(1)
        .describe(
          "A dense 2D array of rows, each an array of cells in column order (every row must have the same length). Row 0 is typically a header row.",
        ),
    },
    async (args) => {
      const width = args.rows[0]?.length ?? 0;
      if (args.rows.some((row) => row.length !== width)) {
        return { content: [{ type: "text" as const, text: "Every row must have the same number of cells." }], isError: true };
      }
      const artifact = await StudioArtifactModel.create({
        threadId: ctx.threadId,
        createdBy: ctx.createdBy,
        kind: "spreadsheet",
        title: args.title,
        description: args.description,
        content: { rows: args.rows },
      });
      ctx.onArtifactReady(String(artifact._id));
      return textResult(`Created the spreadsheet "${args.title}".`);
    },
  );

  const createSlides = tool(
    "create_slides",
    `Create a new slide deck artifact for the user — pitch decks, presentations, any content organized as a sequence of slides they'll want to present, edit, and download. Use this instead of create_doc/create_spreadsheet when the request is for a presentation.\n\nEach slide picks ONE layout:\n${slideLayoutGuide}\n\nDon't invent your own layout or coordinates — pick the closest layout and fill in its content fields; the deck opens in a freeform canvas editor where the user can reposition/resize everything afterward. image-left/image-right insert a placeholder box, not a real picture — don't describe it as if it shows something specific.`,
    {
      title: z.string().min(1).max(200).describe("A short, descriptive title for the deck."),
      description: z.string().min(1).max(300).describe("A one-sentence summary of what this deck covers, shown on its card — not a restatement of the title."),
      slides: z.array(slideInputSchema).min(1).describe("The deck's slides, in presentation order."),
    },
    async (args) => {
      const slides = args.slides.map((s) => buildSlideFromLayout(s.layout, s));
      const artifact = await StudioArtifactModel.create({
        threadId: ctx.threadId,
        createdBy: ctx.createdBy,
        kind: "slides",
        title: args.title,
        description: args.description,
        content: { slides },
      });
      ctx.onArtifactReady(String(artifact._id));
      return textResult(`Created the "${args.title}" deck with ${slides.length} slide(s).`);
    },
  );

  const generateImage = tool(
    "generate_image",
    "Generate a graphic/image for the user — posters, illustrations, banners, anything visual they'll want to view and download. Use this when the request is for a picture, not a document/spreadsheet/deck.",
    {
      title: z.string().min(1).max(200).describe("A short, descriptive title for the image."),
      description: z.string().min(1).max(300).describe("A one-sentence summary of what this image shows, shown on its card — not a restatement of the title."),
      prompt: z
        .string()
        .min(1)
        .max(2000)
        .describe("A detailed visual description of the image to generate — style, subject, composition, colors."),
    },
    async (args) => {
      if (!env.GOOGLE_API_KEY) {
        return {
          content: [{ type: "text" as const, text: "Image generation isn't configured on this deployment (no GOOGLE_API_KEY set) — let the user know rather than pretending to have created one." }],
          isError: true,
        };
      }

      const ai = new GoogleGenAI({ apiKey: env.GOOGLE_API_KEY });
      const response = await ai.models.generateContent({
        model: IMAGE_MODEL,
        contents: args.prompt,
        config: { responseModalities: [Modality.IMAGE] },
      });

      const part = response.candidates?.[0]?.content?.parts?.find((p) => p.inlineData)?.inlineData;
      const base64Data = part?.data ?? response.data;
      if (!base64Data) {
        return {
          content: [{ type: "text" as const, text: "The image model didn't return any image data — try rephrasing the request." }],
          isError: true,
        };
      }
      const mimeType = part?.mimeType ?? "image/png";
      const extension = EXTENSION_BY_MIME_TYPE[mimeType] ?? "png";

      await mkdir(env.STUDIO_ASSETS_DIR, { recursive: true });
      const filename = `${randomBytes(16).toString("hex")}.${extension}`;
      await writeFile(path.join(env.STUDIO_ASSETS_DIR, filename), Buffer.from(base64Data, "base64"));

      const artifact = await StudioArtifactModel.create({
        threadId: ctx.threadId,
        createdBy: ctx.createdBy,
        kind: "image",
        title: args.title,
        description: args.description,
        // Just the filename, not an absolute path — the serving route
        // (GET /studio/artifacts/:id/image) reconstructs the full path
        // from STUDIO_ASSETS_DIR, same reasoning as generated-apps' repoDir()
        // deriving paths from an id rather than storing them.
        content: { prompt: args.prompt, mimeType, storagePath: filename },
      });
      ctx.onArtifactReady(String(artifact._id));
      return textResult(`Generated the image "${args.title}".`);
    },
  );

  const deliverResearchReport = tool(
    "deliver_research_report",
    "Deliver a completed deep-research report to the user after using WebSearch/WebFetch to gather current, real information from the web. Call this once, at the end of your research, with the finished report and the sources you actually found — not as a first step, and not for questions answerable from general knowledge alone (reply directly, or use create_doc, for those).",
    {
      title: z.string().min(1).max(200).describe("A short, descriptive title for the report."),
      description: z.string().min(1).max(300).describe("A one-sentence summary of what this report found, shown on its card — not a restatement of the title."),
      markdownReport: z
        .string()
        .min(1)
        .describe("The full research report, formatted as markdown — headings, structure, citations inline where useful."),
      sources: z
        .array(
          z.object({
            title: z.string().min(1).describe("The source page's title."),
            url: z.string().url().describe("The source page's URL."),
          }),
        )
        .min(1)
        .describe("The real web sources found via WebSearch/WebFetch that back this report."),
    },
    async (args) => {
      const artifact = await StudioArtifactModel.create({
        threadId: ctx.threadId,
        createdBy: ctx.createdBy,
        kind: "research",
        title: args.title,
        description: args.description,
        content: { markdownReport: args.markdownReport, sources: args.sources },
      });
      ctx.onArtifactReady(String(artifact._id));
      return textResult(`Delivered the research report "${args.title}" with ${args.sources.length} source(s).`);
    },
  );

  return createSdkMcpServer({
    name: "studio",
    tools: [createDoc, createSpreadsheet, createSlides, generateImage, deliverResearchReport],
  });
}
