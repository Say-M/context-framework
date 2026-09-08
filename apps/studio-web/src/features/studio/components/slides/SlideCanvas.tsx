import { useEffect, useRef } from "react";
import type Konva from "konva";
import {
  Arrow,
  Circle,
  Ellipse,
  Group,
  Layer,
  Line,
  Rect,
  Stage,
  Text as KonvaText,
  Transformer,
  Wedge,
  Image as KonvaImage,
} from "react-konva";
import { SLIDE_HEIGHT, SLIDE_WIDTH, type SlideData, type SlideElement } from "@bismo/shared-schemas";
import { useHtmlImage } from "./useHtmlImage";

const MIN_SIZE = 20;

// Cycled through for pie slices — v1 has no per-slice color editing (see
// the "Studio Slides N2" plan section), so a small fixed palette stands in.
const CHART_PALETTE = ["#4F7CFF", "#F2B84B", "#7EE0C0", "#E4708A", "#B98EF2"];

function TableElement({ el }: { el: Extract<SlideElement, { type: "table" }> }) {
  const rows = el.rows.length || 1;
  const cols = el.rows[0]?.length || 1;
  const cellW = el.w / cols;
  const cellH = el.h / rows;
  const lines = [];
  for (let r = 0; r <= rows; r++) {
    lines.push(<Line key={`r${r}`} points={[0, r * cellH, el.w, r * cellH]} stroke="#3A3F4E" strokeWidth={1} />);
  }
  for (let c = 0; c <= cols; c++) {
    lines.push(<Line key={`c${c}`} points={[c * cellW, 0, c * cellW, el.h]} stroke="#3A3F4E" strokeWidth={1} />);
  }
  return (
    <>
      <Rect x={0} y={0} width={el.w} height={el.h} fill="#1A1D27" />
      {lines}
      {el.rows.map((row, r) =>
        row.map((cell, c) => (
          <KonvaText
            key={`${r}-${c}`}
            x={c * cellW + 8}
            y={r * cellH + 6}
            width={cellW - 16}
            height={cellH - 12}
            text={cell}
            fontSize={14}
            fontFamily="Arial"
            fill="#E4E6EC"
            wrap="word"
          />
        )),
      )}
    </>
  );
}

/**
 * Bar/line/pie rendered with plain Konva primitives (Rect/Line/Wedge) —
 * see the "Studio Slides N2" plan section for why: adding a DOM/SVG
 * charting library would need the same kind of canvas-coordinate bridging
 * the text-edit overlay above already flags as a workaround, not a pattern
 * worth repeating for something this central. v1 is single-series only.
 */
function ChartElement({ el }: { el: Extract<SlideElement, { type: "chart" }> }) {
  const { w, h, categories, series } = el;
  const color = el.color ?? CHART_PALETTE[0]!;
  const max = Math.max(1, ...series.map((v) => Math.max(0, v)));

  if (el.chartType === "pie") {
    const total = series.reduce((sum, v) => sum + Math.max(0, v), 0) || 1;
    const cx = w / 2;
    const cy = h / 2;
    const radius = Math.max(1, Math.min(w, h) / 2 - 4);
    let rotation = 0;
    return (
      <>
        {series.map((value, i) => {
          const angle = (Math.max(0, value) / total) * 360;
          const wedge = (
            <Wedge key={i} x={cx} y={cy} radius={radius} angle={angle} rotation={rotation} fill={CHART_PALETTE[i % CHART_PALETTE.length]} />
          );
          rotation += angle;
          return wedge;
        })}
      </>
    );
  }

  const labelHeight = 18;
  const plotH = Math.max(1, h - labelHeight - 8);
  const n = Math.max(1, categories.length);
  const slot = w / n;

  if (el.chartType === "line") {
    const points = categories.flatMap((_, i) => {
      const value = Math.max(0, series[i] ?? 0);
      return [slot * (i + 0.5), plotH - (value / max) * plotH];
    });
    return (
      <>
        <Line points={[0, plotH, w, plotH]} stroke="#3A3F4E" strokeWidth={1} />
        <Line points={points} stroke={color} strokeWidth={3} lineJoin="round" />
        {categories.map((label, i) => {
          const value = Math.max(0, series[i] ?? 0);
          const x = slot * (i + 0.5);
          const y = plotH - (value / max) * plotH;
          return (
            <Group key={i}>
              <Circle x={x} y={y} radius={4} fill={color} />
              <KonvaText x={slot * i} y={plotH + 4} width={slot} align="center" text={label} fontSize={12} fontFamily="Arial" fill="#B4B8C5" />
            </Group>
          );
        })}
      </>
    );
  }

  // bar
  const barGap = Math.min(12, slot * 0.2);
  const barW = Math.max(2, slot - barGap * 2);
  return (
    <>
      <Line points={[0, plotH, w, plotH]} stroke="#3A3F4E" strokeWidth={1} />
      {categories.map((label, i) => {
        const value = Math.max(0, series[i] ?? 0);
        const barH = (value / max) * plotH;
        const x = slot * i + barGap;
        return (
          <Group key={i}>
            <Rect x={x} y={plotH - barH} width={barW} height={barH} fill={color} />
            <KonvaText x={slot * i} y={plotH + 4} width={slot} align="center" text={label} fontSize={12} fontFamily="Arial" fill="#B4B8C5" />
          </Group>
        );
      })}
    </>
  );
}

function ImageElement({ el }: { el: Extract<SlideElement, { type: "image" }> }) {
  const image = useHtmlImage(el.src);
  if (!image) {
    return <Rect x={0} y={0} width={el.w} height={el.h} fill="#1A1D27" stroke="#3A3F4E" dash={[6, 4]} />;
  }
  return <KonvaImage image={image} x={0} y={0} width={el.w} height={el.h} />;
}

function ElementInner({ el }: { el: SlideElement }) {
  switch (el.type) {
    case "text":
      return (
        <KonvaText
          x={0}
          y={0}
          width={el.w}
          height={el.h}
          text={el.text}
          fontSize={el.fontSize}
          fontFamily={el.fontFamily}
          fontStyle={[el.bold ? "bold" : "", el.italic ? "italic" : ""].filter(Boolean).join(" ") || "normal"}
          fill={el.color}
          align={el.align ?? "left"}
          wrap="word"
        />
      );
    case "shape":
      if (el.shape === "rect") {
        return <Rect x={0} y={0} width={el.w} height={el.h} fill={el.fill} stroke={el.stroke} strokeWidth={el.strokeWidth} opacity={el.opacity ?? 1} />;
      }
      if (el.shape === "ellipse") {
        return (
          <Ellipse
            x={el.w / 2}
            y={el.h / 2}
            radiusX={el.w / 2}
            radiusY={el.h / 2}
            fill={el.fill}
            stroke={el.stroke}
            strokeWidth={el.strokeWidth}
            opacity={el.opacity ?? 1}
          />
        );
      }
      if (el.shape === "arrow") {
        return (
          <Arrow points={[0, el.h / 2, el.w, el.h / 2]} fill={el.fill} stroke={el.stroke ?? el.fill} strokeWidth={el.strokeWidth ?? 6} opacity={el.opacity ?? 1} />
        );
      }
      return <Line points={[0, 0, el.w, el.h]} stroke={el.stroke ?? el.fill} strokeWidth={el.strokeWidth ?? 4} opacity={el.opacity ?? 1} />;
    case "image":
      return <ImageElement el={el} />;
    case "table":
      return <TableElement el={el} />;
    case "chart":
      return <ChartElement el={el} />;
  }
}

/**
 * Every element renders as a Group at (x, y, rotation) containing its shape
 * drawn in local coordinates from (0, 0) to (w, h) — a uniform wrapper
 * regardless of element type, so Transformer resize/rotate math (read
 * scaleX/scaleY, multiply into w/h, reset scale to 1) is identical for
 * text/shape/image/table instead of diverging per Konva shape's own
 * coordinate quirks (e.g. Ellipse being center-based).
 *
 * The Stage is rendered at a fixed 1280x720 logical size scaled to fit its
 * container (via `scale`, computed by the parent from a ResizeObserver) —
 * every element's stored x/y/w/h stays in that logical space; only the
 * Stage's own scaleX/scaleY changes for different container sizes.
 */
export function SlideCanvas({
  slide,
  scale,
  selectedElementId,
  onSelect,
  onChange,
  editingElementId,
  onEditText,
  stageRef,
  registerNode,
}: {
  slide: SlideData;
  scale: number;
  selectedElementId: string | null;
  onSelect: (id: string | null) => void;
  onChange: (elementId: string, patch: Partial<SlideElement>) => void;
  editingElementId: string | null;
  onEditText: (elementId: string) => void;
  stageRef: React.RefObject<Konva.Stage | null>;
  registerNode: (elementId: string, node: Konva.Group | null) => void;
}) {
  const trRef = useRef<Konva.Transformer>(null);

  useEffect(() => {
    const tr = trRef.current;
    if (!tr) return;
    if (!selectedElementId) {
      tr.nodes([]);
      tr.getLayer()?.batchDraw();
      return;
    }
    const stage = stageRef.current;
    const node = stage?.findOne(`#el-${selectedElementId}`);
    if (node) {
      tr.nodes([node]);
      tr.getLayer()?.batchDraw();
    }
    // slide.elements.length covers "a new element was just added and needs
    // its Group to exist before Transformer can find it" — no extra
    // "nodesVersion" render-triggered-from-a-ref-callback bump is needed
    // (that pattern used to cause an infinite Group ref -> setState ->
    // re-render -> new ref identity -> ref fires again loop, since the
    // inline ref callback is a new function on every render).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedElementId, slide.elements.length]);

  const handleTransformEnd = (el: SlideElement, node: Konva.Group) => {
    const scaleX = node.scaleX();
    const scaleY = node.scaleY();
    const w = Math.max(MIN_SIZE, el.w * scaleX);
    const h = Math.max(MIN_SIZE, el.h * scaleY);
    node.scaleX(1);
    node.scaleY(1);
    onChange(el.id, { x: node.x(), y: node.y(), w, h, rotation: node.rotation() });
  };

  return (
    <Stage
      ref={stageRef}
      width={SLIDE_WIDTH * scale}
      height={SLIDE_HEIGHT * scale}
      scaleX={scale}
      scaleY={scale}
      onMouseDown={(e) => {
        const target = e.target;
        if (target === e.target.getStage() || target.name() === "background") onSelect(null);
      }}
    >
      <Layer>
        <Rect name="background" x={0} y={0} width={SLIDE_WIDTH} height={SLIDE_HEIGHT} fill={slide.background.color} />
        {slide.elements.map((el) => (
          <Group
            key={el.id}
            id={`el-${el.id}`}
            x={el.x}
            y={el.y}
            rotation={el.rotation}
            draggable
            visible={editingElementId !== el.id}
            ref={(node) => registerNode(el.id, node)}
            onClick={() => onSelect(el.id)}
            onTap={() => onSelect(el.id)}
            onDblClick={() => {
              if (el.type === "text") onEditText(el.id);
            }}
            onDragEnd={(e) => onChange(el.id, { x: e.target.x(), y: e.target.y() })}
            onTransformEnd={(e) => handleTransformEnd(el, e.target as unknown as Konva.Group)}
          >
            <ElementInner el={el} />
          </Group>
        ))}
        <Transformer
          ref={trRef}
          rotateEnabled
          boundBoxFunc={(oldBox, newBox) => (newBox.width < MIN_SIZE || newBox.height < MIN_SIZE ? oldBox : newBox)}
          anchorFill="#4F7CFF"
          anchorStroke="#4F7CFF"
          borderStroke="#4F7CFF"
        />
      </Layer>
    </Stage>
  );
}
