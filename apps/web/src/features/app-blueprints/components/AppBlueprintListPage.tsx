import { Link } from "@tanstack/react-router";
import { Button, Card, CardDescription, CardHeader, CardTitle } from "@bismo/ui";
import { useAppBlueprints } from "../queries";
import { AppBlueprintStatusBadge } from "./AppBlueprintStatusBadge";

export function AppBlueprintListPage() {
  const { data, isLoading } = useAppBlueprints({ limit: 50 });

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--bismo-text)]">04. App Blueprints</h1>
          <p className="mt-1 text-[var(--bismo-text-muted)]">
            Compose approved domains, models, and org contexts into a publishable blueprint.
          </p>
        </div>
        <Link to="/app-blueprints/new">
          <Button className="w-full bg-[var(--bismo-accent-blueprint)] sm:w-auto">
            + New Application Blueprint
          </Button>
        </Link>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading && <p className="text-sm text-[var(--bismo-text-muted)]">Loading…</p>}
        {!isLoading && data?.items.length === 0 && (
          <p className="text-sm text-[var(--bismo-text-muted)]">
            No application blueprints yet — click "+ New Application Blueprint" to compose one.
          </p>
        )}
        {data?.items.map((bp) => (
          <Link key={bp.id} to="/app-blueprints/new" search={{ draftId: bp.id }}>
            <Card accentColor="var(--bismo-accent-blueprint)" className="cursor-pointer">
              <CardHeader>
                <div>
                  <CardTitle>{bp.name}</CardTitle>
                  <p className="mt-0.5 font-mono text-xs text-[var(--bismo-text-muted)]">
                    {bp.namespace} · {bp.version}
                  </p>
                </div>
                <AppBlueprintStatusBadge status={bp.status} />
              </CardHeader>
              <CardDescription>{bp.description || "No description yet."}</CardDescription>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
