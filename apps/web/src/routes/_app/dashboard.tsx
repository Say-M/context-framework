import { createRoute } from "@tanstack/react-router";
import { appLayoutRoute } from "../AppLayout";
import { useAuth } from "@/context/AuthContext";

function DashboardPage() {
  const { user } = useAuth();
  return (
    <div>
      <h1 className="text-2xl font-bold">Welcome, {user?.name}</h1>
      <p className="mt-2 text-[var(--bismo-text-muted)]">
        You're signed in as <span className="font-medium">{user?.role}</span>. Business Domain,
        Business Model, Org Context, and App Blueprint modules land in the next milestones.
      </p>
    </div>
  );
}

export const dashboardRoute = createRoute({
  path: "/dashboard",
  getParentRoute: () => appLayoutRoute,
  component: DashboardPage,
});
