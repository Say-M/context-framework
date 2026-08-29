import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { BusinessDomain } from "@bismo/shared-schemas";
import { Button, Dialog, FormField, Input, Textarea } from "@bismo/ui";
import { ApiError } from "@/lib/api-client";
import { useCreateBusinessDomain, useUpdateBusinessDomain } from "../queries";

const formSchema = z.object({
  code: z.string().trim().min(2, "Required").max(30),
  category: z.string().trim().min(1, "Required").max(100),
  name: z.string().trim().min(1, "Required").max(200),
  description: z.string().trim().max(2000).optional(),
  capabilities: z.string().trim().optional(),
  keyEntities: z.string().trim().optional(),
});
type FormValues = z.infer<typeof formSchema>;

function splitCommaList(value: string | undefined) {
  return (value ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function CreateBusinessDomainDialog({
  open,
  onOpenChange,
  existing,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Pass an existing domain to edit it in place instead of creating a new one. */
  existing?: BusinessDomain;
}) {
  const isEditing = !!existing;
  const [serverError, setServerError] = useState<string | null>(null);
  const createDomain = useCreateBusinessDomain();
  const updateDomain = useUpdateBusinessDomain(existing?.id ?? "none");
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
          category: existing.category,
          name: existing.name,
          description: existing.description,
          capabilities: existing.capabilities.join(", "),
          keyEntities: existing.keyEntities.join(", "),
        }
      : undefined,
  });

  const onSubmit = async (values: FormValues) => {
    setServerError(null);
    try {
      if (isEditing) {
        await updateDomain.mutateAsync({
          category: values.category,
          name: values.name,
          description: values.description ?? "",
          capabilities: splitCommaList(values.capabilities),
          keyEntities: splitCommaList(values.keyEntities),
        });
      } else {
        await createDomain.mutateAsync({
          code: values.code,
          category: values.category,
          name: values.name,
          description: values.description ?? "",
          capabilities: splitCommaList(values.capabilities),
          keyEntities: splitCommaList(values.keyEntities),
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
      title={isEditing ? `Edit ${existing.name}` : "Create New Business Domain"}
      description="Author an operational business domain module with custom capabilities and entities."
    >
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Domain Code" htmlFor="code" error={errors.code?.message} required>
            <Input id="code" placeholder="DOM-CUSTOM" disabled={isEditing} {...register("code")} />
          </FormField>
          <FormField label="Category" htmlFor="category" error={errors.category?.message} required>
            <Input id="category" placeholder="Operations" {...register("category")} />
          </FormField>
        </div>
        <FormField label="Domain Name" htmlFor="name" error={errors.name?.message} required>
          <Input id="name" placeholder="e.g. Billing & Revenue Management" {...register("name")} />
        </FormField>
        <FormField label="Description" htmlFor="description" error={errors.description?.message}>
          <Textarea
            id="description"
            placeholder="Explain the scope and operational remit of this business domain..."
            {...register("description")}
          />
        </FormField>
        <FormField label="Capabilities (comma separated)" htmlFor="capabilities">
          <Input
            id="capabilities"
            placeholder="e.g. Subscription Rating, Metered Usage, Dispute Settlement"
            {...register("capabilities")}
          />
        </FormField>
        <FormField label="Key Domain Entities (comma separated)" htmlFor="keyEntities">
          <Input
            id="keyEntities"
            placeholder="e.g. Subscription, UsageRecord, InvoiceLineItem"
            {...register("keyEntities")}
          />
        </FormField>
        {serverError && <p className="text-sm text-[var(--bismo-status-rejected)]">{serverError}</p>}
        <div className="mt-2 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving…" : isEditing ? "Save Changes" : "Create Business Domain"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
