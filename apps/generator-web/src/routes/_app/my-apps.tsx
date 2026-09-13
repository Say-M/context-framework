import { useState } from "react";
import { createRoute, Link } from "@tanstack/react-router";
import { Trash2 } from "lucide-react";
import { Card, CardDescription, CardFooter, CardTitle, ConfirmDialog, StatusBadge } from "@bismo/ui";
import { appLayoutRoute } from "../AppLayout";
import { useDeleteGeneratedApp, useMyGeneratedApps } from "@/features/generated-apps/queries";

function MyAppsPage() {
  const { data, isLoading } = useMyGeneratedApps();
  const deleteGeneratedApp = useDeleteGeneratedApp();
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-bold text-[var(--bismo-text)]">My Apps</h1>
        <p className="text-sm text-[var(--bismo-text-muted)]">
          Applications you've generated from the catalog — generate as many as you like from the same
          blueprint.
        </p>
      </div>
      {isLoading && <p className="text-sm text-[var(--bismo-text-muted)]">Loading…</p>}
      {!isLoading && data?.items.length === 0 && (
        <p className="text-sm text-[var(--bismo-text-muted)]">
          Nothing yet — generate your first app from the{" "}
          <Link to="/" className="text-[var(--bismo-accent-blueprint)]">
            catalog
          </Link>
          .
        </p>
      )}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data?.items.map((app) => (
          <Card key={app.id}>
            <CardTitle>{app.blueprintName}</CardTitle>
            <CardDescription>
              {app.database === "mongodb" ? "MongoDB" : "PostgreSQL"} ·{" "}
              {app.outputTargets.map((t) => (t === "api" ? "API" : "Agent")).join(" + ")}
            </CardDescription>
            <div className="mt-2">
              <StatusBadge variant="neutral">{app.status}</StatusBadge>
            </div>
            <CardFooter className="justify-between">
              <Link
                to="/my-apps/$id"
                params={{ id: app.id }}
                className="text-sm font-medium text-[var(--bismo-accent-blueprint)]"
              >
                View versions →
              </Link>
              <button
                type="button"
                title="Delete"
                aria-label="Delete"
                disabled={app.status === "working"}
                onClick={() => setDeleteTarget({ id: app.id, name: app.blueprintName })}
                className="flex h-7 w-7 items-center justify-center rounded text-[var(--bismo-text-muted)] transition-colors hover:bg-[var(--bismo-bg-hover)] hover:text-[var(--bismo-status-rejected)] disabled:pointer-events-none disabled:opacity-40"
              >
                <Trash2 size={14} strokeWidth={1.75} />
              </button>
            </CardFooter>
          </Card>
        ))}
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete this app?"
        description={`This permanently deletes "${deleteTarget?.name}" and every version of it. This can't be undone.`}
        confirmLabel="Delete"
        isPending={deleteGeneratedApp.isPending}
        onConfirm={() => {
          if (!deleteTarget) return;
          deleteGeneratedApp.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) });
        }}
      />
    </div>
  );
}

export const myAppsRoute = createRoute({
  path: "/my-apps",
  getParentRoute: () => appLayoutRoute,
  component: MyAppsPage,
});
