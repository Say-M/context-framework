import type { ButtonHTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../lib/cn";

const buttonStyles = cva(
  "inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none",
  {
    variants: {
      variant: {
        primary: "bg-[var(--bismo-accent-domain)] text-white hover:opacity-90",
        secondary:
          "bg-[var(--bismo-bg-elevated)] text-[var(--bismo-text)] border border-[var(--bismo-border)] hover:bg-[var(--bismo-bg-hover)]",
        ghost: "text-[var(--bismo-text)] hover:bg-[var(--bismo-bg-hover)]",
        destructive: "bg-[var(--bismo-status-rejected)] text-white hover:opacity-90",
      },
      size: {
        sm: "h-8 px-3",
        md: "h-10 px-4",
        lg: "h-11 px-6",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonStyles> {}

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return <button className={cn(buttonStyles({ variant, size }), className)} {...props} />;
}
