import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { AppBlueprint } from "@bismo/shared-schemas";
import { Button, FormField, Input, MultiSelectPicker, Textarea } from "@bismo/ui";
import { ApiError } from "@/lib/api-client";
import { useBusinessDomains } from "@/features/business-domain/queries";
import { useBusinessModels } from "@/features/business-model/queries";
import { useOrgContexts } from "@/features/org-context/queries";
import { useCreateAppBlueprint, useUpdateConnections } from "../queries";

const metadataSchema = z.object({
  namespace: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9][a-z0-9-]*\/[a-z0-9][a-z0-9-]*$/, "Use the form 'owner/blueprint-name'"),
  name: z.string().trim().min(1, "Required").max(200),
  description: z.string().trim().max(2000).optional(),
});
type MetadataValues = z.infer<typeof metadataSchema>;

export function BlueprintStudioStep1({
  existing,
  onCreated,
  onSaved,
}: {
  existing: AppBlueprint | null;
  onCreated: (blueprint: AppBlueprint) => void;
  onSaved: () => void;
}) {
  const [domainIds, setDomainIds] = useState<string[]>(existing?.connections.domainIds ?? []);
  const [modelId, setModelId] = useState<string[]>(
    existing?.connections.modelId ? [existing.connections.modelId] : [],
  );
  const [orgContextId, setOrgContextId] = useState<string[]>(
    existing?.connections.orgContextId ? [existing.connections.orgContextId] : [],
  );
  const [serverError, setServerError] = useState<string | null>(null);

  const { data: domainsData } = useBusinessDomains({ limit: 100 });
  const { data: modelsData } = useBusinessModels({ limit: 100 });
  const { data: orgContextsData } = useOrgContexts({ limit: 100 });

  const createBlueprint = useCreateAppBlueprint();
  const updateConnections = useUpdateConnections(existing?.id ?? "none");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<MetadataValues>({
    resolver: zodResolver(metadataSchema),
    defaultValues: {
      namespace: existing?.namespace,
      name: existing?.name,
      description: existing?.description,
    },
  });

  const connectionsValid = domainIds.length > 0 && modelId.length === 1 && orgContextId.length === 1;

  const onSubmit = async (values: MetadataValues) => {
    setServerError(null);
    if (!connectionsValid) {
      setServerError("Select at least one business domain, one business model, and one org context.");
      return;
    }
    try {
      if (existing) {
        await updateConnections.mutateAsync({
          domainIds,
          modelId: modelId[0]!,
          orgContextId: orgContextId[0]!,
        });
        onSaved();
      } else {
        const created = await createBlueprint.mutateAsync({
          namespace: values.namespace,
          name: values.name,
          description: values.description ?? "",
          domainIds,
          modelId: modelId[0]!,
          orgContextId: orgContextId[0]!,
        });
        onCreated(created);
      }
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : "Something went wrong");
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--bismo-accent-blueprint)]">
          Architecture Interconnection Engine
        </h2>
        <p className="text-lg font-bold text-[var(--bismo-text)]">Internal Connection Selection Process</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <MultiSelectPicker
          title="01. Business Domains"
          mode="multiple"
          options={(domainsData?.items ?? []).map((d) => ({ id: d.id, label: d.name, sublabel: d.code }))}
          value={domainIds}
          onChange={setDomainIds}
          accentColor="var(--bismo-accent-domain)"
        />
        <MultiSelectPicker
          title="02. Business Model"
          mode="single"
          options={(modelsData?.items ?? []).map((m) => ({ id: m.id, label: m.name, sublabel: m.code }))}
          value={modelId}
          onChange={setModelId}
          accentColor="var(--bismo-accent-model)"
        />
        <MultiSelectPicker
          title="03. Org Context"
          mode="single"
          options={(orgContextsData?.items ?? []).map((o) => ({ id: o.id, label: o.name, sublabel: o.code }))}
          value={orgContextId}
          onChange={setOrgContextId}
          accentColor="var(--bismo-accent-org)"
        />
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4 rounded-lg border border-[var(--bismo-border)] p-4">
        <h3 className="text-sm font-semibold text-[var(--bismo-text)]">Application Blueprint Metadata</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField
            label="Namespace (Unique Package URI)"
            htmlFor="bp-namespace"
            error={errors.namespace?.message}
            required
          >
            <Input
              id="bp-namespace"
              placeholder="bismo/s2p-distribution-blueprint"
              disabled={!!existing}
              {...register("namespace")}
            />
          </FormField>
          <FormField label="Blueprint Name" htmlFor="bp-name" error={errors.name?.message} required>
            <Input
              id="bp-name"
              placeholder="Source-to-Pay Application Blueprint"
              disabled={!!existing}
              {...register("name")}
            />
          </FormField>
        </div>
        <FormField label="Description" htmlFor="bp-description" error={errors.description?.message}>
          <Textarea
            id="bp-description"
            placeholder="12 Technical execution specifications for..."
            disabled={!!existing}
            {...register("description")}
          />
        </FormField>
        {serverError && <p className="text-sm text-[var(--bismo-status-rejected)]">{serverError}</p>}
        <div className="flex justify-end">
          <Button type="submit" disabled={isSubmitting} className="bg-[var(--bismo-accent-blueprint)]">
            {isSubmitting ? "Saving…" : existing ? "Save Connections & Continue" : "Create Draft & Continue"}
          </Button>
        </div>
      </form>
    </div>
  );
}
