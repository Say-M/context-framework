import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { BLUEPRINT_SECTIONS, type BlueprintSection } from "@bismo/shared-schemas";
import { Button, Dialog, FormField, Input } from "@bismo/ui";
import { ApiError } from "@/lib/api-client";
import { useCreateBlueprintFolder } from "../queries";

const SECTION_LABELS: Record<BlueprintSection, string> = {
  data_model: "Data Model",
  screens: "Screens",
  forms: "Forms",
  workflows: "Workflows",
  business_rules: "Business Rules",
  permissions: "Permissions",
  states: "States",
  ai_agents: "AI Agents",
  reports: "Reports",
  integrations: "Integrations",
  notifications: "Notifications",
  audit_trail: "Audit Trail",
};

const formSchema = z.object({
  section: z.enum(BLUEPRINT_SECTIONS),
  name: z
    .string()
    .trim()
    .min(1, "Required")
    .max(100)
    .regex(/^[a-zA-Z0-9_-]+$/, "Use letters, numbers, underscores, and hyphens only"),
});
type FormValues = z.infer<typeof formSchema>;

export function CreateSubfolderDialog({
  open,
  onOpenChange,
  blueprintId,
  fixedSection,
  parentFolderPath,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  blueprintId: string;
  /** When set, the section is fixed (nesting under an existing folder) rather than picked from a dropdown. */
  fixedSection?: BlueprintSection;
  parentFolderPath: string | null;
}) {
  const [serverError, setServerError] = useState<string | null>(null);
  const createFolder = useCreateBlueprintFolder(blueprintId);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { section: fixedSection ?? BLUEPRINT_SECTIONS[0] },
  });

  const onSubmit = async (values: FormValues) => {
    setServerError(null);
    try {
      await createFolder.mutateAsync({
        section: values.section,
        parentFolderPath,
        name: values.name,
      });
      reset({ section: fixedSection ?? BLUEPRINT_SECTIONS[0], name: "" });
      onOpenChange(false);
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : "Something went wrong");
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Create Subfolder in Blueprint"
      description="Organize multiple specification files into subdirectories under a blueprint section."
    >
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        {parentFolderPath && (
          <p className="rounded-md bg-[var(--bismo-bg-hover)] px-3 py-2 text-xs text-[var(--bismo-text-muted)]">
            Nesting inside <span className="font-mono text-[var(--bismo-text)]">{parentFolderPath}/</span>
          </p>
        )}
        <FormField label="Target Blueprint Section" htmlFor="folder-section" error={errors.section?.message} required>
          <select
            id="folder-section"
            disabled={!!fixedSection}
            className="w-full rounded-md border border-[var(--bismo-border)] bg-[var(--bismo-bg)] px-3 py-2 text-sm text-[var(--bismo-text)] disabled:opacity-60"
            {...register("section")}
          >
            {BLUEPRINT_SECTIONS.map((slug) => (
              <option key={slug} value={slug}>
                {SECTION_LABELS[slug]} ({slug}/)
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Subfolder Name" htmlFor="folder-name" error={errors.name?.message} required>
          <Input id="folder-name" placeholder="e.g. approval_rules or line_items" {...register("name")} />
        </FormField>
        {serverError && <p className="text-sm text-[var(--bismo-status-rejected)]">{serverError}</p>}
        <div className="mt-2 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting} className="bg-[var(--bismo-accent-blueprint)]">
            {isSubmitting ? "Creating…" : "Create Folder"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
