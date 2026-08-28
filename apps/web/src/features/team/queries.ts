import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { PublicUser, Role, UserStatus } from "@bismo/shared-schemas";
import { apiRequest } from "@/lib/api-client";

export const teamKeys = {
  all: ["users"] as const,
  list: () => [...teamKeys.all, "list"] as const,
};

interface ListResult {
  items: PublicUser[];
  page: number;
  limit: number;
  total: number;
}

export function useUsers() {
  return useQuery({
    queryKey: teamKeys.list(),
    queryFn: () => apiRequest<ListResult>("/api/v1/users?limit=100"),
  });
}

export function useUpdateUserRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, role }: { id: string; role: Role }) =>
      apiRequest<PublicUser>(`/api/v1/users/${id}/role`, {
        method: "PATCH",
        body: JSON.stringify({ role }),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: teamKeys.all }),
  });
}

export function useUpdateUserStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: UserStatus }) =>
      apiRequest<PublicUser>(`/api/v1/users/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: teamKeys.all }),
  });
}
