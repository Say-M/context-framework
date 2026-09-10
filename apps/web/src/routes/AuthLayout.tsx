import { createRoute, Navigate, Outlet, useRouterState } from "@tanstack/react-router";
import { rootRoute } from "./__root";
import { useAuth } from "@/context/AuthContext";

function AuthLayoutComponent() {
  const { status } = useAuth();
  // /activate carries its own invite token and must render even if the
  // browser already holds a session for someone else (e.g. the admin who
  // just generated the link) — activating replaces that session outright.
  const isActivating = useRouterState({ select: (s) => s.location.pathname === "/activate" });

  if (status === "loading") return null;
  if (status === "authenticated" && !isActivating) return <Navigate to="/dashboard" />;

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
