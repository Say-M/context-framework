import { useState } from "react";
import type { ApprovalStatus } from "@bismo/shared-schemas";
import { ApprovalStatusBadge, Button, Card, CardDescription, CardHeader, CardTitle, cn, Input } from "@bismo/ui";
import { useBusinessDomains } from "../queries";
import { CreateBusinessDomainDialog } from "./CreateBusinessDomainDialog";

const STATUS_TABS: { label: string; value: ApprovalStatus | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Pending", value: "pending" },
  { label: "Approved", value: "approved" },
  { label: "Rejected", value: "rejected" },
];

export function BusinessDomainListPanel({
  selectedId,
  onSelect,
}: {
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<ApprovalStatus | "all">("all");
  const [createOpen, setCreateOpen] = useState(false);

  const { data, isLoading } = useBusinessDomains({
    search: search || undefined,
    status: status === "all" ? undefined : status,
  });

  return (
    <div
      className={cn(
        "flex w-full flex-shrink-0 flex-col gap-4 border-r border-[var(--bismo-border)] p-4 lg:w-[420px]",
        selectedId && "hidden lg:flex",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-lg font-bold text-[var(--bismo-text)]">01. Business Domains</h1>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          + New
        </Button>
      </div>

      <Input
        placeholder="Search domain capabilities, entities..."
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
                ? "bg-[var(--bismo-accent-domain)] text-white"
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
          <p className="text-sm text-[var(--bismo-text-muted)]">No business domains yet.</p>
        )}
        {data?.items.map((domain) => (
          <Card
            key={domain.id}
            accentColor="var(--bismo-accent-domain)"
            selected={domain.id === selectedId}
            onClick={() => onSelect(domain.id)}
            className="cursor-pointer"
          >
            <CardHeader>
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle>{domain.name}</CardTitle>
                  <span className="rounded bg-[var(--bismo-bg-hover)] px-1.5 py-0.5 text-[10px] font-mono text-[var(--bismo-text-muted)]">
                    {domain.code}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-[var(--bismo-text-muted)]">{domain.category}</p>
              </div>
              <ApprovalStatusBadge status={domain.status} />
            </CardHeader>
            <CardDescription>{domain.description || "No description yet."}</CardDescription>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {domain.keyEntities.slice(0, 3).map((entity) => (
                <span
                  key={entity}
                  className="rounded bg-[var(--bismo-bg-hover)] px-2 py-0.5 text-[11px] text-[var(--bismo-text-muted)]"
                >
                  {entity}
                </span>
              ))}
              {domain.keyEntities.length > 3 && (
                <span className="text-[11px] text-[var(--bismo-text-muted)]">
                  +{domain.keyEntities.length - 3} more
                </span>
              )}
            </div>
          </Card>
        ))}
      </div>

      <CreateBusinessDomainDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
