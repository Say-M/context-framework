import type { ReactNode } from "react";
import { Dialog as BaseDialog } from "@base-ui-components/react/dialog";
import { cn } from "../lib/cn";

export interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}

/** Thin styled wrapper over Base UI's unstyled Dialog primitives. */
export function Dialog({ open, onOpenChange, title, description, children, className }: DialogProps) {
  return (
    <BaseDialog.Root open={open} onOpenChange={onOpenChange}>
      <BaseDialog.Portal>
        <BaseDialog.Backdrop className="fixed inset-0 z-40 bg-black/60 data-[state=open]:animate-in data-[state=open]:fade-in" />
        <BaseDialog.Popup
          className={cn(
            "fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-lg border border-[var(--bismo-border)] bg-[var(--bismo-bg-elevated)] p-6 shadow-xl outline-none",
            className,
          )}
        >
          <BaseDialog.Title className="text-lg font-semibold text-[var(--bismo-text)]">
            {title}
          </BaseDialog.Title>
          {description && (
            <BaseDialog.Description className="mt-1 text-sm text-[var(--bismo-text-muted)]">
              {description}
            </BaseDialog.Description>
          )}
          <div className="mt-4">{children}</div>
        </BaseDialog.Popup>
      </BaseDialog.Portal>
    </BaseDialog.Root>
  );
}

export const DialogClose = BaseDialog.Close;
