import { useState } from "react";
import { createRoute, Navigate, Outlet } from "@tanstack/react-router";
import { Menu } from "lucide-react";
import { rootRoute } from "./__root";
import { useAuth } from "@/context/AuthContext";
import { Sidebar } from "@/components/Sidebar";

function AppLayoutComponent() {
  const { status } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (status === "loading") return null;
  if (status === "unauthenticated") return <Navigate to="/login" />;

  return (
    <div className="flex min-h-screen bg-[var(--bismo-bg)]">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 flex-shrink-0 items-center gap-3 border-b border-[var(--bismo-border)] px-4 md:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
            className="flex h-9 w-9 items-center justify-center rounded-md border border-[var(--bismo-border)] text-[var(--bismo-text)]"
          >
            <Menu size={18} strokeWidth={1.75} />
          </button>
          <span className="text-sm font-bold text-[var(--bismo-text)]">BISMO</span>
        </header>
        <main className="min-w-0 flex-1 overflow-y-auto p-4 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export const appLayoutRoute = createRoute({
  id: "_app",
  getParentRoute: () => rootRoute,
  component: AppLayoutComponent,
});
