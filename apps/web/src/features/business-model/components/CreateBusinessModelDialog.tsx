import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { BusinessModel } from "@bismo/shared-schemas";
import { Button, Dialog, FormField, Input, Textarea } from "@bismo/ui";
import { ApiError } from "@/lib/api-client";
import { useCreateBusinessModel, useUpdateBusinessModel } from "../queries";

const formSchema = z.object({
  code: z.string().trim().min(2, "Required").max(30),
  archetypeCategory: z.string().trim().min(1, "Required").max(100),
  name: z.string().trim().min(1, "Required").max(200),
  description: z.string().trim().max(2000).optional(),
  monetizationMechanics: z.string().trim().max(500).optional(),
  distributionChannels: z.string().trim().optional(),
});
type FormValues = z.infer<typeof formSchema>;

function splitCommaList(value: string | undefined) {
  return (value ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function CreateBusinessModelDialog({
  open,
  onOpenChange,
  existing,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existing?: BusinessModel;
}) {
  const isEditing = !!existing;
  const [serverError, setServerError] = useState<string | null>(null);
  const createModel = useCreateBusinessModel();
  const updateModel = useUpdateBusinessModel(existing?.id ?? "none");
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
          archetypeCategory: existing.archetypeCategory,
          name: existing.name,
          description: existing.description,
          monetizationMechanics: existing.monetizationMechanics,
          distributionChannels: existing.distributionChannels.join(", "),
        }
      : undefined,
  });

  const onSubmit = async (values: FormValues) => {
    setServerError(null);
    try {
      if (isEditing) {
        await updateModel.mutateAsync({
          archetypeCategory: values.archetypeCategory,
          name: values.name,
          description: values.description ?? "",
          monetizationMechanics: values.monetizationMechanics ?? "",
          distributionChannels: splitCommaList(values.distributionChannels),
        });
      } else {
        await createModel.mutateAsync({
          code: values.code,
          archetypeCategory: values.archetypeCategory,
          name: values.name,
          description: values.description ?? "",
          monetizationMechanics: values.monetizationMechanics ?? "",
          distributionChannels: splitCommaList(values.distributionChannels),
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
      title={isEditing ? `Edit ${existing.name}` : "Create New Business Model Archetype"}
      description="Author an operating archetype with revenue mechanics, unit economics, and channels."
    >
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Model Code" htmlFor="model-code" error={errors.code?.message} required>
            <Input id="model-code" placeholder="MOD-CUSTOM" disabled={isEditing} {...register("code")} />
          </FormField>
          <FormField
            label="Archetype Category"
            htmlFor="model-archetype"
            error={errors.archetypeCategory?.message}
            required
          >
            <Input
              id="model-archetype"
              placeholder="B2B Marketplace & Ecosystem"
              {...register("archetypeCategory")}
            />
          </FormField>
        </div>
        <FormField label="Model Name" htmlFor="model-name" error={errors.name?.message} required>
          <Input id="model-name" placeholder="e.g. Equipment Rental & Escrow Marketplace" {...register("name")} />
        </FormField>
        <FormField label="Description" htmlFor="model-description" error={errors.description?.message}>
          <Textarea
            id="model-description"
            placeholder="Explain the operating dynamics and supply-demand relationships..."
            {...register("description")}
          />
        </FormField>
        <FormField label="Monetization Mechanics" htmlFor="model-monetization">
          <Input
            id="model-monetization"
            placeholder="e.g. 10% platform take-rate + inspection escrow fee"
            {...register("monetizationMechanics")}
          />
        </FormField>
        <FormField label="Distribution Channels (comma separated)" htmlFor="model-channels">
          <Input
            id="model-channels"
            placeholder="Web Portal, Mobile App, API Partner Network"
            {...register("distributionChannels")}
          />
        </FormField>
        {serverError && <p className="text-sm text-[var(--bismo-status-rejected)]">{serverError}</p>}
        <div className="mt-2 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting} className="bg-[var(--bismo-accent-model)]">
            {isSubmitting ? "Saving…" : isEditing ? "Save Changes" : "Create Business Model"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
