// Plain TS module, not Zod schemas — deliberately placed alongside the
// schema files anyway (shared-schemas' index.ts already does a flat
// `export *` barrel) because both apps/api (studioTools.ts's create_slides
// tool) and apps/studio-web (SlideEditor's "add slide" layout picker) need
// the exact same layout-expansion logic, and this is the one package both
// already depend on.
//
// Why layout templates at all: an LLM asked to invent raw pixel coordinates
// tends to produce overlapping, ugly slides. Instead the agent picks a
// layout name and fills in a few content fields; buildSlideFromLayout()
// expands that into real, well-positioned SlideElements at creation time.
// Once expanded, every element is fully freeform-editable in the canvas —
// the template only decides the *starting* layout, not a permanent
// constraint. See the "Studio Slides" plan section for the full rationale.

export const SLIDE_WIDTH = 1280;
export const SLIDE_HEIGHT = 720;

// A bold, deliberately-chosen default palette (not left to the model to
// invent) so a freshly-generated deck looks intentional out of the box —
// dark background, white headings, a muted body tone, and two accent
// colors for variety (echoing the blue/gold combination in the Slides.com
// reference screenshot this rebuild was modeled on).
export const SLIDE_THEME = {
  background: "#0B0D14",
  heading: "#FFFFFF",
  body: "#B4B8C5",
  accentBlue: "#4F7CFF",
  accentGold: "#F2B84B",
  panel: "#1A1D27",
} as const;

// Not crypto.randomUUID() — this module's compiled output is consumed by
// both apps/api (Node lib) and apps/studio-web (DOM lib) tsconfigs, and a
// dependency-free counter is simpler than reconciling ambient `crypto`
// typings across both. IDs only need to be unique within one document.
let idCounter = 0;
function genId(): string {
  idCounter += 1;
  return `el-${Date.now().toString(36)}-${idCounter}`;
}

export interface SlideElementBase {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  rotation: number;
}

export interface TextSlideElement extends SlideElementBase {
  type: "text";
  text: string;
  fontSize: number;
  fontFamily: string;
  color: string;
  bold?: boolean;
  italic?: boolean;
  align?: "left" | "center" | "right";
}

export interface ShapeSlideElement extends SlideElementBase {
  type: "shape";
  shape: "rect" | "ellipse" | "line" | "arrow";
  fill: string;
  stroke?: string;
  strokeWidth?: number;
  opacity?: number;
}

export interface ImageSlideElement extends SlideElementBase {
  type: "image";
  // Same storagePath convention as image artifacts (see studioTools.ts's
  // generate_image) — resolved against STUDIO_ASSETS_DIR, not an absolute
  // path. May also be a data: URL for a manually-uploaded image.
  src: string;
  fit?: "cover" | "contain";
}

export interface TableSlideElement extends SlideElementBase {
  type: "table";
  rows: string[][];
}

// v1 is deliberately single-series (one value per category) — matches
// pptxgenjs's OptsChartData shape ({ labels, values }) exactly, so export
// needs no translation layer. Multi-series is a clear, separate extension.
export interface ChartSlideElement extends SlideElementBase {
  type: "chart";
  chartType: "bar" | "line" | "pie";
  categories: string[];
  series: number[];
  color?: string;
}

export type SlideElement = TextSlideElement | ShapeSlideElement | ImageSlideElement | TableSlideElement | ChartSlideElement;

export interface SlideData {
  id: string;
  background: { color: string };
  notes?: string;
  elements: SlideElement[];
}

export const SLIDE_LAYOUTS = [
  { id: "title", label: "Title", description: "A big centered title with an optional subtitle — for a deck's opening slide." },
  { id: "section", label: "Section", description: "A smaller centered heading used as a mid-deck divider between sections." },
  { id: "title-body", label: "Title + body", description: "A large left-aligned heading with a paragraph below and a decorative accent shape." },
  { id: "bullets", label: "Bullets", description: "A heading with a bulleted list below it." },
  { id: "two-column", label: "Two column", description: "A heading with two side-by-side lists of points." },
  { id: "image-left", label: "Image + text (image left)", description: "A heading and body on the right, an image placeholder on the left." },
  { id: "image-right", label: "Image + text (image right)", description: "A heading and body on the left, an image placeholder on the right." },
  { id: "quote", label: "Quote", description: "A large centered quotation with an attribution line." },
] as const;

export type SlideLayout = (typeof SLIDE_LAYOUTS)[number]["id"];

export interface SlideContentInput {
  heading?: string;
  subheading?: string;
  bullets?: string[];
  bodyText?: string;
  quote?: string;
  author?: string;
  notes?: string;
}

function text(
  partial: Omit<TextSlideElement, "id" | "type" | "rotation" | "fontFamily" | "color"> &
    Partial<Pick<TextSlideElement, "fontFamily" | "color">>,
): TextSlideElement {
  return {
    id: genId(),
    type: "text",
    rotation: 0,
    fontFamily: "Arial",
    color: SLIDE_THEME.heading,
    ...partial,
  };
}

function shape(partial: Omit<ShapeSlideElement, "id" | "type" | "rotation">): ShapeSlideElement {
  return { id: genId(), type: "shape", rotation: 0, ...partial };
}

/** A muted panel standing in for a real photo — agent-generated decks don't have a synchronous way to attach a real generated image, so image-left/image-right land as a clearly-labeled placeholder the user can replace via the editor's Image tool. */
function imagePlaceholder(x: number, y: number, w: number, h: number): ShapeSlideElement[] {
  return [shape({ x, y, w, h, shape: "rect", fill: SLIDE_THEME.panel })];
}

export function buildSlideFromLayout(layout: SlideLayout, content: SlideContentInput): SlideData {
  const heading = content.heading?.trim() || "Untitled slide";
  const elements: SlideElement[] = [];

  switch (layout) {
    case "title": {
      elements.push(
        shape({ x: 560, y: 248, w: 160, h: 8, shape: "rect", fill: SLIDE_THEME.accentGold }),
        text({ x: 80, y: 280, w: 1120, h: 160, text: heading, fontSize: 64, bold: true, align: "center" }),
      );
      if (content.subheading) {
        elements.push(
          text({ x: 80, y: 450, w: 1120, h: 60, text: content.subheading, fontSize: 24, color: SLIDE_THEME.body, align: "center" }),
        );
      }
      break;
    }
    case "section": {
      elements.push(
        shape({ x: 600, y: 330, w: 80, h: 6, shape: "rect", fill: SLIDE_THEME.accentBlue }),
        text({ x: 140, y: 350, w: 1000, h: 100, text: heading, fontSize: 40, bold: true, align: "center" }),
      );
      break;
    }
    case "title-body": {
      elements.push(
        text({ x: 80, y: 120, w: 900, h: 200, text: heading, fontSize: 56, bold: true, align: "left" }),
        shape({ x: 80, y: 300, w: 1000, h: 14, shape: "rect", fill: SLIDE_THEME.accentBlue }),
        shape({ x: 920, y: 400, w: 280, h: 280, shape: "ellipse", fill: SLIDE_THEME.accentGold, opacity: 0.18 }),
      );
      if (content.bodyText) {
        elements.push(
          text({ x: 80, y: 360, w: 760, h: 200, text: content.bodyText, fontSize: 20, color: SLIDE_THEME.body }),
        );
      }
      break;
    }
    case "bullets": {
      elements.push(text({ x: 80, y: 70, w: 1120, h: 100, text: heading, fontSize: 40, bold: true }));
      const bulletText = (content.bullets ?? []).map((b) => `•  ${b}`).join("\n\n");
      elements.push(text({ x: 80, y: 210, w: 1120, h: 470, text: bulletText, fontSize: 24, color: SLIDE_THEME.body }));
      break;
    }
    case "two-column": {
      elements.push(text({ x: 80, y: 70, w: 1120, h: 100, text: heading, fontSize: 40, bold: true }));
      const points = content.bullets ?? [];
      const mid = Math.ceil(points.length / 2);
      const left = points.slice(0, mid).map((b) => `•  ${b}`).join("\n\n");
      const right = points.slice(mid).map((b) => `•  ${b}`).join("\n\n");
      elements.push(
        text({ x: 80, y: 210, w: 520, h: 470, text: left, fontSize: 22, color: SLIDE_THEME.body }),
        text({ x: 680, y: 210, w: 520, h: 470, text: right, fontSize: 22, color: SLIDE_THEME.body }),
      );
      break;
    }
    case "image-left":
    case "image-right": {
      const imageOnLeft = layout === "image-left";
      const textX = imageOnLeft ? 680 : 80;
      const imageX = imageOnLeft ? 80 : 680;
      elements.push(text({ x: textX, y: 120, w: 520, h: 120, text: heading, fontSize: 36, bold: true }));
      if (content.bodyText) {
        elements.push(text({ x: textX, y: 260, w: 520, h: 340, text: content.bodyText, fontSize: 20, color: SLIDE_THEME.body }));
      }
      elements.push(...imagePlaceholder(imageX, 120, 520, 480));
      break;
    }
    case "quote": {
      elements.push(
        text({ x: 160, y: 260, w: 960, h: 240, text: `"${content.quote?.trim() || heading}"`, fontSize: 36, italic: true, align: "center" }),
      );
      if (content.author) {
        elements.push(
          text({ x: 160, y: 520, w: 960, h: 50, text: `— ${content.author}`, fontSize: 20, color: SLIDE_THEME.accentBlue, align: "center" }),
        );
      }
      break;
    }
  }

  return {
    id: genId(),
    background: { color: SLIDE_THEME.background },
    notes: content.notes,
    elements,
  };
}
