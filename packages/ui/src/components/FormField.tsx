import type { ReactNode } from "react";
import { cn } from "../lib/cn";

export interface FormFieldProps {
  label: string;
  htmlFor?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}

/**
 * Label + error wrapper shared by every create/edit form across all 4
 * modules — pairs with react-hook-form's error messages, which are always
 * string | undefined once resolved through @hookform/resolvers/zod.
 */
export function FormField({ label, htmlFor, error, required, children, className }: FormFieldProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={htmlFor} className="text-sm font-medium text-[var(--bismo-text)]">
        {label}
        {required && <span className="text-[var(--bismo-status-rejected)]"> *</span>}
      </label>
      {children}
      {error && <p className="text-xs text-[var(--bismo-status-rejected)]">{error}</p>}
    </div>
  );
}
