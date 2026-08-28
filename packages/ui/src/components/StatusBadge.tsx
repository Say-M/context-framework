import type { ReactNode } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../lib/cn";

const badgeStyles = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium border",
  {
    variants: {
      variant: {
        pending: "text-[var(--bismo-status-pending)] border-[var(--bismo-status-pending)]/40 bg-[var(--bismo-status-pending)]/10",
        approved: "text-[var(--bismo-status-approved)] border-[var(--bismo-status-approved)]/40 bg-[var(--bismo-status-approved)]/10",
        rejected: "text-[var(--bismo-status-rejected)] border-[var(--bismo-status-rejected)]/40 bg-[var(--bismo-status-rejected)]/10",
        neutral: "text-[var(--bismo-text-muted)] border-[var(--bismo-border)] bg-[var(--bismo-bg-elevated)]",
      },
    },
    defaultVariants: { variant: "neutral" },
  },
);

export interface StatusBadgeProps extends VariantProps<typeof badgeStyles> {
  children: ReactNode;
  className?: string;
}

const STATUS_TO_VARIANT = {
  pending: "pending",
  approved: "approved",
  rejected: "rejected",
} as const;

export function StatusBadge({ children, variant, className }: StatusBadgeProps) {
  return <span className={cn(badgeStyles({ variant }), className)}>{children}</span>;
}

/** Convenience wrapper for the common case: rendering an approvable item's literal status. */
export function ApprovalStatusBadge({ status }: { status: keyof typeof STATUS_TO_VARIANT }) {
  const label = status.charAt(0).toUpperCase() + status.slice(1);
  return <StatusBadge variant={STATUS_TO_VARIANT[status]}>{label}</StatusBadge>;
}
