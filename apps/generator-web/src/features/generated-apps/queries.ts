import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  ChatMessage,
  ChatMode,
  CreateGeneratedAppInput,
  GeneratedApp,
  GeneratedAppVersion,
} from "@bismo/shared-schemas";
import { apiDownload, apiRequest } from "@/lib/api-client";
import { getSocket } from "@/lib/socketClient";

export type ProgressEvent =
  | { type: "assistant_text"; text: string }
  | { type: "tool_use"; tool: string; summary: string }
  | { type: "done"; status: "idle" | "failed"; lastError: string | null };

export const generatedAppKeys = {
  all: ["generated-apps"] as const,
  list: () => [...generatedAppKeys.all, "list"] as const,
  detail: (id: string) => [...generatedAppKeys.all, "detail", id] as const,
  versions: (id: string) => [...generatedAppKeys.all, "versions", id] as const,
  messages: (id: string) => [...generatedAppKeys.all, "messages", id] as const,
};

/** Polls every 2s while the app is generating, stops once it settles. */
function pollWhileWorking(query: { state: { data?: { status?: string } } }) {
  return query.state.data?.status === "working" ? 2000 : false;
}

export function useMyGeneratedApps() {
  return useQuery({
    queryKey: generatedAppKeys.list(),
    queryFn: () => apiRequest<{ items: GeneratedApp[] }>("/api/v1/generated-apps"),
  });
}

export function useGeneratedApp(id: string | null) {
  return useQuery({
    queryKey: generatedAppKeys.detail(id ?? "none"),
    queryFn: () => apiRequest<GeneratedApp>(`/api/v1/generated-apps/${id}`),
    enabled: !!id,
    refetchInterval: pollWhileWorking,
  });
}

export function useGeneratedAppVersions(id: string | null, status: string | undefined) {
  return useQuery({
    queryKey: generatedAppKeys.versions(id ?? "none"),
    queryFn: () => apiRequest<{ items: GeneratedAppVersion[] }>(`/api/v1/generated-apps/${id}/versions`),
    enabled: !!id && status === "idle",
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

/**
 * Live progress log while a generation runs — the primary "it's finished"
 * signal (invalidates the status query on a "done" event), with the
 * existing 2s poll as the fallback if the socket never connects or drops.
 * Re-subscribes on every (re)connect, not just the first, so a dropped
 * connection resumes from the server's backlog instead of losing the log.
 */
export function useGenerationStream(id: string | null, enabled: boolean) {
  const queryClient = useQueryClient();
  const [log, setLog] = useState<ProgressEvent[]>([]);

  useEffect(() => {
    if (!id || !enabled) return;
    setLog([]);
    const socket = getSocket();

    const subscribe = () => socket.emit("subscribe", { generatedAppId: id });
    const handleProgress = (payload: { generatedAppId: string; event: ProgressEvent }) => {
      if (payload.generatedAppId !== id) return;
      setLog((prev) => [...prev, payload.event]);
      if (payload.event.type === "done") {
        queryClient.invalidateQueries({ queryKey: generatedAppKeys.all });
      }
    };

    socket.on("connect", subscribe);
    socket.on("progress", handleProgress);
    if (socket.connected) subscribe();
    else socket.connect();

    return () => {
      socket.off("connect", subscribe);
      socket.off("progress", handleProgress);
    };
  }, [id, enabled, queryClient]);

  return log;
}

export function useChatMessages(id: string | null) {
  return useQuery({
    queryKey: generatedAppKeys.messages(id ?? "none"),
    queryFn: () => apiRequest<{ items: ChatMessage[] }>(`/api/v1/generated-apps/${id}/messages`),
    enabled: !!id,
  });
}

export function useSendChatMessage(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ content, mode }: { content: string; mode: ChatMode }) =>
      apiRequest<ChatMessage>(`/api/v1/generated-apps/${id}/messages`, {
        method: "POST",
        body: JSON.stringify({ content, mode }),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: generatedAppKeys.all }),
  });
}

export function useDeleteGeneratedApp() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiRequest(`/api/v1/generated-apps/${id}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: generatedAppKeys.all }),
  });
}

export function downloadGeneratedAppVersion(generatedAppId: string, sha: string) {
  return apiDownload(
    `/api/v1/generated-apps/${generatedAppId}/versions/${sha}/download`,
    `${generatedAppId}-${sha.slice(0, 7)}.zip`,
  );
}
