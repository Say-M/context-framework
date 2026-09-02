import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  CreateStudioThreadInput,
  StudioArtifact,
  StudioMessage,
  StudioThread,
  UpdateStudioArtifactInput,
} from "@bismo/shared-schemas";
import { apiRequest } from "@/lib/api-client";
import { getSocket } from "@/lib/socketClient";

// Mirrors apps/generator-web/src/features/generated-apps/queries.ts's
// ProgressEvent shape — same publish()/room/backlog mechanism on the
// server (socket.ts), just keyed by threadId instead of generatedAppId.
export type ProgressEvent =
  | { type: "assistant_text"; text: string }
  | { type: "tool_use"; tool: string; summary: string }
  | { type: "done"; status: "idle" | "failed"; lastError: string | null };

export const studioKeys = {
  all: ["studio"] as const,
  threads: () => [...studioKeys.all, "threads"] as const,
  thread: (id: string) => [...studioKeys.all, "threads", id] as const,
  messages: (id: string) => [...studioKeys.all, "threads", id, "messages"] as const,
  artifacts: (threadId: string) => [...studioKeys.all, "threads", threadId, "artifacts"] as const,
  artifact: (id: string) => [...studioKeys.all, "artifacts", id] as const,
};

function pollWhileWorking(query: { state: { data?: { status?: string } } }) {
  return query.state.data?.status === "working" ? 2000 : false;
}

export function useStudioThreads() {
  return useQuery({
    queryKey: studioKeys.threads(),
    queryFn: () => apiRequest<{ items: StudioThread[] }>("/api/v1/studio/threads"),
  });
}

export function useStudioThread(id: string | null) {
  return useQuery({
    queryKey: studioKeys.thread(id ?? "none"),
    queryFn: () => apiRequest<StudioThread>(`/api/v1/studio/threads/${id}`),
    enabled: !!id,
    refetchInterval: pollWhileWorking,
  });
}

export function useCreateStudioThread() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateStudioThreadInput) =>
      apiRequest<StudioThread>("/api/v1/studio/threads", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: studioKeys.threads() }),
  });
}

export function useStudioMessages(id: string | null) {
  return useQuery({
    queryKey: studioKeys.messages(id ?? "none"),
    queryFn: () => apiRequest<{ items: StudioMessage[] }>(`/api/v1/studio/threads/${id}/messages`),
    enabled: !!id,
  });
}

export function useSendStudioMessage(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ content, deepResearch }: { content: string; deepResearch?: boolean }) =>
      apiRequest<StudioMessage>(`/api/v1/studio/threads/${id}/messages`, {
        method: "POST",
        body: JSON.stringify({ content, deepResearch }),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: studioKeys.all }),
  });
}

/** Live progress log while a turn runs — see generated-apps' useGenerationStream for the identical pattern. */
export function useStudioStream(id: string | null, enabled: boolean) {
  const queryClient = useQueryClient();
  const [log, setLog] = useState<ProgressEvent[]>([]);

  useEffect(() => {
    if (!id || !enabled) return;
    setLog([]);
    const socket = getSocket();

    const subscribe = () => socket.emit("subscribe", { studioThreadId: id });
    const handleProgress = (payload: { generatedAppId: string; event: ProgressEvent }) => {
      if (payload.generatedAppId !== id) return;
      setLog((prev) => [...prev, payload.event]);
      if (payload.event.type === "done") {
        queryClient.invalidateQueries({ queryKey: studioKeys.all });
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

/** Every artifact created/updated in this thread — a thread can hold several at once, browsable via ArtifactPanel's tab strip. */
export function useStudioArtifacts(threadId: string | null) {
  return useQuery({
    queryKey: studioKeys.artifacts(threadId ?? "none"),
    queryFn: () => apiRequest<{ items: StudioArtifact[] }>(`/api/v1/studio/threads/${threadId}/artifacts`),
    enabled: !!threadId,
  });
}

export function useStudioArtifact(id: string | null) {
  return useQuery({
    queryKey: studioKeys.artifact(id ?? "none"),
    queryFn: () => apiRequest<StudioArtifact>(`/api/v1/studio/artifacts/${id}`),
    enabled: !!id,
  });
}

export function useUpdateStudioArtifact(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateStudioArtifactInput) =>
      apiRequest<StudioArtifact>(`/api/v1/studio/artifacts/${id}`, {
        method: "PATCH",
        body: JSON.stringify(input),
      }),
    onSuccess: (artifact) => queryClient.setQueryData(studioKeys.artifact(id), artifact),
  });
}
