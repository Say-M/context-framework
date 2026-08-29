import { createRoute, Link, Navigate, Outlet } from "@tanstack/react-router";
import { LogOut, Sparkles } from "lucide-react";
import { rootRoute } from "./__root";
import { usePlatformAuth } from "@/context/PlatformAuthContext";

function AppLayoutComponent() {
  const { status, user, logout } = usePlatformAuth();

  if (status === "loading") return null;
  if (status === "unauthenticated") return <Navigate to="/login" />;

  return (
    <div className="flex min-h-screen flex-col bg-[var(--bismo-bg)]">
      <header className="flex h-14 flex-shrink-0 items-center justify-between border-b border-[var(--bismo-border)] px-4 sm:px-8">
        <div className="flex items-center gap-6">
          <span className="flex items-center gap-1.5 text-sm font-bold text-[var(--bismo-text)]">
            <Sparkles size={16} strokeWidth={1.75} className="text-[var(--bismo-accent-blueprint)]" />
            BISMO Generator
          </span>
          <nav className="flex items-center gap-4 text-sm text-[var(--bismo-text-muted)]">
            <Link to="/" className="hover:text-[var(--bismo-text)]" activeProps={{ className: "text-[var(--bismo-text)]" }}>
              Catalog
            </Link>
            <Link
              to="/my-apps"
              className="hover:text-[var(--bismo-text)]"
              activeProps={{ className: "text-[var(--bismo-text)]" }}
            >
              My Apps
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-3 text-sm text-[var(--bismo-text-muted)]">
          <span className="hidden sm:inline">{user?.name}</span>
          <button
            type="button"
            onClick={() => logout()}
            aria-label="Log out"
            className="flex h-8 w-8 items-center justify-center rounded-md border border-[var(--bismo-border)] hover:bg-[var(--bismo-bg-hover)]"
          >
            <LogOut size={14} strokeWidth={1.75} />
          </button>
        </div>
      </header>
      <main className="flex-1 p-4 sm:p-8">
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
