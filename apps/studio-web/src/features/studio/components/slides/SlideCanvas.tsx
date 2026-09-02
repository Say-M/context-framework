import { useEffect, useRef, useState } from "react";
import type Konva from "konva";
import { Arrow, Ellipse, Group, Layer, Line, Rect, Stage, Text as KonvaText, Transformer, Image as KonvaImage } from "react-konva";
import { SLIDE_HEIGHT, SLIDE_WIDTH, type SlideData, type SlideElement } from "@bismo/shared-schemas";
import { useHtmlImage } from "./useHtmlImage";

const MIN_SIZE = 20;

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
  const [nodesVersion, setNodesVersion] = useState(0);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedElementId, nodesVersion, slide.elements.length]);

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
            ref={(node) => {
              registerNode(el.id, node);
              if (node) setNodesVersion((v) => v + 1);
            }}
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
