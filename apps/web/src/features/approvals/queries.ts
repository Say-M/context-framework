import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ApprovalQueueItem, ContentTypeSlug } from "@bismo/shared-schemas";
import { apiRequest } from "@/lib/api-client";
import { businessDomainKeys } from "@/features/business-domain/queries";
import { businessModelKeys } from "@/features/business-model/queries";
import { orgContextKeys } from "@/features/org-context/queries";
import { appBlueprintKeys } from "@/features/app-blueprints/queries";

export const approvalQueueKeys = {
  queue: ["approvals", "queue"] as const,
};

/**
 * Shared by the Approval Queue page and the Sidebar's pending-count badge —
 * both read the same query key, so mounting them together never double-fetches.
 * Polls every 30s so the sidebar badge stays live even when the admin is on
 * a different page.
 */
export function useApprovalQueue(options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: approvalQueueKeys.queue,
    queryFn: () => apiRequest<{ items: ApprovalQueueItem[] }>("/api/v1/approvals/queue"),
    enabled: options.enabled ?? true,
    refetchInterval: 30_000,
  });
}

function invalidateModuleList(queryClient: ReturnType<typeof useQueryClient>, type: ContentTypeSlug) {
  switch (type) {
    case "business-domain":
      queryClient.invalidateQueries({ queryKey: businessDomainKeys.all });
      break;
    case "business-model":
      queryClient.invalidateQueries({ queryKey: businessModelKeys.all });
      break;
    case "org-context":
      queryClient.invalidateQueries({ queryKey: orgContextKeys.all });
      break;
    case "app-blueprint":
      queryClient.invalidateQueries({ queryKey: appBlueprintKeys.all });
      break;
  }
}

export function useApproveQueueItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ type, id }: { type: ContentTypeSlug; id: string }) =>
      apiRequest(`/api/v1/approvals/${type}/${id}/approve`, { method: "PATCH" }),
    onMutate: async ({ id }) => {
      await queryClient.cancelQueries({ queryKey: approvalQueueKeys.queue });
      const previous = queryClient.getQueryData<{ items: ApprovalQueueItem[] }>(
        approvalQueueKeys.queue,
      );
      queryClient.setQueryData<{ items: ApprovalQueueItem[] }>(approvalQueueKeys.queue, (old) => ({
        items: (old?.items ?? []).filter((item) => item.id !== id),
      }));
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(approvalQueueKeys.queue, context.previous);
    },
    onSettled: (_data, _err, variables) => {
      queryClient.invalidateQueries({ queryKey: approvalQueueKeys.queue });
      invalidateModuleList(queryClient, variables.type);
    },
  });
}

export function useRejectQueueItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ type, id, reason }: { type: ContentTypeSlug; id: string; reason: string }) =>
      apiRequest(`/api/v1/approvals/${type}/${id}/reject`, {
        method: "PATCH",
        body: JSON.stringify({ reason }),
      }),
    onMutate: async ({ id }) => {
      await queryClient.cancelQueries({ queryKey: approvalQueueKeys.queue });
      const previous = queryClient.getQueryData<{ items: ApprovalQueueItem[] }>(
        approvalQueueKeys.queue,
      );
      queryClient.setQueryData<{ items: ApprovalQueueItem[] }>(approvalQueueKeys.queue, (old) => ({
        items: (old?.items ?? []).filter((item) => item.id !== id),
      }));
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(approvalQueueKeys.queue, context.previous);
    },
    onSettled: (_data, _err, variables) => {
      queryClient.invalidateQueries({ queryKey: approvalQueueKeys.queue });
      invalidateModuleList(queryClient, variables.type);
    },
  });
}
