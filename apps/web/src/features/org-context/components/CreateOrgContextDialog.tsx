import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { OrgContext } from "@bismo/shared-schemas";
import { Button, Dialog, FormField, Input, Textarea } from "@bismo/ui";
import { ApiError } from "@/lib/api-client";
import { useCreateOrgContext, useUpdateOrgContext } from "../queries";

const formSchema = z.object({
  code: z.string().trim().min(2, "Required").max(30),
  structureType: z.string().trim().min(1, "Required").max(100),
  name: z.string().trim().min(1, "Required").max(200),
  description: z.string().trim().max(2000).optional(),
  legalEntities: z.string().trim().optional(),
  operatingLocations: z.string().trim().optional(),
  doaTiers: z.string().trim().optional(),
  complianceTags: z.string().trim().optional(),
});
type FormValues = z.infer<typeof formSchema>;

function splitCommaList(value: string | undefined) {
  return (value ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function CreateOrgContextDialog({
  open,
  onOpenChange,
  existing,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existing?: OrgContext;
}) {
  const isEditing = !!existing;
  const [serverError, setServerError] = useState<string | null>(null);
  const createContext = useCreateOrgContext();
  const updateContext = useUpdateOrgContext(existing?.id ?? "none");
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: existing
      ? {
          code: existing.code,
          structureType: existing.structureType,
          name: existing.name,
          description: existing.description,
          legalEntities: existing.legalEntities.join(", "),
          operatingLocations: existing.operatingLocations.join(", "),
          doaTiers: existing.doaTiers.join(", "),
          complianceTags: existing.complianceTags.join(", "),
        }
      : undefined,
  });

  const onSubmit = async (values: FormValues) => {
    setServerError(null);
    try {
      if (isEditing) {
        await updateContext.mutateAsync({
          structureType: values.structureType,
          name: values.name,
          description: values.description ?? "",
          legalEntities: splitCommaList(values.legalEntities),
          operatingLocations: splitCommaList(values.operatingLocations),
          doaTiers: splitCommaList(values.doaTiers),
          complianceTags: splitCommaList(values.complianceTags),
        });
      } else {
        await createContext.mutateAsync({
          code: values.code,
          structureType: values.structureType,
          name: values.name,
          description: values.description ?? "",
          legalEntities: splitCommaList(values.legalEntities),
          operatingLocations: splitCommaList(values.operatingLocations),
          doaTiers: splitCommaList(values.doaTiers),
          complianceTags: splitCommaList(values.complianceTags),
        });
        reset();
      }
      onOpenChange(false);
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : "Something went wrong");
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={isEditing ? `Edit ${existing.name}` : "Create Organization Context"}
      description="Define corporate structure, legal entities, approval matrices, and compliance standards."
    >
      <form onSubmit={handleSubmit(onSubmit)} className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto pr-1">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Context Code" htmlFor="org-code" error={errors.code?.message} required>
            <Input id="org-code" placeholder="ORG-CUSTOM" disabled={isEditing} {...register("code")} />
          </FormField>
          <FormField
            label="Structure Type"
            htmlFor="org-structure"
            error={errors.structureType?.message}
            required
          >
            <Input id="org-structure" placeholder="Multi-Entity Corporation" {...register("structureType")} />
          </FormField>
        </div>
        <FormField label="Organization Name" htmlFor="org-name" error={errors.name?.message} required>
          <Input id="org-name" placeholder="e.g. Meridian Global Holdings Corp" {...register("name")} />
        </FormField>
        <FormField label="Description" htmlFor="org-description" error={errors.description?.message}>
          <Textarea
            id="org-description"
            placeholder="Explain the corporate charter and subsidiary governance..."
            {...register("description")}
          />
        </FormField>
        <FormField label="Legal Entities (comma separated)" htmlFor="org-legal-entities">
          <Input
            id="org-legal-entities"
            placeholder="Meridian US LLC, Meridian UK Ltd, Meridian SG Pte Ltd"
            {...register("legalEntities")}
          />
        </FormField>
        <FormField label="Operating Locations (comma separated)" htmlFor="org-locations">
          <Input
            id="org-locations"
            placeholder="London HQ, Singapore Hub, New York Office"
            {...register("operatingLocations")}
          />
        </FormField>
        <FormField label="Approval Matrix Tiers (comma separated)" htmlFor="org-doa-tiers">
          <Input
            id="org-doa-tiers"
            placeholder="Tier 1 ($10k Mgr), Tier 2 ($100k VP), Tier 3 ($100k+ CFO)"
            {...register("doaTiers")}
          />
        </FormField>
        <FormField label="Compliance Standards (comma separated)" htmlFor="org-compliance">
          <Input
            id="org-compliance"
            placeholder="SOC 2 Type II, ISO/IEC 27001, GDPR/CCPA"
            {...register("complianceTags")}
          />
        </FormField>
        {serverError && <p className="text-sm text-[var(--bismo-status-rejected)]">{serverError}</p>}
        <div className="mt-2 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting} className="bg-[var(--bismo-accent-org)]">
            {isSubmitting ? "Saving…" : isEditing ? "Save Changes" : "Create Organization Context"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
