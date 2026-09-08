import { BookOpen, FileText, Image as ImageIcon, Presentation, Table2 } from "lucide-react";
import type { StudioArtifactKind } from "@bismo/shared-schemas";

// Shared between ArtifactCard (chat) and ArtifactPage (the full-page
// editor) so both label/icon an artifact identically.
export const ICON_BY_KIND: Record<StudioArtifactKind, typeof FileText> = {
  doc: FileText,
  spreadsheet: Table2,
  slides: Presentation,
  image: ImageIcon,
  research: BookOpen,
};

export const KIND_LABEL: Record<StudioArtifactKind, string> = {
  doc: "Document",
  spreadsheet: "Spreadsheet",
  slides: "Slides",
  image: "Image",
  research: "Research report",
};
