import type { ReactNode } from "react";
import { Menu as BaseMenu } from "@base-ui-components/react/menu";
import { cn } from "../lib/cn";

export interface DropdownMenuItem {
  label: string;
  icon?: ReactNode;
  onSelect: () => void;
  destructive?: boolean;
}

export interface DropdownMenuProps {
  trigger: ReactNode;
  items: (DropdownMenuItem | "separator")[];
  triggerClassName?: string;
  /** Stops the trigger's click from also bubbling to a parent row's onClick (e.g. a tree row's select handler). */
  stopTriggerPropagation?: boolean;
}

/** Thin styled wrapper over Base UI's Menu — a small "⋮" action menu, e.g. per file-tree row. */
export function DropdownMenu({ trigger, items, triggerClassName, stopTriggerPropagation }: DropdownMenuProps) {
  return (
    <BaseMenu.Root>
      <BaseMenu.Trigger
        className={cn(
          "flex h-6 w-6 flex-shrink-0 items-center justify-center rounded text-[var(--bismo-text-muted)] outline-none transition-colors hover:bg-[var(--bismo-bg-hover)] hover:text-[var(--bismo-text)] data-[popup-open]:bg-[var(--bismo-bg-hover)]",
          triggerClassName,
        )}
        onClick={stopTriggerPropagation ? (e) => e.stopPropagation() : undefined}
      >
        {trigger}
      </BaseMenu.Trigger>
      <BaseMenu.Portal>
        <BaseMenu.Positioner className="z-50" sideOffset={4} align="end">
          <BaseMenu.Popup className="min-w-[160px] rounded-md border border-[var(--bismo-border)] bg-[var(--bismo-bg-elevated)] p-1 shadow-xl outline-none">
            {items.map((item, index) =>
              item === "separator" ? (
                // eslint-disable-next-line react/no-array-index-key
                <BaseMenu.Separator key={index} className="my-1 h-px bg-[var(--bismo-border)]" />
              ) : (
                <BaseMenu.Item
                  key={item.label}
                  onClick={item.onSelect}
                  className={cn(
                    "flex cursor-pointer items-center gap-2 rounded px-2.5 py-1.5 text-sm outline-none",
                    "data-[highlighted]:bg-[var(--bismo-bg-hover)]",
                    item.destructive ? "text-[var(--bismo-status-rejected)]" : "text-[var(--bismo-text)]",
                  )}
                >
                  {item.icon}
                  {item.label}
                </BaseMenu.Item>
              ),
            )}
          </BaseMenu.Popup>
        </BaseMenu.Positioner>
      </BaseMenu.Portal>
    </BaseMenu.Root>
  );
}
