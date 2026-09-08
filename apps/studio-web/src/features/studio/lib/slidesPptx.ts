import PptxGenJS from "pptxgenjs";
import type { SlideData } from "@bismo/shared-schemas";

// 1280x720 at 96px/inch = 13.333x7.5in, which is exactly PptxGenJS's
// built-in "LAYOUT_WIDE" (13.33x7.5in) — no custom defineLayout() needed.
const PX_PER_INCH = 96;
const inch = (px: number) => px / PX_PER_INCH;
const hex = (color: string) => color.replace("#", "");

/**
 * Maps our freeform SlideElement model directly onto PptxGenJS's
 * addText/addShape/addImage/addTable, all of which already speak the same
 * x/y/w/h(/rotate) coordinate language Konva does — see the "Studio Slides"
 * plan section for why that shared language was the deciding factor in
 * picking react-konva over alternatives.
 */
export async function slidesToPptx(title: string, slides: SlideData[]) {
  const pres = new PptxGenJS();
  pres.layout = "LAYOUT_WIDE";

  for (const slide of slides) {
    const pptxSlide = pres.addSlide();
    pptxSlide.background = { color: hex(slide.background.color) };

    for (const el of slide.elements) {
      const common = { x: inch(el.x), y: inch(el.y), w: inch(el.w), h: inch(el.h), rotate: el.rotation };

      if (el.type === "text") {
        pptxSlide.addText(el.text, {
          ...common,
          fontSize: Math.max(8, Math.round(el.fontSize * 0.75)), // px -> pt approximation
          fontFace: el.fontFamily,
          color: hex(el.color),
          bold: el.bold,
          italic: el.italic,
          align: el.align,
          valign: "top",
        });
      } else if (el.type === "shape") {
        // "line" fell through to a plain rect here previously — pptxgenjs's
        // ShapeType enum does include 'line' (confirmed in its .d.ts), so
        // it maps directly instead of silently degrading.
        const shapeType =
          el.shape === "ellipse" ? "ellipse" : el.shape === "arrow" ? "rightArrow" : el.shape === "line" ? "line" : "rect";
        pptxSlide.addShape(shapeType, {
          ...common,
          fill: { color: hex(el.fill), transparency: el.opacity !== undefined ? Math.round((1 - el.opacity) * 100) : 0 },
          line: el.stroke ? { color: hex(el.stroke), width: el.strokeWidth ?? 1 } : { type: "none" },
        });
      } else if (el.type === "image") {
        if (el.src.startsWith("data:")) {
          pptxSlide.addImage({ ...common, data: el.src });
        }
      } else if (el.type === "table") {
        pptxSlide.addTable(
          el.rows.map((row) => row.map((cell) => ({ text: cell }))),
          { x: common.x, y: common.y, w: common.w, h: common.h, fontSize: 12 },
        );
      } else if (el.type === "chart") {
        // A real, editable PowerPoint chart (not a static image) —
        // OptsChartData's { labels, values } shape matches our
        // single-series { categories, series } element exactly.
        const chartType =
          el.chartType === "pie" ? pres.ChartType.pie : el.chartType === "line" ? pres.ChartType.line : pres.ChartType.bar;
        pptxSlide.addChart(chartType, [{ labels: el.categories, values: el.series }], {
          ...common,
          chartColors: [hex(el.color ?? "#4F7CFF")],
        });
      }
    }

    if (slide.notes) pptxSlide.addNotes(slide.notes);
  }

  await pres.writeFile({ fileName: `${title || "slides"}.pptx` });
}

