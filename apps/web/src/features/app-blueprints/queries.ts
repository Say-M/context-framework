import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  AppBlueprint,
  BlueprintFolder,
  ConnectionsInput,
  CreateAppBlueprintInput,
  CreateBlueprintFolderInput,
  ListAppBlueprintsQuery,
  OkfManifest,
  SectionTree,
  UpdateAppBlueprintMetadataInput,
} from "@bismo/shared-schemas";
import { apiRequest } from "@/lib/api-client";
import { toQueryString } from "@/lib/query-string";

export const appBlueprintKeys = {
  all: ["app-blueprints"] as const,
  list: (filters: Partial<ListAppBlueprintsQuery>) =>
    [...appBlueprintKeys.all, "list", filters] as const,
  detail: (id: string) => [...appBlueprintKeys.all, "detail", id] as const,
  sections: (id: string) => [...appBlueprintKeys.all, "sections", id] as const,
  manifest: (id: string) => [...appBlueprintKeys.all, "manifest", id] as const,
};

interface ListResult {
  items: AppBlueprint[];
  page: number;
  limit: number;
  total: number;
}

export function useAppBlueprints(filters: Partial<ListAppBlueprintsQuery> = {}) {
  return useQuery({
    queryKey: appBlueprintKeys.list(filters),
    queryFn: () => apiRequest<ListResult>(`/api/v1/app-blueprints${toQueryString(filters)}`),
  });
}

export function useAppBlueprint(id: string | null) {
  return useQuery({
    queryKey: appBlueprintKeys.detail(id ?? "none"),
    queryFn: () => apiRequest<AppBlueprint>(`/api/v1/app-blueprints/${id}`),
    enabled: !!id,
  });
}

export function useCreateAppBlueprint() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateAppBlueprintInput) =>
      apiRequest<AppBlueprint>("/api/v1/app-blueprints", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: appBlueprintKeys.all }),
  });
}

export function useUpdateConnections(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ConnectionsInput) =>
      apiRequest<AppBlueprint>(`/api/v1/app-blueprints/${id}/connections`, {
        method: "PATCH",
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: appBlueprintKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: appBlueprintKeys.manifest(id) });
    },
  });
}

export function useUpdateAppBlueprintMetadata(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateAppBlueprintMetadataInput) =>
      apiRequest<AppBlueprint>(`/api/v1/app-blueprints/${id}/metadata`, {
        method: "PATCH",
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: appBlueprintKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: appBlueprintKeys.all });
    },
  });
}

export function useDeleteAppBlueprint() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiRequest(`/api/v1/app-blueprints/${id}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: appBlueprintKeys.all }),
  });
}

export function useSectionTree(id: string | null) {
  return useQuery({
    queryKey: appBlueprintKeys.sections(id ?? "none"),
    queryFn: () => apiRequest<SectionTree>(`/api/v1/app-blueprints/${id}/sections`),
    enabled: !!id,
  });
}

export function useManifestPreview(id: string | null) {
  return useQuery({
    queryKey: appBlueprintKeys.manifest(id ?? "none"),
    queryFn: () => apiRequest<OkfManifest>(`/api/v1/app-blueprints/${id}/manifest`),
    enabled: !!id,
  });
}

export function useCreateBlueprintFolder(blueprintId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateBlueprintFolderInput) =>
      apiRequest<BlueprintFolder>(`/api/v1/app-blueprints/${blueprintId}/folders`, {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: appBlueprintKeys.sections(blueprintId) }),
  });
}

export function useDeleteBlueprintFolder(blueprintId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (folderId: string) =>
      apiRequest(`/api/v1/app-blueprints/${blueprintId}/folders/${folderId}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: appBlueprintKeys.sections(blueprintId) }),
  });
}

export function usePublishAppBlueprint(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiRequest<AppBlueprint>(`/api/v1/app-blueprints/${id}/publish`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: appBlueprintKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: appBlueprintKeys.all });
    },
  });
}
