import { useEffect, useRef, useState } from "react";
import { createRoute } from "@tanstack/react-router";
import { cn } from "@bismo/ui";
import { appLayoutRoute } from "../AppLayout";
import { ChatPanel } from "@/features/studio/components/ChatPanel";
import { ArtifactPanel } from "@/features/studio/components/ArtifactPanel";
import { useStudioArtifacts, useStudioThread } from "@/features/studio/queries";

function ThreadDetailPage() {
  const { id } = threadDetailRoute.useParams();
  const { data: thread, isLoading } = useStudioThread(id);
  const { data: artifacts } = useStudioArtifacts(id);

  // A thread can hold several artifacts over its lifetime — selection is
  // owned here so ChatPanel's per-message artifact links and ArtifactPanel's
  // tab strip drive the same state.
  const [selectedArtifactId, setSelectedArtifactId] = useState<string | null>(null);
  const lastCountRef = useRef(0);
  useEffect(() => {
    const items = artifacts?.items ?? [];
    // Jump to a newly-created artifact automatically (matches the old
    // "always show the freshest" behavior) — but only on growth, so
    // browsing to an older one via the tab strip or a chat link isn't
    // overridden by an unrelated re-fetch.
    if (items.length > lastCountRef.current) {
      setSelectedArtifactId(items[items.length - 1]!.id);
    }
    lastCountRef.current = items.length;
  }, [artifacts]);

  // Below `lg` the two panels can't sit side by side (see the responsive
  // layout below) — this tracks which one is currently visible there.
  const [mobileView, setMobileView] = useState<"chat" | "artifacts">("chat");

  const handleSelectArtifact = (artifactId: string) => {
    setSelectedArtifactId(artifactId);
    setMobileView("artifacts");
  };

  if (isLoading || !thread) {
    return <p className="text-sm text-[var(--bismo-text-muted)]">Loading…</p>;
  }

  const artifactCount = artifacts?.items.length ?? 0;

  return (
    <div className="flex h-[calc(100vh-5.5rem)] flex-col gap-3 sm:h-[calc(100vh-7.5rem)] lg:gap-6">
      <div className="flex flex-shrink-0 gap-2 lg:hidden">
        <button
          type="button"
          onClick={() => setMobileView("chat")}
          className={cn(
            "flex-1 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors",
            mobileView === "chat"
              ? "border-[var(--bismo-accent-blueprint)] bg-[var(--bismo-accent-blueprint)]/10 text-[var(--bismo-accent-blueprint)]"
              : "border-[var(--bismo-border)] text-[var(--bismo-text-muted)]",
          )}
        >
          Chat
        </button>
        <button
          type="button"
          onClick={() => setMobileView("artifacts")}
          className={cn(
            "flex-1 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors",
            mobileView === "artifacts"
              ? "border-[var(--bismo-accent-blueprint)] bg-[var(--bismo-accent-blueprint)]/10 text-[var(--bismo-accent-blueprint)]"
              : "border-[var(--bismo-border)] text-[var(--bismo-text-muted)]",
          )}
        >
          {artifactCount > 0 ? `Artifacts (${artifactCount})` : "Artifacts"}
        </button>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 lg:grid-cols-2 lg:gap-6">
        <div className={cn("h-full min-h-0", mobileView === "chat" ? "flex" : "hidden", "lg:flex")}>
          <ChatPanel threadId={id} status={thread.status} onSelectArtifact={handleSelectArtifact} />
        </div>
        <div className={cn("h-full min-h-0", mobileView === "artifacts" ? "block" : "hidden", "lg:block")}>
          <ArtifactPanel
            artifacts={artifacts?.items ?? []}
            selectedId={selectedArtifactId}
            onSelect={setSelectedArtifactId}
          />
        </div>
      </div>
    </div>
  );
}

export const threadDetailRoute = createRoute({
  path: "/threads/$id",
  getParentRoute: () => appLayoutRoute,
  component: ThreadDetailPage,
});
