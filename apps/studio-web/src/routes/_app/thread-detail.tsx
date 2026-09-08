import { createRoute } from "@tanstack/react-router";
import { appLayoutRoute } from "../AppLayout";
import { ChatPanel } from "@/features/studio/components/ChatPanel";
import { useStudioThread } from "@/features/studio/queries";

/**
 * Full width/height now that artifacts open in their own tab instead of a
 * side panel — nothing left to split the screen with, so this is just the
 * chat. See ArtifactCard (rendered inline by ChatPanel) for how an
 * artifact-producing message is shown and opened.
 */
function ThreadDetailPage() {
  const { id } = threadDetailRoute.useParams();
  const { data: thread, isLoading } = useStudioThread(id);

  if (isLoading || !thread) {
    return <p className="p-8 text-sm text-[var(--bismo-text-muted)]">Loading…</p>;
  }

  return (
    <div className="h-full p-4 sm:p-8">
      <ChatPanel threadId={id} status={thread.status} />
    </div>
  );
}

export const threadDetailRoute = createRoute({
  path: "/threads/$id",
  getParentRoute: () => appLayoutRoute,
  component: ThreadDetailPage,
});
