import { useEffect } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";

const schema = z
  .object({
    email: z.string().trim().min(1, "Email is required").email("Enter a valid email"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "Passwords do not match" });
type Values = z.infer<typeof schema>;

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Set up dashboard — Flameflow" },
      { name: "description", content: "Set up the Flameflow dashboard owner account for this project." },
      { property: "og:title", content: "Set up dashboard — Flameflow" },
      { property: "og:description", content: "Create the owner account for this project's Flameflow dashboard." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SignupPage,
});

function SignupPage() {
  const navigate = useNavigate();
  const { loading, authenticated, needsSetup, setup } = useAuth();
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "", confirm: "" },
  });

  useEffect(() => {
    if (!loading && authenticated) {
      navigate({ to: "/dashboard", search: { projectId: "ngo-ledger", section: "overview" } });
    }
  }, [loading, authenticated, navigate]);

  if (loading) return null;

  if (!needsSetup) {
    return (
      <AuthLayout title="This dashboard already has an owner" subtitle="New dashboard users are added by invite, not open signup.">
        <p className="text-sm text-muted-foreground">
          Ask the dashboard owner to invite you from the Users section — they'll send you a link to set your password.
        </p>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account? <Link to="/login" className="font-medium text-primary hover:underline">Sign in</Link>
        </p>
      </AuthLayout>
    );
  }

  const err = form.formState.errors;
  const onSubmit = async (values: Values) => {
    const result = await setup(values.email, values.password);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Owner account created");
    navigate({ to: "/dashboard", search: { projectId: "ngo-ledger", section: "overview" } });
  };

  return (
    <AuthLayout title="Set up this dashboard" subtitle="You're the first to open it — create the owner account.">
      <form className="grid gap-4" onSubmit={form.handleSubmit(onSubmit)} noValidate>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" autoComplete="email" placeholder="you@example.com" className="mt-1.5" {...form.register("email")} />
          {err.email && <p className="mt-1.5 text-sm text-destructive">{err.email.message}</p>}
        </div>
        <div>
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" autoComplete="new-password" className="mt-1.5" {...form.register("password")} />
          {err.password && <p className="mt-1.5 text-sm text-destructive">{err.password.message}</p>}
        </div>
        <div>
          <Label htmlFor="confirm">Confirm password</Label>
          <Input id="confirm" type="password" autoComplete="new-password" className="mt-1.5" {...form.register("confirm")} />
          {err.confirm && <p className="mt-1.5 text-sm text-destructive">{err.confirm.message}</p>}
        </div>
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "Creating owner account..." : "Create owner account"}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account? <Link to="/login" className="font-medium text-primary hover:underline">Sign in</Link>
      </p>
    </AuthLayout>
  );
}
