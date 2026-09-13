import { useEffect, useState } from "react";
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
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "Passwords do not match" });
type Values = z.infer<typeof schema>;

export const Route = createFileRoute("/accept-invite/$token")({
  head: () => ({
    meta: [
      { title: "Accept invite — Flameflow" },
      { name: "description", content: "Set your password to join this project's Flameflow dashboard." },
    ],
  }),
  component: AcceptInvitePage,
});

type InviteState = { status: "checking" } | { status: "valid"; email: string } | { status: "invalid" };

function AcceptInvitePage() {
  const { token } = Route.useParams();
  const navigate = useNavigate();
  const { acceptInvite } = useAuth();
  const [invite, setInvite] = useState<InviteState>({ status: "checking" });
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { password: "", confirm: "" } });

  useEffect(() => {
    let cancelled = false;
    fetch(`/__dashboard/api/invite/${token}`, { credentials: "include" })
      .then(async (res) => {
        const body = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok) {
          setInvite({ status: "invalid" });
          return;
        }
        setInvite({ status: "valid", email: body.email as string });
      })
      .catch(() => {
        if (!cancelled) setInvite({ status: "invalid" });
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (invite.status === "checking") return null;

  if (invite.status === "invalid") {
    return (
      <AuthLayout title="Invite link invalid" subtitle="This invite link is invalid or has expired.">
        <p className="text-sm text-muted-foreground">Ask the dashboard owner to send you a new invite.</p>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          <Link to="/login" className="font-medium text-primary hover:underline">Back to sign in</Link>
        </p>
      </AuthLayout>
    );
  }

  const err = form.formState.errors;
  const onSubmit = async (values: Values) => {
    const result = await acceptInvite(token, values.password);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Password set — you're signed in");
    navigate({ to: "/dashboard", search: { projectId: "ngo-ledger", section: "overview" } });
  };

  return (
    <AuthLayout title="Set your password" subtitle={`Finish setting up ${invite.email}'s dashboard access.`}>
      <form className="grid gap-4" onSubmit={form.handleSubmit(onSubmit)} noValidate>
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
          {form.formState.isSubmitting ? "Setting password..." : "Set password and sign in"}
        </Button>
      </form>
    </AuthLayout>
  );
}
