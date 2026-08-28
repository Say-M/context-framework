import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "../lib/cn";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Renders a colored left accent bar — pass a module accent CSS variable, e.g. "var(--bismo-accent-domain)". */
  accentColor?: string;
  selected?: boolean;
  classNames?: { root?: string };
}

export function Card({
  className,
  classNames,
  accentColor,
  selected,
  children,
  style,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        "rounded-lg border bg-[var(--bismo-bg-elevated)] border-[var(--bismo-border)] p-4 transition-colors",
        "hover:bg-[var(--bismo-bg-hover)]",
        selected && "ring-1 ring-[var(--bismo-accent-domain)]",
        className,
        classNames?.root,
      )}
      style={{
        borderLeftWidth: accentColor ? "3px" : undefined,
        borderLeftColor: accentColor,
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("mb-2 flex items-start justify-between gap-2", className)}>{children}</div>;
}

export function CardTitle({ children, className }: { children: ReactNode; className?: string }) {
  return <h3 className={cn("text-sm font-semibold text-[var(--bismo-text)]", className)}>{children}</h3>;
}

export function CardDescription({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn("text-sm text-[var(--bismo-text-muted)]", className)}>{children}</p>;
}

export function CardFooter({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("mt-3 flex flex-wrap items-center gap-2", className)}>{children}</div>;
}
