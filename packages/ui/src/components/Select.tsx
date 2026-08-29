import { Select as BaseSelect } from "@base-ui-components/react/select";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "../lib/cn";

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps {
  value: string;
  onValueChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  id?: string;
  className?: string;
}

/** Thin styled wrapper over Base UI's Select — a drop-in replacement for a native `<select>`. */
export function Select({ value, onValueChange, options, placeholder, disabled, id, className }: SelectProps) {
  return (
    <BaseSelect.Root
      value={value}
      onValueChange={(next) => onValueChange(next as string)}
      disabled={disabled}
      items={options}
    >
      <BaseSelect.Trigger
        id={id}
        className={cn(
          "flex w-full items-center justify-between gap-2 rounded-md border border-[var(--bismo-border)] bg-[var(--bismo-bg)] px-3 py-2 text-sm text-[var(--bismo-text)] outline-none transition-colors",
          "hover:bg-[var(--bismo-bg-hover)] focus-visible:ring-1 focus-visible:ring-[var(--bismo-accent-domain)]",
          "disabled:opacity-50",
          className,
        )}
      >
        <BaseSelect.Value>
          {(value: string) => options.find((o) => o.value === value)?.label ?? placeholder ?? ""}
        </BaseSelect.Value>
        <BaseSelect.Icon className="flex-shrink-0 text-[var(--bismo-text-muted)]">
          <ChevronsUpDown size={14} strokeWidth={1.75} />
        </BaseSelect.Icon>
      </BaseSelect.Trigger>
      <BaseSelect.Portal>
        <BaseSelect.Positioner className="z-50" sideOffset={4}>
          <BaseSelect.Popup className="max-h-72 min-w-[var(--anchor-width)] overflow-y-auto rounded-md border border-[var(--bismo-border)] bg-[var(--bismo-bg-elevated)] p-1 shadow-xl outline-none">
            {options.map((option) => (
              <BaseSelect.Item
                key={option.value}
                value={option.value}
                className={cn(
                  "flex cursor-pointer items-center justify-between gap-2 rounded px-2.5 py-1.5 text-sm text-[var(--bismo-text)] outline-none",
                  "data-[highlighted]:bg-[var(--bismo-bg-hover)]",
                )}
              >
                <BaseSelect.ItemText>{option.label}</BaseSelect.ItemText>
                <BaseSelect.ItemIndicator className="flex text-[var(--bismo-accent-domain)]">
                  <Check size={13} strokeWidth={2} />
                </BaseSelect.ItemIndicator>
              </BaseSelect.Item>
            ))}
          </BaseSelect.Popup>
        </BaseSelect.Positioner>
      </BaseSelect.Portal>
    </BaseSelect.Root>
  );
}
