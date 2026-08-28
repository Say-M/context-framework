import { Button } from "./Button";
import { Dialog } from "./Dialog";

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  isPending?: boolean;
  destructive?: boolean;
  onConfirm: () => void;
}

/** Generic Yes/No confirmation — used for delete actions across all 4 modules. */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  isPending = false,
  destructive = true,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={title} description={description}>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button
          type="button"
          variant={destructive ? "destructive" : "primary"}
          disabled={isPending}
          onClick={onConfirm}
        >
          {isPending ? "Working…" : confirmLabel}
        </Button>
      </div>
    </Dialog>
  );
}
