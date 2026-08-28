import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  BusinessDomain,
  CreateBusinessDomainInput,
  ListBusinessDomainsQuery,
  UpdateBusinessDomainInput,
} from "@bismo/shared-schemas";
import { apiRequest } from "@/lib/api-client";
import { toQueryString } from "@/lib/query-string";

export const businessDomainKeys = {
  all: ["business-domains"] as const,
  list: (filters: Partial<ListBusinessDomainsQuery>) =>
    [...businessDomainKeys.all, "list", filters] as const,
  detail: (id: string) => [...businessDomainKeys.all, "detail", id] as const,
};

interface ListResult {
  items: BusinessDomain[];
  page: number;
  limit: number;
  total: number;
}

export function useBusinessDomains(filters: Partial<ListBusinessDomainsQuery> = {}) {
  return useQuery({
    queryKey: businessDomainKeys.list(filters),
    queryFn: () =>
      apiRequest<ListResult>(`/api/v1/business-domains${toQueryString(filters)}`),
  });
}

export function useBusinessDomain(id: string | null) {
  return useQuery({
    queryKey: businessDomainKeys.detail(id ?? "none"),
    queryFn: () => apiRequest<BusinessDomain>(`/api/v1/business-domains/${id}`),
    enabled: !!id,
  });
}

export function useCreateBusinessDomain() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateBusinessDomainInput) =>
      apiRequest<BusinessDomain>("/api/v1/business-domains", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: businessDomainKeys.all }),
  });
}

export function useUpdateBusinessDomain(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateBusinessDomainInput) =>
      apiRequest<BusinessDomain>(`/api/v1/business-domains/${id}`, {
        method: "PATCH",
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: businessDomainKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: businessDomainKeys.all });
    },
  });
}

export function useDeleteBusinessDomain() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiRequest(`/api/v1/business-domains/${id}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: businessDomainKeys.all }),
  });
}

export function useResubmitBusinessDomain() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiRequest<BusinessDomain>(`/api/v1/business-domains/${id}/resubmit`, { method: "POST" }),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: businessDomainKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: businessDomainKeys.all });
    },
  });
}
