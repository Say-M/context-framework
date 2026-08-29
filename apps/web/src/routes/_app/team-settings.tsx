import { createRoute } from "@tanstack/react-router";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { inviteUserSchema, type InviteUserInput } from "@bismo/shared-schemas";
import { Button, Card, CardDescription, CardTitle, FormField, Input, Select } from "@bismo/ui";
import { appLayoutRoute } from "../AppLayout";
import { AdminGuard } from "@/components/AdminGuard";
import { apiRequest, ApiError } from "@/lib/api-client";
import { UserTable } from "@/features/team/components/UserTable";
import { teamKeys } from "@/features/team/queries";

interface InviteResult {
  email: string;
  activationLink: string;
}

function TeamSettingsPage() {
  const queryClient = useQueryClient();
  const [result, setResult] = useState<InviteResult | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<InviteUserInput>({
    resolver: zodResolver(inviteUserSchema),
    defaultValues: { role: "author" },
  });

  const onSubmit = async (values: InviteUserInput) => {
    setServerError(null);
    setResult(null);
    try {
      const invite = await apiRequest<InviteResult>("/api/v1/auth/invite", {
        method: "POST",
        body: JSON.stringify(values),
      });
      setResult(invite);
      reset({ role: "author", email: "" });
      queryClient.invalidateQueries({ queryKey: teamKeys.all });
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : "Something went wrong");
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold">Team Settings</h1>
      <p className="mt-2 text-[var(--bismo-text-muted)]">
        Invite a new authorized user. Email delivery isn't wired up yet — share the activation
        link with them directly.
      </p>

      <Card className="mt-6 max-w-md">
        <CardTitle>Invite user</CardTitle>
        <CardDescription className="mb-4">
          They'll set their own name and password when they activate.
        </CardDescription>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <FormField label="Email" htmlFor="invite-email" error={errors.email?.message} required>
            <Input id="invite-email" type="email" {...register("email")} />
          </FormField>
          <FormField label="Role" htmlFor="invite-role" error={errors.role?.message} required>
            <Controller
              control={control}
              name="role"
              render={({ field }) => (
                <Select
                  id="invite-role"
                  value={field.value}
                  onValueChange={field.onChange}
                  options={[
                    { value: "author", label: "Author" },
                    { value: "admin", label: "Admin" },
                  ]}
                />
              )}
            />
          </FormField>
          {serverError && <p className="text-sm text-[var(--bismo-status-rejected)]">{serverError}</p>}
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Sending invite…" : "Send invite"}
          </Button>
        </form>

        {result && (
          <div className="mt-4 rounded-md border border-[var(--bismo-status-approved)]/40 bg-[var(--bismo-status-approved)]/10 p-3 text-sm">
            <p className="font-medium">Invited {result.email}</p>
            <p className="mt-1 break-all text-[var(--bismo-text-muted)]">{result.activationLink}</p>
          </div>
        )}
      </Card>

      <div className="mt-8">
        <h2 className="mb-3 text-lg font-semibold text-[var(--bismo-text)]">Team members</h2>
        <UserTable />
      </div>
    </div>
  );
}

export const teamSettingsRoute = createRoute({
  path: "/team-settings",
  getParentRoute: () => appLayoutRoute,
  component: () => (
    <AdminGuard>
      <TeamSettingsPage />
    </AdminGuard>
  ),
});
