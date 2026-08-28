import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  BusinessModel,
  CreateBusinessModelInput,
  ListBusinessModelsQuery,
  UpdateBusinessModelInput,
} from "@bismo/shared-schemas";
import { apiRequest } from "@/lib/api-client";
import { toQueryString } from "@/lib/query-string";

export const businessModelKeys = {
  all: ["business-models"] as const,
  list: (filters: Partial<ListBusinessModelsQuery>) =>
    [...businessModelKeys.all, "list", filters] as const,
  detail: (id: string) => [...businessModelKeys.all, "detail", id] as const,
};

interface ListResult {
  items: BusinessModel[];
  page: number;
  limit: number;
  total: number;
}

export function useBusinessModels(filters: Partial<ListBusinessModelsQuery> = {}) {
  return useQuery({
    queryKey: businessModelKeys.list(filters),
    queryFn: () => apiRequest<ListResult>(`/api/v1/business-models${toQueryString(filters)}`),
  });
}

export function useBusinessModel(id: string | null) {
  return useQuery({
    queryKey: businessModelKeys.detail(id ?? "none"),
    queryFn: () => apiRequest<BusinessModel>(`/api/v1/business-models/${id}`),
    enabled: !!id,
  });
}

export function useCreateBusinessModel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateBusinessModelInput) =>
      apiRequest<BusinessModel>("/api/v1/business-models", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: businessModelKeys.all }),
  });
}

export function useUpdateBusinessModel(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateBusinessModelInput) =>
      apiRequest<BusinessModel>(`/api/v1/business-models/${id}`, {
        method: "PATCH",
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: businessModelKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: businessModelKeys.all });
    },
  });
}

export function useDeleteBusinessModel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiRequest(`/api/v1/business-models/${id}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: businessModelKeys.all }),
  });
}

export function useResubmitBusinessModel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiRequest<BusinessModel>(`/api/v1/business-models/${id}/resubmit`, { method: "POST" }),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: businessModelKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: businessModelKeys.all });
    },
  });
}
