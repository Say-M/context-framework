import { createRoute, Link } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { platformSignupSchema, type PlatformSignupInput } from "@bismo/shared-schemas";
import { Button, Card, CardDescription, CardTitle, FormField, Input } from "@bismo/ui";
import { useState } from "react";
import { authLayoutRoute } from "../AuthLayout";
import { usePlatformAuth } from "@/context/PlatformAuthContext";
import { ApiError } from "@/lib/api-client";

function SignupPage() {
  const { signup } = usePlatformAuth();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<PlatformSignupInput>({ resolver: zodResolver(platformSignupSchema) });

  const onSubmit = async (values: PlatformSignupInput) => {
    setServerError(null);
    try {
      await signup(values);
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : "Something went wrong");
    }
  };

  return (
    <Card className="w-full max-w-sm">
      <CardTitle className="text-lg">Create an account</CardTitle>
      <CardDescription className="mb-4">Generate software from a BISMO blueprint</CardDescription>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <FormField label="Name" htmlFor="name" error={errors.name?.message} required>
          <Input id="name" autoComplete="name" {...register("name")} />
        </FormField>
        <FormField label="Email" htmlFor="email" error={errors.email?.message} required>
          <Input id="email" type="email" autoComplete="email" {...register("email")} />
        </FormField>
        <FormField label="Password" htmlFor="password" error={errors.password?.message} required>
          <Input id="password" type="password" autoComplete="new-password" {...register("password")} />
        </FormField>
        {serverError && <p className="text-sm text-[var(--bismo-status-rejected)]">{serverError}</p>}
        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting ? "Creating account…" : "Create account"}
        </Button>
      </form>
      <p className="mt-4 text-center text-sm text-[var(--bismo-text-muted)]">
        Already have an account?{" "}
        <Link to="/login" className="text-[var(--bismo-accent-blueprint)]">
          Sign in
        </Link>
      </p>
    </Card>
  );
}

export const signupRoute = createRoute({
  path: "/signup",
  getParentRoute: () => authLayoutRoute,
  component: SignupPage,
});
