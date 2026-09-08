import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button, Dialog, FormField, Input } from "@bismo/ui";
import { ApiError } from "@/lib/api-client";
import { useCreateBlueprintSection } from "../queries";

const formSchema = z.object({
  name: z.string().trim().min(1, "Required").max(100),
});
type FormValues = z.infer<typeof formSchema>;

/**
 * Sections are a dynamic, per-blueprint list (see the Dynamic Blueprint
 * Sections plan) — modeled closely on CreateSubfolderDialog, but simpler:
 * just a display name, no section picker or parent-folder concept. The
 * server slugifies the name and derives the display label back from that
 * slug (see formatSectionLabel), so what's typed here is shown verbatim
 * as long as it's already simple words — no separate label is stored.
 */
export function CreateSectionDialog({
  open,
  onOpenChange,
  blueprintId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  blueprintId: string;
}) {
  const [serverError, setServerError] = useState<string | null>(null);
  const createSection = useCreateBlueprintSection(blueprintId);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(formSchema), defaultValues: { name: "" } });

  const onSubmit = async (values: FormValues) => {
    setServerError(null);
    try {
      await createSection.mutateAsync({ name: values.name });
      reset({ name: "" });
      onOpenChange(false);
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : "Something went wrong");
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Create Blueprint Section"
      description="Add a new top-level section to organize specs beyond the starting defaults."
    >
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <FormField label="Section Name" htmlFor="section-name" error={errors.name?.message} required>
          <Input id="section-name" placeholder="e.g. Approval Workflows" {...register("name")} />
        </FormField>
        {serverError && <p className="text-sm text-[var(--bismo-status-rejected)]">{serverError}</p>}
        <div className="mt-2 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting} className="bg-[var(--bismo-accent-blueprint)]">
            {isSubmitting ? "Creating…" : "Create Section"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
