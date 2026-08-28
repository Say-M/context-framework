import { createRoute, Navigate, Outlet } from "@tanstack/react-router";
import { rootRoute } from "./__root";
import { useAuth } from "@/context/AuthContext";

function AuthLayoutComponent() {
  const { status } = useAuth();

  if (status === "loading") return null;
  if (status === "authenticated") return <Navigate to="/dashboard" />;

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bismo-bg)] px-4">
      <Outlet />
    </div>
  );
}

export const authLayoutRoute = createRoute({
  id: "_auth",
  getParentRoute: () => rootRoute,
  component: AuthLayoutComponent,
});
