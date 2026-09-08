import { createRoute, Link, Navigate, Outlet } from "@tanstack/react-router";
import { LogOut, Plus, Sparkles } from "lucide-react";
import { rootRoute } from "./__root";
import { usePlatformAuth } from "@/context/PlatformAuthContext";
import { useStudioThreads } from "@/features/studio/queries";
import { cn } from "@bismo/ui";

/**
 * A persistent left sidebar (brand, "+ New thread", the thread list, user/
 * logout) replaces the old top-nav header — the thread list used to be its
 * own page; it now lives in the sidebar so it's visible from every screen,
 * matching the reference app's shell. Main content is just `<Outlet/>` —
 * either the landing composer (`/`) or an active thread's chat
 * (`/threads/$id`); both are full width now that artifacts open in their
 * own tab instead of a side panel.
 */
function AppLayoutComponent() {
  const { status, user, logout } = usePlatformAuth();
  const { data: threads } = useStudioThreads();

  if (status === "loading") return null;
  if (status === "unauthenticated") return <Navigate to="/login" />;

  return (
    <div className="flex h-screen bg-[var(--bismo-bg)]">
      <aside className="flex w-64 flex-shrink-0 flex-col border-r border-[var(--bismo-border)]">
        <div className="flex h-14 flex-shrink-0 items-center gap-1.5 border-b border-[var(--bismo-border)] px-4">
          <Sparkles size={16} strokeWidth={1.75} className="text-[var(--bismo-accent-blueprint)]" />
          <span className="text-sm font-bold text-[var(--bismo-text)]">BISMO Studio</span>
        </div>

        <div className="flex-shrink-0 p-3">
          <Link
            to="/"
            className="flex items-center justify-center gap-1.5 rounded-md bg-[var(--bismo-accent-blueprint)] py-2 text-sm font-medium text-white hover:opacity-90"
          >
            <Plus size={14} strokeWidth={1.75} />
            New thread
          </Link>
        </div>

        <nav className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
          <p className="mb-1.5 px-2 text-xs font-semibold uppercase tracking-wide text-[var(--bismo-text-muted)]">
            Chats
          </p>
          <div className="flex flex-col gap-0.5">
            {threads?.items.map((thread) => (
              <Link
                key={thread.id}
                to="/threads/$id"
                params={{ id: thread.id }}
                className="truncate rounded-md px-2 py-1.5 text-sm text-[var(--bismo-text-muted)] hover:bg-[var(--bismo-bg-hover)] hover:text-[var(--bismo-text)]"
                activeProps={{ className: cn("bg-[var(--bismo-bg-hover)] text-[var(--bismo-text)]") }}
              >
                {thread.title}
              </Link>
            ))}
            {threads?.items.length === 0 && (
              <p className="px-2 text-xs text-[var(--bismo-text-muted)]">No threads yet.</p>
            )}
          </div>
        </nav>

        <div className="flex flex-shrink-0 items-center justify-between border-t border-[var(--bismo-border)] p-3">
          <span className="truncate text-xs text-[var(--bismo-text-muted)]">{user?.name}</span>
          <button
            type="button"
            onClick={() => logout()}
            aria-label="Log out"
            className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md text-[var(--bismo-text-muted)] hover:bg-[var(--bismo-bg-hover)] hover:text-[var(--bismo-text)]"
          >
            <LogOut size={14} strokeWidth={1.75} />
          </button>
        </div>
      </aside>

      <main className="min-h-0 flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}

export const appLayoutRoute = createRoute({
  id: "_app",
  getParentRoute: () => rootRoute,
  component: AppLayoutComponent,
});
