import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button, Dialog, FormField, Input, Select } from "@bismo/ui";
import { ApiError } from "@/lib/api-client";
import { useCreateBlueprintFolder } from "../queries";

const formSchema = z.object({
  section: z.string().trim().min(1),
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
  sections,
  fixedSection,
  parentFolderPath,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  blueprintId: string;
  /** The blueprint's live sections (dynamic, not a fixed list) — powers the picker below when it isn't fixed. */
  sections: { slug: string; label: string }[];
  /** When set, the section is fixed (nesting under an existing folder) rather than picked from a dropdown. */
  fixedSection?: string;
  parentFolderPath: string | null;
}) {
  const [serverError, setServerError] = useState<string | null>(null);
  const createFolder = useCreateBlueprintFolder(blueprintId);
  const defaultSection = fixedSection ?? sections[0]?.slug ?? "";
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { section: defaultSection },
  });

  const onSubmit = async (values: FormValues) => {
    setServerError(null);
    try {
      await createFolder.mutateAsync({
        section: values.section,
        parentFolderPath,
        name: values.name,
      });
      reset({ section: defaultSection, name: "" });
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
          <Controller
            control={control}
            name="section"
            render={({ field }) => (
              <Select
                id="folder-section"
                disabled={!!fixedSection}
                value={field.value}
                onValueChange={field.onChange}
                options={sections.map((s) => ({ value: s.slug, label: `${s.label} (${s.slug}/)` }))}
              />
            )}
          />
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
