import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { cn } from "@bismo/ui";
import { useAuth } from "@/context/AuthContext";
import { useApprovalQueue } from "@/features/approvals/queries";

const architectureLinks = [
  { to: "/business-domains", label: "01. Business Domain", code: "01" },
  { to: "/business-models", label: "02. Business Model", code: "02" },
  { to: "/org-contexts", label: "03. Org Context", code: "03" },
  { to: "/app-blueprints", label: "04. App Blueprints", code: "04" },
];

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user, logout } = useAuth();
  const isAdmin = user?.role === "admin";
  const { data: queueData } = useApprovalQueue({ enabled: isAdmin });
  const pendingCount = queueData?.items.length ?? 0;

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex h-screen w-64 flex-shrink-0 -translate-x-full flex-col border-r border-[var(--bismo-border)] bg-[var(--bismo-bg)] p-4 transition-transform duration-200 md:static md:translate-x-0",
          open && "translate-x-0",
        )}
      >
        <div className="mb-6 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[var(--bismo-accent-model)] font-bold text-white">
            B
          </div>
          <div>
            <div className="text-sm font-bold leading-none">BISMO</div>
            <div className="text-xs text-[var(--bismo-text-muted)]">Business OS</div>
          </div>
        </div>

        <div className="flex flex-1 flex-col overflow-y-auto">
          <NavSection title="Dashboard">
            <NavLink to="/dashboard" onNavigate={onClose}>
              Dashboard
            </NavLink>
          </NavSection>

          <NavSection title="Bismo Architecture">
            {architectureLinks.map((link) => (
              <NavLink key={link.to} to={link.to} onNavigate={onClose}>
                {link.label}
              </NavLink>
            ))}
          </NavSection>

          <NavSection title="Author & Manage">
            <NavLink to="/app-blueprints/new" onNavigate={onClose}>
              Create Blueprint
            </NavLink>
            {isAdmin && (
              <NavLink
                to="/approval-queue"
                badge={pendingCount > 0 ? pendingCount : undefined}
                onNavigate={onClose}
              >
                Approval Queue
              </NavLink>
            )}
            {isAdmin && (
              <NavLink to="/team-settings" onNavigate={onClose}>
                Team Settings
              </NavLink>
            )}
            <NavLink to="/api-docs" onNavigate={onClose}>
              API Docs & Explorer
            </NavLink>
          </NavSection>
        </div>

        <div className="mt-auto space-y-2">
          <div className="rounded-md border border-[var(--bismo-border)] bg-[var(--bismo-bg-elevated)] p-3 text-xs">
            <div className="flex items-center gap-1.5 font-medium text-[var(--bismo-status-approved)]">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--bismo-status-approved)]" />
              BISMO Framework
            </div>
            <p className="mt-1 text-[var(--bismo-text-muted)]">
              Signed in as {user?.name} ({user?.role})
            </p>
          </div>
          <button
            onClick={() => void logout()}
            className="w-full rounded-md border border-[var(--bismo-border)] px-3 py-2 text-left text-xs text-[var(--bismo-text-muted)] hover:bg-[var(--bismo-bg-hover)]"
          >
            Log out
          </button>
        </div>
      </aside>
    </>
  );
}

function NavSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mb-4">
      <div className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--bismo-text-muted)]">
        {title}
      </div>
      <div className="flex flex-col gap-0.5">{children}</div>
    </div>
  );
}

function NavLink({
  to,
  children,
  badge,
  onNavigate,
}: {
  to: string;
  children: ReactNode;
  badge?: number;
  onNavigate?: () => void;
}) {
  return (
    <Link
      to={to}
      onClick={onNavigate}
      className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm text-[var(--bismo-text-muted)]"
      activeProps={{
        className: cn("bg-[var(--bismo-bg-hover)] text-[var(--bismo-text)]"),
      }}
    >
      <span>{children}</span>
      {badge !== undefined && (
        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--bismo-status-pending)] px-1.5 text-[10px] font-semibold text-black">
          {badge}
        </span>
      )}
    </Link>
  );
}
