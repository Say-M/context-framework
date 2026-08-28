import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { cn } from "../lib/cn";

const fieldStyles =
  "w-full rounded-md border border-[var(--bismo-border)] bg-[var(--bismo-bg)] px-3 py-2 text-sm text-[var(--bismo-text)] placeholder:text-[var(--bismo-text-muted)] outline-none focus:ring-1 focus:ring-[var(--bismo-accent-domain)]";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input ref={ref} className={cn(fieldStyles, className)} {...props} />
  ),
);
Input.displayName = "Input";

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea ref={ref} className={cn(fieldStyles, "min-h-24 resize-y", className)} {...props} />
));
Textarea.displayName = "Textarea";
