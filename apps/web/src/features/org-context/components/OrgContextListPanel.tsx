import { useState } from "react";
import type { ApprovalStatus } from "@bismo/shared-schemas";
import { ApprovalStatusBadge, Button, Card, CardDescription, CardHeader, CardTitle, Input } from "@bismo/ui";
import { useOrgContexts } from "../queries";
import { CreateOrgContextDialog } from "./CreateOrgContextDialog";

const STATUS_TABS: { label: string; value: ApprovalStatus | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Pending", value: "pending" },
  { label: "Approved", value: "approved" },
  { label: "Rejected", value: "rejected" },
];

export function OrgContextListPanel({
  selectedId,
  onSelect,
}: {
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<ApprovalStatus | "all">("all");
  const [createOpen, setCreateOpen] = useState(false);

  const { data, isLoading } = useOrgContexts({
    search: search || undefined,
    status: status === "all" ? undefined : status,
  });

  return (
    <div className="flex w-[420px] flex-shrink-0 flex-col gap-4 border-r border-[var(--bismo-border)] p-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-lg font-bold text-[var(--bismo-text)]">03. Organization Context</h1>
        <Button size="sm" onClick={() => setCreateOpen(true)} className="bg-[var(--bismo-accent-org)]">
          + New
        </Button>
      </div>

      <Input
        placeholder="Search organization contexts, legal entities, or policies..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div className="flex gap-1 rounded-md border border-[var(--bismo-border)] p-1">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setStatus(tab.value)}
            className={`flex-1 rounded px-2 py-1 text-xs font-medium transition-colors ${
              status === tab.value
                ? "bg-[var(--bismo-accent-org)] text-white"
                : "text-[var(--bismo-text-muted)] hover:bg-[var(--bismo-bg-hover)]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3 overflow-y-auto">
        {isLoading && <p className="text-sm text-[var(--bismo-text-muted)]">Loading…</p>}
        {!isLoading && data?.items.length === 0 && (
          <p className="text-sm text-[var(--bismo-text-muted)]">No organization contexts yet.</p>
        )}
        {data?.items.map((ctx) => (
          <Card
            key={ctx.id}
            accentColor="var(--bismo-accent-org)"
            selected={ctx.id === selectedId}
            onClick={() => onSelect(ctx.id)}
            className="cursor-pointer"
          >
            <CardHeader>
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle>{ctx.name}</CardTitle>
                  <span className="rounded bg-[var(--bismo-bg-hover)] px-1.5 py-0.5 text-[10px] font-mono text-[var(--bismo-text-muted)]">
                    {ctx.code}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-[var(--bismo-text-muted)]">{ctx.structureType}</p>
              </div>
              <ApprovalStatusBadge status={ctx.status} />
            </CardHeader>
            <CardDescription>{ctx.description || "No description yet."}</CardDescription>
            <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-[var(--bismo-text-muted)]">
              <span>{ctx.legalEntities.length} Entities</span>
              <span>{ctx.operatingLocations.length} Locations</span>
              <span>{ctx.doaTiers.length} DoA Tiers</span>
            </div>
          </Card>
        ))}
      </div>

      <CreateOrgContextDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
