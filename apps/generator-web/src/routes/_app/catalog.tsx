import { createRoute, Link } from "@tanstack/react-router";
import { Card, CardDescription, CardFooter, CardTitle } from "@bismo/ui";
import { appLayoutRoute } from "../AppLayout";
import { useCatalogBlueprints } from "@/features/catalog/queries";

function CatalogPage() {
  const { data, isLoading } = useCatalogBlueprints();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-bold text-[var(--bismo-text)]">Catalog</h1>
        <p className="text-sm text-[var(--bismo-text-muted)]">
          Approved application blueprints you can generate software from.
        </p>
      </div>
      {isLoading && <p className="text-sm text-[var(--bismo-text-muted)]">Loading…</p>}
      {!isLoading && data?.items.length === 0 && (
        <p className="text-sm text-[var(--bismo-text-muted)]">No blueprints are available yet.</p>
      )}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data?.items.map((blueprint) => (
          <Card key={blueprint.id}>
            <CardTitle>{blueprint.name}</CardTitle>
            <CardDescription className="font-mono text-xs">{blueprint.namespace}</CardDescription>
            <p className="mt-2 line-clamp-3 text-sm text-[var(--bismo-text-muted)]">
              {blueprint.description || "No description provided."}
            </p>
            <CardFooter>
              <Link
                to="/blueprints/$id"
                params={{ id: blueprint.id }}
                className="text-sm font-medium text-[var(--bismo-accent-blueprint)]"
              >
                View & generate →
              </Link>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}

export const catalogRoute = createRoute({
  path: "/",
  getParentRoute: () => appLayoutRoute,
  component: CatalogPage,
});
