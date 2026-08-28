import { createRoute, Navigate, Outlet } from "@tanstack/react-router";
import { rootRoute } from "./__root";
import { useAuth } from "@/context/AuthContext";
import { Sidebar } from "@/components/Sidebar";

function AppLayoutComponent() {
  const { status } = useAuth();

  if (status === "loading") return null;
  if (status === "unauthenticated") return <Navigate to="/login" />;

  return (
    <div className="flex min-h-screen bg-[var(--bismo-bg)]">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-8">
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
