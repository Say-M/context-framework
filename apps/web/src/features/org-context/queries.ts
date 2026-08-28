import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  CreateOrgContextInput,
  ListOrgContextsQuery,
  OrgContext,
  UpdateOrgContextInput,
} from "@bismo/shared-schemas";
import { apiRequest } from "@/lib/api-client";
import { toQueryString } from "@/lib/query-string";

export const orgContextKeys = {
  all: ["org-contexts"] as const,
  list: (filters: Partial<ListOrgContextsQuery>) =>
    [...orgContextKeys.all, "list", filters] as const,
  detail: (id: string) => [...orgContextKeys.all, "detail", id] as const,
};

interface ListResult {
  items: OrgContext[];
  page: number;
  limit: number;
  total: number;
}

export function useOrgContexts(filters: Partial<ListOrgContextsQuery> = {}) {
  return useQuery({
    queryKey: orgContextKeys.list(filters),
    queryFn: () => apiRequest<ListResult>(`/api/v1/org-contexts${toQueryString(filters)}`),
  });
}

export function useOrgContext(id: string | null) {
  return useQuery({
    queryKey: orgContextKeys.detail(id ?? "none"),
    queryFn: () => apiRequest<OrgContext>(`/api/v1/org-contexts/${id}`),
    enabled: !!id,
  });
}

export function useCreateOrgContext() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateOrgContextInput) =>
      apiRequest<OrgContext>("/api/v1/org-contexts", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: orgContextKeys.all }),
  });
}

export function useUpdateOrgContext(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateOrgContextInput) =>
      apiRequest<OrgContext>(`/api/v1/org-contexts/${id}`, {
        method: "PATCH",
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orgContextKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: orgContextKeys.all });
    },
  });
}

export function useDeleteOrgContext() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiRequest(`/api/v1/org-contexts/${id}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: orgContextKeys.all }),
  });
}

export function useResubmitOrgContext() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiRequest<OrgContext>(`/api/v1/org-contexts/${id}/resubmit`, { method: "POST" }),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: orgContextKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: orgContextKeys.all });
    },
  });
}
