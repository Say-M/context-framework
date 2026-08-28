import { createRoute } from "@tanstack/react-router";
import { appLayoutRoute } from "../AppLayout";
import { AdminGuard } from "@/components/AdminGuard";
import { ApprovalQueueList } from "@/features/approvals/components/ApprovalQueueList";

function ApprovalQueuePage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-[var(--bismo-text)]">Approval Queue</h1>
      <p className="mt-2 text-[var(--bismo-text-muted)]">
        Review pending Business Domains, Models, Org Contexts, and App Blueprints.
      </p>
      <div className="mt-6">
        <ApprovalQueueList />
      </div>
    </div>
  );
}

export const approvalQueueRoute = createRoute({
  path: "/approval-queue",
  getParentRoute: () => appLayoutRoute,
  component: () => (
    <AdminGuard>
      <ApprovalQueuePage />
    </AdminGuard>
  ),
});
