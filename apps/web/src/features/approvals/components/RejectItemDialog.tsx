import { useState } from "react";
import { Button, Dialog, FormField, Textarea } from "@bismo/ui";

export function RejectItemDialog({
  open,
  onOpenChange,
  itemName,
  onConfirm,
  isPending,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemName: string;
  onConfirm: (reason: string) => void;
  isPending: boolean;
}) {
  const [reason, setReason] = useState("");

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Reject "${itemName}"`}
      description="This note is shown to the author so they can address it before resubmitting."
    >
      <div className="flex flex-col gap-4">
        <FormField label="Reason" htmlFor="reject-reason" required>
          <Textarea
            id="reject-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Explain what needs to change..."
          />
        </FormField>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={!reason.trim() || isPending}
            onClick={() => onConfirm(reason.trim())}
          >
            {isPending ? "Rejecting…" : "Reject"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
