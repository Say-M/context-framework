import { useState, type ReactNode } from "react";
import yaml from "js-yaml";
import type { AppBlueprint } from "@bismo/shared-schemas";
import { Button, StatusBadge } from "@bismo/ui";
import { useBusinessDomains } from "@/features/business-domain/queries";
import { useBusinessModels } from "@/features/business-model/queries";
import { useOrgContexts } from "@/features/org-context/queries";
import { ApiError } from "@/lib/api-client";
import { useManifestPreview, usePublishAppBlueprint, useSectionTree } from "../queries";
import { AppBlueprintStatusBadge } from "./AppBlueprintStatusBadge";

function manifestToYamlText(manifest: unknown): string {
  const header =
    "# Open Knowledge Format (OKF) v0.2 Manifest\n" +
    "# Application Blueprint with Module Inheritance Bindings\n";
  return header + yaml.dump(manifest, { indent: 2 });
}

export function BlueprintStudioStep3({ blueprint }: { blueprint: AppBlueprint }) {
  const [serverError, setServerError] = useState<string | null>(null);
  const { data: domainsData } = useBusinessDomains({ limit: 100 });
  const { data: modelsData } = useBusinessModels({ limit: 100 });
  const { data: orgContextsData } = useOrgContexts({ limit: 100 });
  const { data: tree } = useSectionTree(blueprint.id);
  const { data: manifestPreview } = useManifestPreview(blueprint.id);
  const publish = usePublishAppBlueprint(blueprint.id);

  const connectedDomains = (domainsData?.items ?? []).filter((d) =>
    blueprint.connections.domainIds.includes(d.id),
  );
  const connectedModel = (modelsData?.items ?? []).find((m) => m.id === blueprint.connections.modelId);
  const connectedOrgContext = (orgContextsData?.items ?? []).find(
    (o) => o.id === blueprint.connections.orgContextId,
  );

  const specs = [
    ...(tree?.root
      ? [{ ...tree.root, sectionLabel: "Root" }]
      : []),
    ...(tree?.sections.flatMap((s) => s.specs.map((spec) => ({ ...spec, sectionLabel: s.slug }))) ?? []),
  ];

  const canPublish = blueprint.status === "draft" || blueprint.status === "rejected";

  const onPublish = async () => {
    setServerError(null);
    try {
      await publish.mutateAsync();
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : "Something went wrong");
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <span className="rounded bg-[var(--bismo-bg-hover)] px-2 py-0.5 font-mono text-xs text-[var(--bismo-text-muted)]">
            {blueprint.namespace} · {blueprint.version}
          </span>
          <h2 className="mt-1 text-xl font-bold text-[var(--bismo-text)]">{blueprint.name}</h2>
          <p className="mt-1 text-sm text-[var(--bismo-text-muted)]">{blueprint.description}</p>
        </div>
        <AppBlueprintStatusBadge status={blueprint.status} />
      </div>

      {blueprint.status === "rejected" && blueprint.reviewNote && (
        <div className="rounded-md border border-[var(--bismo-status-rejected)]/40 bg-[var(--bismo-status-rejected)]/10 p-3 text-sm">
          <p className="font-medium text-[var(--bismo-status-rejected)]">Rejected: {blueprint.reviewNote}</p>
          <p className="mt-1 text-[var(--bismo-text-muted)]">
            Revise the connections or sections above, then publish again to resubmit.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <SummaryCard title="Connected Domains" accent="var(--bismo-accent-domain)">
          {connectedDomains.map((d) => (
            <p key={d.id}>
              {d.code} — {d.name}
            </p>
          ))}
        </SummaryCard>
        <SummaryCard title="Connected Model" accent="var(--bismo-accent-model)">
          {connectedModel && (
            <p>
              {connectedModel.code} — {connectedModel.name}
            </p>
          )}
        </SummaryCard>
        <SummaryCard title="Connected Org Context" accent="var(--bismo-accent-org)">
          {connectedOrgContext && (
            <p>
              {connectedOrgContext.code} — {connectedOrgContext.name}
            </p>
          )}
        </SummaryCard>
      </div>

      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--bismo-text-muted)]">
          Application Blueprint Specifications ({specs.length} files)
        </h3>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {specs.map((spec) => (
            <div
              key={spec.id}
              className="flex items-center justify-between gap-2 rounded-md border border-[var(--bismo-border)] px-3 py-2 text-sm"
            >
              <span className="min-w-0 truncate font-mono text-xs text-[var(--bismo-text)]">{spec.path}</span>
              <StatusBadge variant="neutral">{spec.frontmatterType}</StatusBadge>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--bismo-text-muted)]">
          Generated OKF v0.2 Manifest (okf.yaml)
        </h3>
        <pre className="max-h-80 overflow-auto rounded-lg border border-[var(--bismo-border)] bg-[var(--bismo-bg)] p-4 font-mono text-xs text-[var(--bismo-text)]">
          {manifestPreview ? manifestToYamlText(manifestPreview) : "Loading…"}
        </pre>
      </div>

      {serverError && <p className="text-sm text-[var(--bismo-status-rejected)]">{serverError}</p>}

      <div className="flex justify-end">
        {canPublish ? (
          <Button
            size="lg"
            disabled={publish.isPending}
            onClick={onPublish}
            className="bg-[var(--bismo-accent-blueprint)]"
          >
            {publish.isPending ? "Publishing…" : "Publish Application Blueprint"}
          </Button>
        ) : (
          <p className="text-sm text-[var(--bismo-text-muted)]">
            {blueprint.status === "pending"
              ? "Awaiting admin review."
              : "This blueprint has been approved."}
          </p>
        )}
      </div>
    </div>
  );
}

function SummaryCard({
  title,
  accent,
  children,
}: {
  title: string;
  accent: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-[var(--bismo-border)] p-4">
      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide" style={{ color: accent }}>
        {title}
      </h4>
      <div className="space-y-1 text-sm text-[var(--bismo-text)]">{children}</div>
    </div>
  );
}
