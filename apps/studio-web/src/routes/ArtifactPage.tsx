import { createRoute, Link, Navigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { rootRoute } from "./__root";
import { usePlatformAuth } from "@/context/PlatformAuthContext";
import { useStudioArtifact } from "@/features/studio/queries";
import { KIND_LABEL } from "@/features/studio/lib/artifactKind";
import { DocEditor } from "@/features/studio/components/DocEditor";
import { SheetEditor } from "@/features/studio/components/SheetEditor";
import { SlideEditor } from "@/features/studio/components/SlideEditor";
import { ImageViewer } from "@/features/studio/components/ImageViewer";
import { ResearchViewer } from "@/features/studio/components/ResearchViewer";

/**
 * A dedicated full-page editor, opened from an ArtifactCard's "Open & edit"
 * link with `target="_blank"` — a genuinely new browser tab, not a route
 * change within the thread view. Deliberately a top-level route (sibling of
 * AppLayout, not nested under it): the reference pattern this follows has
 * its own minimal chrome here (a back arrow + kind label), not the app's
 * sidebar, so nesting under AppLayout would mean showing two headers.
 *
 * Auth guard duplicated from AppLayout.tsx rather than extracted — it's 3
 * lines, used in exactly two places, and PlatformAuthProvider already wraps
 * the whole router in main.tsx so `usePlatformAuth()` works here directly.
 * A brand new tab still authenticates correctly: the httpOnly refresh
 * cookie (not the in-memory access token) is what survives across tabs,
 * and PlatformAuthContext's mount-time silent refresh already restores a
 * session from it on every page load, this one included.
 */
function ArtifactPageComponent() {
  const { status } = usePlatformAuth();
  const { id } = artifactPageRoute.useParams();
  const { data: artifact, isLoading } = useStudioArtifact(id);

  if (status === "loading") return null;
  if (status === "unauthenticated") return <Navigate to="/login" />;

  if (isLoading || !artifact) {
    return (
      <div className="flex h-screen items-center justify-center bg-[var(--bismo-bg)]">
        <p className="text-sm text-[var(--bismo-text-muted)]">Loading…</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-[var(--bismo-bg)]">
      <div className="flex h-12 flex-shrink-0 items-center gap-3 border-b border-[var(--bismo-border)] px-4">
        <Link
          to="/threads/$id"
          params={{ id: artifact.threadId }}
          className="flex h-8 w-8 items-center justify-center rounded-md text-[var(--bismo-text-muted)] hover:bg-[var(--bismo-bg-hover)] hover:text-[var(--bismo-text)]"
          aria-label="Back to thread"
        >
          <ArrowLeft size={16} strokeWidth={1.75} />
        </Link>
        <span className="text-xs font-medium text-[var(--bismo-text-muted)]">{KIND_LABEL[artifact.kind]}</span>
      </div>
      <div className="min-h-0 flex-1 p-4">
        {artifact.kind === "doc" ? (
          <DocEditor artifact={artifact} />
        ) : artifact.kind === "spreadsheet" ? (
          <SheetEditor artifact={artifact} />
        ) : artifact.kind === "slides" ? (
          <SlideEditor artifact={artifact} />
        ) : artifact.kind === "image" ? (
          <ImageViewer artifact={artifact} />
        ) : (
          <ResearchViewer artifact={artifact} />
        )}
      </div>
    </div>
  );
}

export const artifactPageRoute = createRoute({
  path: "/artifacts/$id",
  getParentRoute: () => rootRoute,
  component: ArtifactPageComponent,
});
