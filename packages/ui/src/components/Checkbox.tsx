import { Checkbox as BaseCheckbox } from "@base-ui-components/react/checkbox";
import { Check } from "lucide-react";
import { cn } from "../lib/cn";

export interface CheckboxProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  id?: string;
  accentColor?: string;
  className?: string;
}

/** Thin styled wrapper over Base UI's Checkbox primitive. */
export function Checkbox({ checked, onCheckedChange, disabled, id, accentColor, className }: CheckboxProps) {
  return (
    <BaseCheckbox.Root
      id={id}
      checked={checked}
      onCheckedChange={onCheckedChange}
      disabled={disabled}
      className={cn(
        "flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border border-[var(--bismo-border)] outline-none transition-colors",
        "data-[checked]:border-transparent",
        "focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--bismo-bg-elevated)]",
        disabled && "opacity-50",
        className,
      )}
      style={{
        backgroundColor: checked ? (accentColor ?? "var(--bismo-accent-blueprint)") : undefined,
      }}
    >
      <BaseCheckbox.Indicator className="flex text-white" keepMounted={false}>
        <Check size={11} strokeWidth={2.5} />
      </BaseCheckbox.Indicator>
    </BaseCheckbox.Root>
  );
}
