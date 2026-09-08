import { useEffect, useRef, useState } from "react";
import type Konva from "konva";
import {
  ArrowRight,
  BarChart3,
  ChevronDown,
  ChevronUp,
  Copy,
  Download,
  Image as ImageIcon,
  Minus,
  MousePointer2,
  Plus,
  Presentation,
  Save,
  Square,
  Table2,
  Trash2,
  Type,
} from "lucide-react";
import { Button, Input, Select, Textarea, cn } from "@bismo/ui";
import type { StudioArtifact } from "@bismo/shared-schemas";
import {
  SLIDE_HEIGHT,
  SLIDE_LAYOUTS,
  SLIDE_THEME,
  SLIDE_WIDTH,
  buildSlideFromLayout,
  type SlideData,
  type SlideElement,
  type SlideLayout,
} from "@bismo/shared-schemas";
import { useUpdateStudioArtifact } from "../queries";
import { slidesToPptx } from "../lib/slidesPptx";
import { SlideCanvas } from "./slides/SlideCanvas";

function genId(): string {
  return crypto.randomUUID();
}

type Tool = "select" | "text" | "shape" | "line" | "arrow" | "image" | "table" | "chart";

const ELEMENT_ICON: Record<SlideElement["type"], typeof Type> = {
  text: Type,
  shape: Square,
  image: ImageIcon,
  table: Table2,
  chart: BarChart3,
};

const SHAPE_OPTIONS = [
  { value: "rect", label: "Rectangle" },
  { value: "ellipse", label: "Ellipse" },
  { value: "line", label: "Line" },
  { value: "arrow", label: "Arrow" },
];

const FIT_OPTIONS = [
  { value: "cover", label: "Cover" },
  { value: "contain", label: "Contain" },
];

const CHART_TYPE_OPTIONS = [
  { value: "bar", label: "Bar" },
  { value: "line", label: "Line" },
  { value: "pie", label: "Pie" },
];

const LAYOUT_OPTIONS = SLIDE_LAYOUTS.map((l) => ({ value: l.id, label: l.label }));

function elementLabel(el: SlideElement): string {
  if (el.type === "text") return el.text.slice(0, 24) || "Text";
  if (el.type === "shape") return `Shape (${el.shape})`;
  if (el.type === "image") return "Image";
  if (el.type === "chart") return `Chart (${el.chartType})`;
  return "Table";
}

/**
 * Full freeform canvas editor replacing the old markdown-per-slide/reveal.js
 * SlideEditor — see the "Studio Slides" plan for the architecture (react-
 * konva, a fixed 1280x720 logical canvas, the layout-template system in
 * @bismo/shared-schemas's slide-layouts.ts). Every element renders as a
 * Konva Group (see SlideCanvas.tsx) that Transformer resizes/rotates
 * uniformly regardless of element type; this component owns the actual
 * `slides` state, tool rail, properties/layers panel, filmstrip, and
 * save/.pptx export.
 *
 * Render with `key={artifact.id}` from the parent, same reasoning as every
 * other editor in Studio — imperative canvas state (Konva refs) shouldn't
 * survive a switch to a different artifact.
 */
export function SlideEditor({ artifact }: { artifact: StudioArtifact }) {
  const [slides, setSlides] = useState<SlideData[]>(() => {
    const initial = (artifact.content as { slides?: SlideData[] } | null)?.slides;
    return initial && initial.length > 0 ? initial : [buildSlideFromLayout("title", { heading: artifact.title })];
  });
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [editingElementId, setEditingElementId] = useState<string | null>(null);
  const [addLayout, setAddLayout] = useState<SlideLayout>("title-body");
  const [scale, setScale] = useState(0.4);

  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const nodeRefs = useRef<Record<string, Konva.Group>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const replaceImageId = useRef<string | null>(null);
  const update = useUpdateStudioArtifact(artifact.id);

  const activeSlide = slides[activeSlideIndex] ?? slides[0]!;
  const selectedElement = activeSlide.elements.find((el) => el.id === selectedElementId) ?? null;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      const next = Math.max(0.05, Math.min(width / SLIDE_WIDTH, height / SLIDE_HEIGHT));
      setScale(next);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const registerNode = (id: string, node: Konva.Group | null) => {
    if (node) nodeRefs.current[id] = node;
    else delete nodeRefs.current[id];
  };

  const updateActiveSlide = (patch: Partial<SlideData>) => {
    setSlides((prev) => prev.map((s, i) => (i === activeSlideIndex ? { ...s, ...patch } : s)));
  };

  const updateElement = (elementId: string, patch: Record<string, unknown>) => {
    updateActiveSlide({
      elements: activeSlide.elements.map((el) => (el.id === elementId ? ({ ...el, ...patch } as SlideElement) : el)),
    });
  };

  const addElement = (el: SlideElement) => {
    updateActiveSlide({ elements: [...activeSlide.elements, el] });
    setSelectedElementId(el.id);
  };

  const deleteSelected = () => {
    if (!selectedElementId) return;
    updateActiveSlide({ elements: activeSlide.elements.filter((el) => el.id !== selectedElementId) });
    setSelectedElementId(null);
  };

  const duplicateSelected = () => {
    if (!selectedElement) return;
    addElement({ ...selectedElement, id: genId(), x: selectedElement.x + 24, y: selectedElement.y + 24 });
  };

  const reorderSelected = (direction: "forward" | "backward") => {
    if (!selectedElementId) return;
    const idx = activeSlide.elements.findIndex((el) => el.id === selectedElementId);
    const swapWith = direction === "forward" ? idx + 1 : idx - 1;
    if (idx < 0 || swapWith < 0 || swapWith >= activeSlide.elements.length) return;
    const next = [...activeSlide.elements];
    [next[idx], next[swapWith]] = [next[swapWith]!, next[idx]!];
    updateActiveSlide({ elements: next });
  };

  const openImagePicker = (replaceId: string | null) => {
    replaceImageId.current = replaceId;
    fileInputRef.current?.click();
  };

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) {
      alert("Please use an image under 3MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const src = reader.result as string;
      if (replaceImageId.current) {
        updateElement(replaceImageId.current, { src });
      } else {
        addElement({ id: genId(), type: "image", x: 440, y: 210, w: 400, h: 300, rotation: 0, src });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleToolClick = (tool: Tool) => {
    if (tool === "text") {
      addElement({
        id: genId(),
        type: "text",
        x: 440,
        y: 320,
        w: 400,
        h: 80,
        rotation: 0,
        text: "Text",
        fontSize: 28,
        fontFamily: "Arial",
        color: "#FFFFFF",
        align: "left",
      });
    } else if (tool === "shape") {
      addElement({ id: genId(), type: "shape", x: 490, y: 260, w: 300, h: 200, rotation: 0, shape: "rect", fill: "#4F7CFF" });
    } else if (tool === "line") {
      // Thin and near-flat (small h) — SlideCanvas draws "line" as a
      // (0,0)->(w,h) diagonal, so a small h reads as horizontal.
      addElement({ id: genId(), type: "shape", x: 440, y: 358, w: 300, h: 4, rotation: 0, shape: "line", fill: SLIDE_THEME.body });
    } else if (tool === "arrow") {
      addElement({ id: genId(), type: "shape", x: 440, y: 357, w: 300, h: 6, rotation: 0, shape: "arrow", fill: SLIDE_THEME.accentBlue });
    } else if (tool === "chart") {
      addElement({
        id: genId(),
        type: "chart",
        x: 440,
        y: 210,
        w: 400,
        h: 300,
        rotation: 0,
        chartType: "bar",
        categories: ["A", "B", "C"],
        series: [30, 60, 45],
        color: SLIDE_THEME.accentBlue,
      });
    } else if (tool === "table") {
      addElement({
        id: genId(),
        type: "table",
        x: 400,
        y: 260,
        w: 480,
        h: 200,
        rotation: 0,
        rows: [
          ["", ""],
          ["", ""],
        ],
      });
    } else if (tool === "image") {
      openImagePicker(null);
    }
  };

  const addSlide = () => {
    const slide = buildSlideFromLayout(addLayout, { heading: "New slide" });
    setSlides((prev) => [...prev, slide]);
    setActiveSlideIndex(slides.length);
    setSelectedElementId(null);
  };

  const deleteSlide = (index: number) => {
    if (slides.length <= 1) return;
    setSlides((prev) => prev.filter((_, i) => i !== index));
    setActiveSlideIndex((prev) => (prev >= index ? Math.max(0, prev - 1) : prev));
    setSelectedElementId(null);
  };

  // --- Text edit overlay: Konva has no native inline text editing, so a
  // plain HTML textarea is positioned on top of the (hidden) Konva Text
  // node at double-click. Rotation isn't accounted for in the overlay's
  // position — a rotated text box just edits without visually rotating,
  // a minor v1 limitation.
  const [overlayRect, setOverlayRect] = useState<{ left: number; top: number; width: number; height: number } | null>(null);
  const [overlayValue, setOverlayValue] = useState("");

  useEffect(() => {
    if (!editingElementId) {
      setOverlayRect(null);
      return;
    }
    const node = nodeRefs.current[editingElementId];
    const stage = stageRef.current;
    const el = activeSlide.elements.find((e) => e.id === editingElementId);
    if (!node || !stage || !el || el.type !== "text") {
      setEditingElementId(null);
      return;
    }
    const box = node.getClientRect({ relativeTo: stage });
    const containerRect = stage.container().getBoundingClientRect();
    setOverlayRect({
      left: containerRect.left + box.x * scale,
      top: containerRect.top + box.y * scale,
      width: box.width * scale,
      height: box.height * scale,
    });
    setOverlayValue(el.text);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingElementId]);

  const commitOverlay = () => {
    if (editingElementId) updateElement(editingElementId, { text: overlayValue });
    setEditingElementId(null);
  };

  const handleSave = () => {
    update.mutate({ content: { slides } });
  };

  const handleDownload = () => {
    void slidesToPptx(artifact.title, slides);
  };

  return (
    <div className="flex h-full flex-col gap-3">
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelected} />

      <div className="flex items-center justify-between gap-2">
        <h3 className="truncate font-semibold text-[var(--bismo-text)]">{artifact.title}</h3>
        <div className="flex flex-shrink-0 gap-2">
          <Button variant="secondary" size="sm" onClick={handleDownload}>
            <Download size={14} strokeWidth={1.75} />
            .pptx
          </Button>
          <Button size="sm" onClick={handleSave} disabled={update.isPending}>
            <Save size={14} strokeWidth={1.75} />
            {update.isPending ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 gap-2">
        {/* Tool rail */}
        <div className="flex flex-shrink-0 flex-col gap-1.5 rounded-md border border-[var(--bismo-border)] p-1.5">
          {(
            [
              ["select", MousePointer2, "Select"],
              ["text", Type, "Text"],
              ["shape", Square, "Shape"],
              ["line", Minus, "Line"],
              ["arrow", ArrowRight, "Arrow"],
              ["image", ImageIcon, "Image"],
              ["table", Table2, "Table"],
              ["chart", BarChart3, "Chart"],
            ] as const
          ).map(([tool, Icon, label]) => (
            <button
              key={tool}
              type="button"
              title={label}
              onClick={() => handleToolClick(tool)}
              className="flex h-9 w-9 items-center justify-center rounded-md text-[var(--bismo-text-muted)] hover:bg-[var(--bismo-bg-hover)] hover:text-[var(--bismo-text)]"
            >
              <Icon size={16} strokeWidth={1.75} />
            </button>
          ))}
        </div>

        {/* Canvas */}
        <div
          ref={containerRef}
          className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-md border border-[var(--bismo-border)] bg-[#05060A]"
        >
          <SlideCanvas
            slide={activeSlide}
            scale={scale}
            selectedElementId={selectedElementId}
            onSelect={setSelectedElementId}
            onChange={updateElement}
            editingElementId={editingElementId}
            onEditText={setEditingElementId}
            stageRef={stageRef}
            registerNode={registerNode}
          />
          {overlayRect && (
            <textarea
              autoFocus
              value={overlayValue}
              onChange={(e) => setOverlayValue(e.target.value)}
              onBlur={commitOverlay}
              onKeyDown={(e) => {
                if (e.key === "Escape") commitOverlay();
              }}
              style={{
                position: "fixed",
                left: overlayRect.left,
                top: overlayRect.top,
                width: overlayRect.width,
                height: overlayRect.height,
                fontSize: (selectedElement?.type === "text" ? selectedElement.fontSize : 16) * scale,
                fontFamily: selectedElement?.type === "text" ? selectedElement.fontFamily : "Arial",
                color: selectedElement?.type === "text" ? selectedElement.color : "#fff",
                lineHeight: 1.2,
              }}
              className="z-50 resize-none border border-[var(--bismo-accent-blueprint)] bg-black/70 p-0 outline-none"
            />
          )}
        </div>

        {/* Properties + layers */}
        <div className="flex w-64 flex-shrink-0 flex-col gap-4 overflow-y-auto rounded-md border border-[var(--bismo-border)] p-3">
          {selectedElement ? (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-[var(--bismo-text-muted)]">Properties</p>
                <div className="flex gap-1">
                  <button
                    type="button"
                    title="Duplicate"
                    onClick={duplicateSelected}
                    className="flex h-6 w-6 items-center justify-center rounded text-[var(--bismo-text-muted)] hover:text-[var(--bismo-text)]"
                  >
                    <Copy size={13} strokeWidth={1.75} />
                  </button>
                  <button
                    type="button"
                    title="Delete"
                    onClick={deleteSelected}
                    className="flex h-6 w-6 items-center justify-center rounded text-[var(--bismo-text-muted)] hover:text-[var(--bismo-status-rejected)]"
                  >
                    <Trash2 size={13} strokeWidth={1.75} />
                  </button>
                </div>
              </div>

              {selectedElement.type === "text" && (
                <>
                  <Textarea
                    value={selectedElement.text}
                    onChange={(e) => updateElement(selectedElement.id, { text: e.target.value })}
                    className="min-h-[70px] text-sm"
                  />
                  <label className="text-xs text-[var(--bismo-text-muted)]">Font size</label>
                  <Input
                    type="number"
                    value={selectedElement.fontSize}
                    onChange={(e) => updateElement(selectedElement.id, { fontSize: Number(e.target.value) || 12 })}
                  />
                  <label className="text-xs text-[var(--bismo-text-muted)]">Color</label>
                  <input
                    type="color"
                    value={selectedElement.color}
                    onChange={(e) => updateElement(selectedElement.id, { color: e.target.value })}
                    className="h-8 w-full rounded border border-[var(--bismo-border)] bg-transparent"
                  />
                  <div className="flex gap-1.5">
                    <Button
                      variant={selectedElement.bold ? "primary" : "secondary"}
                      size="sm"
                      onClick={() => updateElement(selectedElement.id, { bold: !selectedElement.bold })}
                    >
                      B
                    </Button>
                    <Button
                      variant={selectedElement.italic ? "primary" : "secondary"}
                      size="sm"
                      onClick={() => updateElement(selectedElement.id, { italic: !selectedElement.italic })}
                    >
                      I
                    </Button>
                    {(["left", "center", "right"] as const).map((align) => (
                      <Button
                        key={align}
                        variant={selectedElement.align === align ? "primary" : "secondary"}
                        size="sm"
                        onClick={() => updateElement(selectedElement.id, { align })}
                      >
                        {align[0]!.toUpperCase()}
                      </Button>
                    ))}
                  </div>
                </>
              )}

              {selectedElement.type === "shape" && (
                <>
                  <label className="text-xs text-[var(--bismo-text-muted)]">Shape</label>
                  <Select
                    value={selectedElement.shape}
                    onValueChange={(v) => updateElement(selectedElement.id, { shape: v })}
                    options={SHAPE_OPTIONS}
                  />
                  <label className="text-xs text-[var(--bismo-text-muted)]">Fill</label>
                  <input
                    type="color"
                    value={selectedElement.fill}
                    onChange={(e) => updateElement(selectedElement.id, { fill: e.target.value })}
                    className="h-8 w-full rounded border border-[var(--bismo-border)] bg-transparent"
                  />
                  <label className="text-xs text-[var(--bismo-text-muted)]">Stroke</label>
                  <input
                    type="color"
                    value={selectedElement.stroke ?? "#000000"}
                    onChange={(e) => updateElement(selectedElement.id, { stroke: e.target.value })}
                    className="h-8 w-full rounded border border-[var(--bismo-border)] bg-transparent"
                  />
                </>
              )}

              {selectedElement.type === "image" && (
                <>
                  <label className="text-xs text-[var(--bismo-text-muted)]">Fit</label>
                  <Select
                    value={selectedElement.fit ?? "cover"}
                    onValueChange={(v) => updateElement(selectedElement.id, { fit: v })}
                    options={FIT_OPTIONS}
                  />
                  <Button variant="secondary" size="sm" onClick={() => openImagePicker(selectedElement.id)}>
                    Replace image
                  </Button>
                </>
              )}

              {selectedElement.type === "table" && (
                <div className="flex flex-col gap-1">
                  {selectedElement.rows.map((row, r) => (
                    <div key={r} className="flex gap-1">
                      {row.map((cell, c) => (
                        <input
                          key={c}
                          value={cell}
                          onChange={(e) => {
                            const rows = selectedElement.rows.map((rr, ri) =>
                              ri === r ? rr.map((cc, ci) => (ci === c ? e.target.value : cc)) : rr,
                            );
                            updateElement(selectedElement.id, { rows });
                          }}
                          className="min-w-0 flex-1 rounded border border-[var(--bismo-border)] bg-[var(--bismo-bg)] px-1.5 py-1 text-xs text-[var(--bismo-text)]"
                        />
                      ))}
                    </div>
                  ))}
                  <div className="mt-1 flex gap-1.5">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        const cols = selectedElement.rows[0]?.length ?? 1;
                        updateElement(selectedElement.id, { rows: [...selectedElement.rows, Array(cols).fill("")] });
                      }}
                    >
                      + Row
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        updateElement(selectedElement.id, { rows: selectedElement.rows.map((r) => [...r, ""]) });
                      }}
                    >
                      + Col
                    </Button>
                  </div>
                </div>
              )}

              {selectedElement.type === "chart" && (
                <div className="flex flex-col gap-2">
                  <label className="text-xs text-[var(--bismo-text-muted)]">Chart type</label>
                  <Select
                    value={selectedElement.chartType}
                    onValueChange={(v) => updateElement(selectedElement.id, { chartType: v })}
                    options={CHART_TYPE_OPTIONS}
                  />
                  <label className="text-xs text-[var(--bismo-text-muted)]">Color</label>
                  <input
                    type="color"
                    value={selectedElement.color ?? SLIDE_THEME.accentBlue}
                    onChange={(e) => updateElement(selectedElement.id, { color: e.target.value })}
                    className="h-8 w-full rounded border border-[var(--bismo-border)] bg-transparent"
                  />
                  <label className="text-xs text-[var(--bismo-text-muted)]">Data</label>
                  <div className="flex flex-col gap-1">
                    {selectedElement.categories.map((label, i) => (
                      <div key={i} className="flex gap-1">
                        <input
                          value={label}
                          onChange={(e) => {
                            const categories = selectedElement.categories.map((c, ci) => (ci === i ? e.target.value : c));
                            updateElement(selectedElement.id, { categories });
                          }}
                          className="min-w-0 flex-1 rounded border border-[var(--bismo-border)] bg-[var(--bismo-bg)] px-1.5 py-1 text-xs text-[var(--bismo-text)]"
                        />
                        <input
                          type="number"
                          value={selectedElement.series[i] ?? 0}
                          onChange={(e) => {
                            const series = selectedElement.series.map((v, vi) => (vi === i ? Number(e.target.value) || 0 : v));
                            updateElement(selectedElement.id, { series });
                          }}
                          className="w-16 rounded border border-[var(--bismo-border)] bg-[var(--bismo-bg)] px-1.5 py-1 text-xs text-[var(--bismo-text)]"
                        />
                        <button
                          type="button"
                          title="Remove category"
                          onClick={() => {
                            const categories = selectedElement.categories.filter((_, ci) => ci !== i);
                            const series = selectedElement.series.filter((_, vi) => vi !== i);
                            updateElement(selectedElement.id, { categories, series });
                          }}
                          className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded text-[var(--bismo-text-muted)] hover:text-[var(--bismo-status-rejected)]"
                        >
                          <Trash2 size={12} strokeWidth={1.75} />
                        </button>
                      </div>
                    ))}
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() =>
                      updateElement(selectedElement.id, {
                        categories: [...selectedElement.categories, `Cat ${selectedElement.categories.length + 1}`],
                        series: [...selectedElement.series, 10],
                      })
                    }
                  >
                    + Category
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-[var(--bismo-text-muted)]">Select an element to edit its properties.</p>
          )}

          <div className="flex flex-col gap-1">
            <p className="text-xs font-semibold text-[var(--bismo-text-muted)]">Layers</p>
            {[...activeSlide.elements]
              .map((el, i) => ({ el, i }))
              .reverse()
              .map(({ el, i }) => {
                const Icon = ELEMENT_ICON[el.type];
                const active = el.id === selectedElementId;
                return (
                  <div
                    key={el.id}
                    className={cn(
                      "flex items-center gap-1.5 rounded px-1.5 py-1 text-xs",
                      active ? "bg-[var(--bismo-accent-blueprint)]/10 text-[var(--bismo-accent-blueprint)]" : "text-[var(--bismo-text-muted)]",
                    )}
                  >
                    <button type="button" onClick={() => setSelectedElementId(el.id)} className="flex flex-1 items-center gap-1.5 truncate text-left">
                      <Icon size={12} strokeWidth={1.75} className="flex-shrink-0" />
                      <span className="truncate">{elementLabel(el)}</span>
                    </button>
                    {active && (
                      <div className="flex flex-shrink-0 gap-0.5">
                        <button
                          type="button"
                          title="Bring forward"
                          disabled={i === activeSlide.elements.length - 1}
                          onClick={() => reorderSelected("forward")}
                          className="disabled:opacity-30"
                        >
                          <ChevronUp size={12} strokeWidth={1.75} />
                        </button>
                        <button type="button" title="Send backward" disabled={i === 0} onClick={() => reorderSelected("backward")} className="disabled:opacity-30">
                          <ChevronDown size={12} strokeWidth={1.75} />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            {activeSlide.elements.length === 0 && <p className="text-xs text-[var(--bismo-text-muted)]">No elements yet.</p>}
          </div>
        </div>
      </div>

      {/* Filmstrip */}
      <div className="flex flex-shrink-0 flex-wrap items-center gap-1.5">
        {slides.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => {
              setActiveSlideIndex(i);
              setSelectedElementId(null);
            }}
            className={cn(
              "flex items-center gap-1 rounded border px-2.5 py-1 text-xs font-medium",
              i === activeSlideIndex
                ? "border-[var(--bismo-accent-blueprint)] text-[var(--bismo-text)]"
                : "border-[var(--bismo-border)] text-[var(--bismo-text-muted)] hover:text-[var(--bismo-text)]",
            )}
          >
            <Presentation size={11} strokeWidth={1.75} />
            {i + 1}
            {slides.length > 1 && i === activeSlideIndex && (
              <Trash2
                size={11}
                strokeWidth={1.75}
                className="ml-1 hover:text-[var(--bismo-status-rejected)]"
                onClick={(e) => {
                  e.stopPropagation();
                  deleteSlide(i);
                }}
              />
            )}
          </button>
        ))}
        <Select value={addLayout} onValueChange={(v) => setAddLayout(v as SlideLayout)} options={LAYOUT_OPTIONS} className="h-8 w-40" />
        <button
          type="button"
          onClick={addSlide}
          aria-label="Add slide"
          className="flex h-8 items-center gap-1 rounded border border-dashed border-[var(--bismo-border)] px-2 text-[var(--bismo-text-muted)] hover:text-[var(--bismo-text)]"
        >
          <Plus size={12} strokeWidth={1.75} />
          Add
        </button>
      </div>
    </div>
  );
}
