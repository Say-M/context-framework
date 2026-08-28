import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { BlueprintSection, ParentType } from "@bismo/shared-schemas";
import { Button, Dialog, FormField, Input, Textarea } from "@bismo/ui";
import { createSpecificationSchema, type CreateSpecificationInput } from "@bismo/shared-schemas";
import { ApiError } from "@/lib/api-client";
import { useCreateSpecification } from "../queries";

const formSchema = createSpecificationSchema.omit({
  parentType: true,
  parentId: true,
  section: true,
  folderPath: true,
});
type FormValues = z.infer<typeof formSchema>;

const PARENT_TYPE_COPY: Record<ParentType, { noun: string; starterContent: string; accentVar: string }> = {
  BusinessDomain: {
    noun: "operational domain",
    starterContent: "## Specification Details\n- Capability rules...",
    accentVar: "--bismo-accent-domain",
  },
  BusinessModel: {
    noun: "business model archetype",
    starterContent: "## Model Specification\n- Revenue rules...",
    accentVar: "--bismo-accent-model",
  },
  OrgContext: {
    noun: "organization context",
    starterContent: "## Governance Specification\n- Compliance policy...",
    accentVar: "--bismo-accent-org",
  },
  AppBlueprint: {
    noun: "application blueprint",
    starterContent: "## Specification Details\n- ...",
    accentVar: "--bismo-accent-blueprint",
  },
};

// Section-specific starter templates for Blueprint Studio Step 2 — falls
// back to the generic AppBlueprint template above for unlisted sections.
const BLUEPRINT_SECTION_STARTERS: Partial<Record<BlueprintSection, string>> = {
  data_model: "## Entity Schema\n- Fields...",
  screens: "## Screen Layout\n- Wireframe notes...",
  workflows: "## Workflow Steps\n- Trigger conditions...",
  business_rules: "## Business Rule\n- Rule logic...",
  ai_agents: "## AI Agent Definition\n- Autonomous behavior...",
};

export function AddSpecDialog({
  open,
  onOpenChange,
  parentType,
  parentId,
  parentName,
  section = null,
  folderPath = null,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parentType: ParentType;
  parentId: string;
  parentName: string;
  /** Required in practice for parentType === 'AppBlueprint' (one of the 12 fixed sections). */
  section?: BlueprintSection | null;
  /** Nests the new spec inside this existing BlueprintFolder path instead of the section root. */
  folderPath?: string | null;
}) {
  const copy = PARENT_TYPE_COPY[parentType];
  const starterContent = (section && BLUEPRINT_SECTION_STARTERS[section]) || copy.starterContent;
  const [serverError, setServerError] = useState<string | null>(null);
  const createSpec = useCreateSpecification();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { content: starterContent, summary: "" },
  });

  const onSubmit = async (values: FormValues) => {
    setServerError(null);
    try {
      const input: CreateSpecificationInput = { ...values, parentType, parentId, section, folderPath };
      await createSpec.mutateAsync(input);
      reset({ content: starterContent, summary: "", title: "", filename: "" });
      onOpenChange(false);
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : "Something went wrong");
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Add Specification (.md) to ${parentName}`}
      description={`Create a new markdown specification document under this ${copy.noun}.`}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <FormField label="Specification Title" htmlFor="spec-title" error={errors.title?.message} required>
          <Input id="spec-title" placeholder="e.g. Vendor Rating & Sanctions Policy" {...register("title")} />
        </FormField>
        <FormField label="Filename (.md)" htmlFor="spec-filename" error={errors.filename?.message} required>
          <Input id="spec-filename" placeholder="e.g. vendor_sanctions_policy.md" {...register("filename")} />
        </FormField>
        <FormField label="Brief Summary" htmlFor="spec-summary" error={errors.summary?.message}>
          <Input id="spec-summary" placeholder="Short summary of this spec's purpose..." {...register("summary")} />
        </FormField>
        <FormField label="Initial Markdown Content" htmlFor="spec-content" error={errors.content?.message}>
          <Textarea id="spec-content" rows={6} {...register("content")} />
        </FormField>
        {serverError && <p className="text-sm text-[var(--bismo-status-rejected)]">{serverError}</p>}
        <div className="mt-2 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting} style={{ backgroundColor: `var(${copy.accentVar})` }}>
            {isSubmitting ? "Saving…" : "Save Specification"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
