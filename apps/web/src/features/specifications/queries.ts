import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  ContentVersion,
  CreateSpecificationInput,
  ParentType,
  Specification,
  UpdateSpecificationInput,
} from "@bismo/shared-schemas";
import { apiRequest } from "@/lib/api-client";
import { businessDomainKeys } from "@/features/business-domain/queries";
import { businessModelKeys } from "@/features/business-model/queries";
import { orgContextKeys } from "@/features/org-context/queries";
import { appBlueprintKeys } from "@/features/app-blueprints/queries";

export const specificationKeys = {
  all: ["specifications"] as const,
  list: (parentType: ParentType, parentId: string) =>
    [...specificationKeys.all, "list", parentType, parentId] as const,
  detail: (id: string) => [...specificationKeys.all, "detail", id] as const,
  versions: (id: string) => [...specificationKeys.all, "versions", id] as const,
};

export function useSpecification(id: string | null) {
  return useQuery({
    queryKey: specificationKeys.detail(id ?? "none"),
    queryFn: () => apiRequest<Specification>(`/api/v1/specifications/${id}`),
    enabled: !!id,
  });
}

export function useSpecifications(parentType: ParentType, parentId: string | null) {
  return useQuery({
    queryKey: specificationKeys.list(parentType, parentId ?? "none"),
    queryFn: () =>
      apiRequest<{ items: Specification[] }>(
        `/api/v1/specifications?parentType=${parentType}&parentId=${parentId}`,
      ),
    enabled: !!parentId,
  });
}

export function useSpecificationVersions(id: string | null) {
  return useQuery({
    queryKey: specificationKeys.versions(id ?? "none"),
    queryFn: () => apiRequest<{ items: ContentVersion[] }>(`/api/v1/specifications/${id}/versions`),
    enabled: !!id,
  });
}

// A spec change can flip its parent's status (approved -> pending/draft), so
// every mutation below invalidates the whole parent-type query family, not
// just the one detail query — list views show status too.
function invalidateParent(
  queryClient: ReturnType<typeof useQueryClient>,
  parentType: ParentType,
  parentId: string,
) {
  switch (parentType) {
    case "BusinessDomain":
      queryClient.invalidateQueries({ queryKey: businessDomainKeys.all });
      break;
    case "BusinessModel":
      queryClient.invalidateQueries({ queryKey: businessModelKeys.all });
      break;
    case "OrgContext":
      queryClient.invalidateQueries({ queryKey: orgContextKeys.all });
      break;
    case "AppBlueprint":
      queryClient.invalidateQueries({ queryKey: appBlueprintKeys.all });
      queryClient.invalidateQueries({ queryKey: appBlueprintKeys.sections(parentId) });
      break;
  }
}

export function useCreateSpecification() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateSpecificationInput) =>
      apiRequest<Specification>("/api/v1/specifications", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: specificationKeys.list(variables.parentType, variables.parentId),
      });
      invalidateParent(queryClient, variables.parentType, variables.parentId);
    },
  });
}

export function useUpdateSpecification(spec: Pick<Specification, "id" | "parentType" | "parentId">) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateSpecificationInput) =>
      apiRequest<Specification>(`/api/v1/specifications/${spec.id}`, {
        method: "PATCH",
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: specificationKeys.detail(spec.id) });
      queryClient.invalidateQueries({ queryKey: specificationKeys.versions(spec.id) });
      queryClient.invalidateQueries({
        queryKey: specificationKeys.list(spec.parentType, spec.parentId),
      });
      invalidateParent(queryClient, spec.parentType, spec.parentId);
    },
  });
}

export function useDeleteSpecification(spec: Pick<Specification, "parentType" | "parentId">) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiRequest(`/api/v1/specifications/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: specificationKeys.list(spec.parentType, spec.parentId),
      });
      invalidateParent(queryClient, spec.parentType, spec.parentId);
    },
  });
}
