import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CreateGeneratedAppInput, GeneratedApp, GeneratedAppVersion } from "@bismo/shared-schemas";
import { apiDownload, apiRequest } from "@/lib/api-client";

export const generatedAppKeys = {
  all: ["generated-apps"] as const,
  list: () => [...generatedAppKeys.all, "list"] as const,
  versions: (id: string) => [...generatedAppKeys.all, "versions", id] as const,
};

export function useMyGeneratedApps() {
  return useQuery({
    queryKey: generatedAppKeys.list(),
    queryFn: () => apiRequest<{ items: GeneratedApp[] }>("/api/v1/generated-apps"),
  });
}

export function useGeneratedAppVersions(id: string | null) {
  return useQuery({
    queryKey: generatedAppKeys.versions(id ?? "none"),
    queryFn: () => apiRequest<{ items: GeneratedAppVersion[] }>(`/api/v1/generated-apps/${id}/versions`),
    enabled: !!id,
  });
}

export function useCreateGeneratedApp() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateGeneratedAppInput) =>
      apiRequest<GeneratedApp>("/api/v1/generated-apps", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: generatedAppKeys.all }),
  });
}

export function downloadGeneratedAppVersion(generatedAppId: string, sha: string) {
  return apiDownload(
    `/api/v1/generated-apps/${generatedAppId}/versions/${sha}/download`,
    `${generatedAppId}-${sha.slice(0, 7)}.zip`,
  );
}
