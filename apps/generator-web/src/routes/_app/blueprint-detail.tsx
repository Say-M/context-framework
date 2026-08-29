import { useState } from "react";
import { createRoute, useNavigate } from "@tanstack/react-router";
import { Button, Card, CardDescription, CardTitle, FormField, Input, Select, StatusBadge, Textarea } from "@bismo/ui";
import type { DatabaseChoice } from "@bismo/shared-schemas";
import { appLayoutRoute } from "../AppLayout";
import { useCatalogBlueprint } from "@/features/catalog/queries";
import { useCreateGeneratedApp } from "@/features/generated-apps/queries";
import { ApiError } from "@/lib/api-client";

const DATABASE_OPTIONS = [
  { value: "mongodb", label: "MongoDB" },
  { value: "postgres", label: "PostgreSQL" },
];

function BlueprintDetailPage() {
  const { id } = blueprintDetailRoute.useParams();
  const navigate = useNavigate();
  const { data: blueprint, isLoading } = useCatalogBlueprint(id);
  const createGeneratedApp = useCreateGeneratedApp();

  const [database, setDatabase] = useState<DatabaseChoice>("mongodb");
  const [frontendFramework, setFrontendFramework] = useState("");
  const [prompt, setPrompt] = useState("");
  const [serverError, setServerError] = useState<string | null>(null);

  if (isLoading) return <p className="text-sm text-[var(--bismo-text-muted)]">Loading…</p>;
  if (!blueprint) return <p className="text-sm text-[var(--bismo-text-muted)]">Blueprint not found.</p>;

  const onGenerate = async () => {
    setServerError(null);
    try {
      const app = await createGeneratedApp.mutateAsync({
        blueprintId: blueprint.id,
        database,
        frontendFramework: frontendFramework.trim() || undefined,
        prompt: prompt.trim() || undefined,
      });
      navigate({ to: "/my-apps/$id", params: { id: app.id } });
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : "Something went wrong");
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-bold text-[var(--bismo-text)]">{blueprint.name}</h1>
        <p className="font-mono text-xs text-[var(--bismo-text-muted)]">{blueprint.namespace}</p>
      </div>
      <p className="text-sm text-[var(--bismo-text)]">{blueprint.description || "No description provided."}</p>

      <div className="flex flex-wrap gap-1.5">
        {blueprint.domains.map((domain) => (
          <StatusBadge key={domain.id} variant="neutral">
            {domain.name}
          </StatusBadge>
        ))}
        {blueprint.businessModel && <StatusBadge variant="neutral">{blueprint.businessModel.name}</StatusBadge>}
        {blueprint.orgContext && <StatusBadge variant="neutral">{blueprint.orgContext.name}</StatusBadge>}
      </div>

      <Card className="flex flex-col gap-4">
        <div>
          <CardTitle>Generate an application</CardTitle>
          <CardDescription>Pick a database — everything else uses sensible defaults.</CardDescription>
        </div>
        <FormField label="Database" htmlFor="database">
          <Select
            id="database"
            value={database}
            onValueChange={(value) => setDatabase(value as DatabaseChoice)}
            options={DATABASE_OPTIONS}
          />
        </FormField>
        <FormField label="Frontend framework (optional)" htmlFor="framework">
          <Input
            id="framework"
            placeholder="React + Vite + TanStack Query"
            value={frontendFramework}
            onChange={(e) => setFrontendFramework(e.target.value)}
          />
        </FormField>
        <FormField
          label="Anything specific you want? (optional)"
          htmlFor="prompt"
          className="sm:col-span-2"
        >
          <Textarea
            id="prompt"
            placeholder="e.g. focus the initial scaffold on the approval workflow, or use a specific auth approach…"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />
        </FormField>
        {serverError && <p className="text-sm text-[var(--bismo-status-rejected)]">{serverError}</p>}
        <Button onClick={onGenerate} disabled={createGeneratedApp.isPending}>
          {createGeneratedApp.isPending ? "Generating…" : "Generate Application"}
        </Button>
      </Card>
    </div>
  );
}

export const blueprintDetailRoute = createRoute({
  path: "/blueprints/$id",
  getParentRoute: () => appLayoutRoute,
  component: BlueprintDetailPage,
});
