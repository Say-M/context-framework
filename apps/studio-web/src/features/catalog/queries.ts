import { useQuery } from "@tanstack/react-query";
import type { CatalogBlueprintSummary } from "@bismo/shared-schemas";
import { apiRequest } from "@/lib/api-client";

// Same public, unauthenticated endpoint apps/generator-web already uses —
// approved blueprints are visible to every platform user regardless of
// which frontend they're using.
export function useCatalogBlueprints() {
  return useQuery({
    queryKey: ["catalog-blueprints", "list"],
    queryFn: () => apiRequest<{ items: CatalogBlueprintSummary[] }>("/api/v1/catalog/blueprints"),
  });
}
