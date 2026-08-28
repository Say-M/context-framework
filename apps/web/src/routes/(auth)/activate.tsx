import { createRoute, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { activateAccountSchema, type AuthSessionResponse } from "@bismo/shared-schemas";
import { Button, Card, CardDescription, CardTitle, FormField, Input } from "@bismo/ui";
import { useState } from "react";
import { authLayoutRoute } from "../AuthLayout";
import { useAuth } from "@/context/AuthContext";
import { apiRequest, ApiError } from "@/lib/api-client";

const searchSchema = z.object({ token: z.string() });
const formSchema = activateAccountSchema.omit({ token: true });
type FormValues = z.infer<typeof formSchema>;

function ActivatePage() {
  const { token } = activateRoute.useSearch();
  const { setSession } = useAuth();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(formSchema) });

  const onSubmit = async (values: FormValues) => {
    setServerError(null);
    try {
      const session = await apiRequest<AuthSessionResponse>("/api/v1/auth/activate", {
        method: "POST",
        body: JSON.stringify({ ...values, token }),
      });
      setSession(session);
      await navigate({ to: "/dashboard" });
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : "Something went wrong");
    }
  };

  return (
    <Card className="w-full max-w-sm">
      <CardTitle className="text-lg">Activate your account</CardTitle>
      <CardDescription className="mb-4">Set your name and password to get started.</CardDescription>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <FormField label="Full name" htmlFor="name" error={errors.name?.message} required>
          <Input id="name" autoComplete="name" {...register("name")} />
        </FormField>
        <FormField label="Password" htmlFor="password" error={errors.password?.message} required>
          <Input id="password" type="password" autoComplete="new-password" {...register("password")} />
        </FormField>
        {serverError && <p className="text-sm text-[var(--bismo-status-rejected)]">{serverError}</p>}
        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting ? "Activating…" : "Activate account"}
        </Button>
      </form>
    </Card>
  );
}

export const activateRoute = createRoute({
  path: "/activate",
  getParentRoute: () => authLayoutRoute,
  validateSearch: searchSchema,
  component: ActivatePage,
});
