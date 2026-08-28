import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { format } from "date-fns";
import { Button } from "./Button";
import { StatusBadge } from "./StatusBadge";
import { cn } from "../lib/cn";

export interface SpecViewerFrontmatter {
  type: string;
  trustTier: string;
  status: string;
  staleAfter: string; // ISO datetime
}

export interface SpecViewerProps {
  content: string;
  rawSource: string;
  frontmatter: SpecViewerFrontmatter;
  className?: string;
}

/** Renders a spec's frontmatter badges + markdown body, with Copy MD / Raw Source toggle. */
export function SpecViewer({ content, rawSource, frontmatter, className }: SpecViewerProps) {
  const [showRaw, setShowRaw] = useState(false);
  const [copied, setCopied] = useState(false);

  const copyMd = async () => {
    await navigator.clipboard.writeText(rawSource);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold text-[var(--bismo-text)]">Concept Specification Document</div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => void copyMd()}>
            {copied ? "Copied" : "Copy MD"}
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setShowRaw((v) => !v)}>
            {showRaw ? "Preview" : "Raw Source"}
          </Button>
        </div>
      </div>

      {showRaw ? (
        <pre className="overflow-x-auto rounded-md border border-[var(--bismo-border)] bg-[var(--bismo-bg)] p-4 font-mono text-xs text-[var(--bismo-text)]">
          {rawSource}
        </pre>
      ) : (
        <div>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <StatusBadge variant="approved">{frontmatter.trustTier}</StatusBadge>
            <StatusBadge variant="neutral">{frontmatter.status}</StatusBadge>
            <span className="text-xs text-[var(--bismo-text-muted)]">
              Stale after {format(new Date(frontmatter.staleAfter), "MMM d, yyyy")}
            </span>
          </div>
          <div className="prose prose-invert prose-sm max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  );
}
