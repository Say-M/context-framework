import { useState } from "react";
import type { ApprovalStatus } from "@bismo/shared-schemas";
import { ApprovalStatusBadge, Button, Card, CardDescription, CardHeader, CardTitle, cn, Input } from "@bismo/ui";
import { useBusinessModels } from "../queries";
import { CreateBusinessModelDialog } from "./CreateBusinessModelDialog";

const STATUS_TABS: { label: string; value: ApprovalStatus | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Pending", value: "pending" },
  { label: "Approved", value: "approved" },
  { label: "Rejected", value: "rejected" },
];

export function BusinessModelListPanel({
  selectedId,
  onSelect,
}: {
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<ApprovalStatus | "all">("all");
  const [createOpen, setCreateOpen] = useState(false);

  const { data, isLoading } = useBusinessModels({
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
        <h1 className="text-lg font-bold text-[var(--bismo-text)]">02. Business Models</h1>
        <Button size="sm" onClick={() => setCreateOpen(true)} className="bg-[var(--bismo-accent-model)]">
          + New
        </Button>
      </div>

      <Input
        placeholder="Search business models, monetization, or channels..."
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
                ? "bg-[var(--bismo-accent-model)] text-white"
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
          <p className="text-sm text-[var(--bismo-text-muted)]">No business models yet.</p>
        )}
        {data?.items.map((model) => (
          <Card
            key={model.id}
            accentColor="var(--bismo-accent-model)"
            selected={model.id === selectedId}
            onClick={() => onSelect(model.id)}
            className="cursor-pointer"
          >
            <CardHeader>
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle>{model.name}</CardTitle>
                  <span className="rounded bg-[var(--bismo-bg-hover)] px-1.5 py-0.5 text-[10px] font-mono text-[var(--bismo-text-muted)]">
                    {model.code}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-[var(--bismo-text-muted)]">{model.archetypeCategory}</p>
              </div>
              <ApprovalStatusBadge status={model.status} />
            </CardHeader>
            <CardDescription>{model.description || "No description yet."}</CardDescription>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {model.distributionChannels.slice(0, 3).map((channel) => (
                <span
                  key={channel}
                  className="rounded bg-[var(--bismo-bg-hover)] px-2 py-0.5 text-[11px] text-[var(--bismo-text-muted)]"
                >
                  {channel}
                </span>
              ))}
              {model.distributionChannels.length > 3 && (
                <span className="text-[11px] text-[var(--bismo-text-muted)]">
                  +{model.distributionChannels.length - 3} more
                </span>
              )}
            </div>
          </Card>
        ))}
      </div>

      <CreateBusinessModelDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
