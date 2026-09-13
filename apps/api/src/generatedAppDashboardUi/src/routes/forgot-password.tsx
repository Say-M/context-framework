import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const schema = z.object({
  email: z.string().trim().min(1, "Email is required").email("Enter a valid email"),
});
type Values = z.infer<typeof schema>;

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Reset password — Flameflow" },
      { name: "description", content: "Request a password reset link for your Flameflow console account." },
      { property: "og:title", content: "Reset password — Flameflow" },
      { property: "og:description", content: "Recover access to your Flameflow account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const [sent, setSent] = useState<string | null>(null);
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { email: "" } });
  const onSubmit = async (values: Values) => {
    await new Promise((r) => setTimeout(r, 600));
    setSent(values.email);
    toast.success("Reset instructions sent (simulated)");
  };
  return (
    <AuthLayout title="Reset password" subtitle="We'll send reset instructions to your email address.">
      {sent ? (
        <div className="grid gap-4">
          <p className="rounded-md bg-muted p-4 text-sm">
            If an account exists for <span className="font-medium">{sent}</span>, reset instructions are on their way. No email is actually sent in this demonstration.
          </p>
          <Button variant="outline" onClick={() => setSent(null)}>Use a different email</Button>
        </div>
      ) : (
        <form className="grid gap-4" onSubmit={form.handleSubmit(onSubmit)} noValidate>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" autoComplete="email" placeholder="you@example.com" className="mt-1.5" {...form.register("email")} />
            {form.formState.errors.email && <p className="mt-1.5 text-sm text-destructive">{form.formState.errors.email.message}</p>}
          </div>
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Sending..." : "Send reset link"}
          </Button>
        </form>
      )}
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Remembered it? <Link to="/login" className="font-medium text-primary hover:underline">Back to sign in</Link>
      </p>
    </AuthLayout>
  );
}
