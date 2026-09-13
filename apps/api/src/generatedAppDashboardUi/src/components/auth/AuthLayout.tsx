import type { ReactNode } from "react";
import { Flame } from "lucide-react";

export function AuthLayout({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-7 flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-lg bg-brand text-brand-foreground">
            <Flame className="size-5" />
          </div>
          <div>
            <p className="font-semibold">Flameflow</p>
            <p className="text-xs text-muted-foreground">Project console</p>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm sm:p-8">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>
          <div className="mt-6">{children}</div>
        </div>
        <p className="mt-5 text-center text-xs text-muted-foreground">
          Demonstration only — accounts are simulated and no data is sent.
        </p>
      </div>
    </div>
  );
}
