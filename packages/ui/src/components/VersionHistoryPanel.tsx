import { useState } from "react";
import { StatusBadge } from "./StatusBadge";
import { cn } from "../lib/cn";

export interface VersionHistoryEntry {
  id: string;
  version: number | string;
  approvedAt: string | null;
  supersededAt: string;
  snapshot: Record<string, unknown>;
}

// Bookkeeping fields every snapshot carries that aren't useful to diff/show —
// only the module's own content fields matter here.
const HIDDEN_SNAPSHOT_KEYS = new Set([
  "id",
  "createdBy",
  "reviewedBy",
  "reviewNote",
  "reviewedAt",
  "submittedAt",
  "createdAt",
  "updatedAt",
  "status",
  "version",
]);

export interface VersionHistoryPanelProps {
  versions: VersionHistoryEntry[];
  isLoading?: boolean;
  className?: string;
}

export function VersionHistoryPanel({ versions, isLoading, className }: VersionHistoryPanelProps) {
  if (isLoading) {
    return <p className="text-sm text-[var(--bismo-text-muted)]">Loading version history…</p>;
  }
  if (versions.length === 0) {
    return (
      <p className="text-sm text-[var(--bismo-text-muted)]">
        No previous versions — this item hasn't been approved and edited yet.
      </p>
    );
  }

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {versions.map((entry) => (
        <VersionRow key={entry.id} entry={entry} />
      ))}
    </div>
  );
}

function VersionRow({ entry }: { entry: VersionHistoryEntry }) {
  const [expanded, setExpanded] = useState(false);
  const fields = Object.entries(entry.snapshot).filter(([key]) => !HIDDEN_SNAPSHOT_KEYS.has(key));

  return (
    <div className="rounded-md border border-[var(--bismo-border)] p-3">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between text-left text-sm"
      >
        <span className="flex items-center gap-2 font-medium text-[var(--bismo-text)]">
          <StatusBadge variant="neutral">v{entry.version}</StatusBadge>
          Superseded {new Date(entry.supersededAt).toLocaleString()}
        </span>
        <span className="text-xs text-[var(--bismo-text-muted)]">{expanded ? "Hide" : "View"}</span>
      </button>
      {expanded && (
        <dl className="mt-3 grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 text-xs">
          {fields.map(([key, value]) => (
            <div key={key} className="contents">
              <dt className="text-[var(--bismo-text-muted)]">{key}</dt>
              <dd className="text-[var(--bismo-text)] break-words">
                {Array.isArray(value) ? value.join(", ") || "—" : String(value ?? "—")}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}
