import { useQuery } from "@tanstack/react-query";
import type { CatalogBlueprintDetail, CatalogBlueprintSummary } from "@bismo/shared-schemas";
import { apiRequest } from "@/lib/api-client";

export const catalogKeys = {
  all: ["catalog-blueprints"] as const,
  list: () => [...catalogKeys.all, "list"] as const,
  detail: (id: string) => [...catalogKeys.all, "detail", id] as const,
};

export function useCatalogBlueprints() {
  return useQuery({
    queryKey: catalogKeys.list(),
    queryFn: () => apiRequest<{ items: CatalogBlueprintSummary[] }>("/api/v1/catalog/blueprints"),
  });
}

export function useCatalogBlueprint(id: string | null) {
  return useQuery({
    queryKey: catalogKeys.detail(id ?? "none"),
    queryFn: () => apiRequest<CatalogBlueprintDetail>(`/api/v1/catalog/blueprints/${id}`),
    enabled: !!id,
  });
}
