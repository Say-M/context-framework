import { createRoute, Link } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { platformLoginSchema, type PlatformLoginInput } from "@bismo/shared-schemas";
import { Button, Card, CardDescription, CardTitle, FormField, Input } from "@bismo/ui";
import { useState } from "react";
import { authLayoutRoute } from "../AuthLayout";
import { usePlatformAuth } from "@/context/PlatformAuthContext";
import { ApiError } from "@/lib/api-client";

function LoginPage() {
  const { login } = usePlatformAuth();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<PlatformLoginInput>({ resolver: zodResolver(platformLoginSchema) });

  const onSubmit = async (values: PlatformLoginInput) => {
    setServerError(null);
    try {
      await login(values);
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : "Something went wrong");
    }
  };

  return (
    <Card className="w-full max-w-sm">
      <CardTitle className="text-lg">Sign in</CardTitle>
      <CardDescription className="mb-4">
        Same account as BISMO Generator — chat, and let it build docs, sheets, slides, and more.
      </CardDescription>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <FormField label="Email" htmlFor="email" error={errors.email?.message} required>
          <Input id="email" type="email" autoComplete="email" {...register("email")} />
        </FormField>
        <FormField label="Password" htmlFor="password" error={errors.password?.message} required>
          <Input id="password" type="password" autoComplete="current-password" {...register("password")} />
        </FormField>
        {serverError && <p className="text-sm text-[var(--bismo-status-rejected)]">{serverError}</p>}
        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting ? "Signing in…" : "Sign in"}
        </Button>
      </form>
      <p className="mt-4 text-center text-sm text-[var(--bismo-text-muted)]">
        No account?{" "}
        <Link to="/signup" className="text-[var(--bismo-accent-blueprint)]">
          Sign up
        </Link>
      </p>
    </Card>
  );
}

export const loginRoute = createRoute({
  path: "/login",
  getParentRoute: () => authLayoutRoute,
  component: LoginPage,
});
