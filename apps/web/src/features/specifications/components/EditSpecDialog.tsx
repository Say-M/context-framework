import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { Specification } from "@bismo/shared-schemas";
import { updateSpecificationSchema, type UpdateSpecificationInput } from "@bismo/shared-schemas";
import { Button, Dialog, FormField, Input, Textarea } from "@bismo/ui";
import { ApiError } from "@/lib/api-client";
import { useUpdateSpecification } from "../queries";

export function EditSpecDialog({
  open,
  onOpenChange,
  spec,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  spec: Specification;
}) {
  const [serverError, setServerError] = useState<string | null>(null);
  const updateSpec = useUpdateSpecification(spec);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<UpdateSpecificationInput>({
    resolver: zodResolver(updateSpecificationSchema),
    defaultValues: { title: spec.title, summary: spec.summary, content: spec.content },
  });

  const onSubmit = async (values: UpdateSpecificationInput) => {
    setServerError(null);
    try {
      await updateSpec.mutateAsync(values);
      onOpenChange(false);
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : "Something went wrong");
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Edit ${spec.filename}`}
      description="Filename and section are fixed after creation — only the content itself can be revised."
    >
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <FormField label="Specification Title" htmlFor="edit-spec-title" error={errors.title?.message} required>
          <Input id="edit-spec-title" {...register("title")} />
        </FormField>
        <FormField label="Brief Summary" htmlFor="edit-spec-summary" error={errors.summary?.message}>
          <Input id="edit-spec-summary" {...register("summary")} />
        </FormField>
        <FormField label="Markdown Content" htmlFor="edit-spec-content" error={errors.content?.message}>
          <Textarea id="edit-spec-content" rows={10} {...register("content")} />
        </FormField>
        {serverError && <p className="text-sm text-[var(--bismo-status-rejected)]">{serverError}</p>}
        <div className="mt-2 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving…" : "Save Changes"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
