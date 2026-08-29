import { createRoute, Link } from "@tanstack/react-router";
import { Card, CardDescription, CardFooter, CardTitle, StatusBadge } from "@bismo/ui";
import { appLayoutRoute } from "../AppLayout";
import { useMyGeneratedApps } from "@/features/generated-apps/queries";

function MyAppsPage() {
  const { data, isLoading } = useMyGeneratedApps();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-bold text-[var(--bismo-text)]">My Apps</h1>
        <p className="text-sm text-[var(--bismo-text-muted)]">Applications you've generated from the catalog.</p>
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
              {app.database === "mongodb" ? "MongoDB" : "PostgreSQL"} · {app.frontendFramework}
            </CardDescription>
            <div className="mt-2">
              <StatusBadge variant="neutral">{app.status}</StatusBadge>
            </div>
            <CardFooter>
              <Link
                to="/my-apps/$id"
                params={{ id: app.id }}
                className="text-sm font-medium text-[var(--bismo-accent-blueprint)]"
              >
                View versions →
              </Link>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}

export const myAppsRoute = createRoute({
  path: "/my-apps",
  getParentRoute: () => appLayoutRoute,
  component: MyAppsPage,
});
