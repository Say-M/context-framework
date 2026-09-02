import { createRoute, Navigate, Outlet } from "@tanstack/react-router";
import { rootRoute } from "./__root";
import { usePlatformAuth } from "@/context/PlatformAuthContext";

function AuthLayoutComponent() {
  const { status } = usePlatformAuth();

  if (status === "loading") return null;
  if (status === "authenticated") return <Navigate to="/" />;

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
