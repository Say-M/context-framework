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

const schema = z.object({
  email: z.string().trim().min(1, "Email is required").email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});
type Values = z.infer<typeof schema>;

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — Flameflow" },
      { name: "description", content: "Sign in to the Flameflow console to manage your NGO Ledger project." },
      { property: "og:title", content: "Sign in — Flameflow" },
      { property: "og:description", content: "Access your Flameflow project console." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { email: "", password: "" } });
  const onSubmit = async (values: Values) => {
    const result = await login(values.email, values.password);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(`Signed in as ${values.email}`);
    navigate({ to: "/dashboard", search: { projectId: "ngo-ledger", section: "overview" } });
  };
  return (
    <AuthLayout title="Sign in" subtitle="Welcome back. Continue to your Flameflow console.">
      <form className="grid gap-4" onSubmit={form.handleSubmit(onSubmit)} noValidate>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" autoComplete="email" placeholder="you@example.com" className="mt-1.5" {...form.register("email")} />
          {form.formState.errors.email && <p className="mt-1.5 text-sm text-destructive">{form.formState.errors.email.message}</p>}
        </div>
        <div>
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link to="/forgot-password" className="text-sm text-primary hover:underline">Forgot password?</Link>
          </div>
          <Input id="password" type="password" autoComplete="current-password" className="mt-1.5" {...form.register("password")} />
          {form.formState.errors.password && <p className="mt-1.5 text-sm text-destructive">{form.formState.errors.password.message}</p>}
        </div>
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "Signing in..." : "Sign in"}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        No account yet? <Link to="/signup" className="font-medium text-primary hover:underline">Create one</Link>
      </p>
    </AuthLayout>
  );
}
