import { Checkbox } from "./Checkbox";
import { cn } from "../lib/cn";

export interface PickerOption {
  id: string;
  label: string;
  sublabel?: string;
}

export interface MultiSelectPickerProps {
  title: string;
  options: PickerOption[];
  /** 'single' still renders checkbox-style rows, but selecting one clears any previous selection. */
  mode: "single" | "multiple";
  value: string[];
  onChange: (value: string[]) => void;
  emptyLabel?: string;
  accentColor?: string;
  className?: string;
}

export function MultiSelectPicker({
  title,
  options,
  mode,
  value,
  onChange,
  emptyLabel = "Nothing available yet.",
  accentColor = "var(--bismo-accent-blueprint)",
  className,
}: MultiSelectPickerProps) {
  const toggle = (id: string) => {
    if (mode === "single") {
      onChange(value.includes(id) ? [] : [id]);
      return;
    }
    onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);
  };

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[var(--bismo-text)]">{title}</h3>
        <span className="text-xs text-[var(--bismo-text-muted)]">
          {value.length} Selected
        </span>
      </div>
      <div className="flex max-h-72 flex-col gap-1 overflow-y-auto rounded-md border border-[var(--bismo-border)] p-1">
        {options.length === 0 && (
          <p className="p-3 text-xs text-[var(--bismo-text-muted)]">{emptyLabel}</p>
        )}
        {options.map((option) => {
          const checked = value.includes(option.id);
          const inputId = `msp-${title.replace(/\s+/g, "-")}-${option.id}`;
          return (
            <label
              key={option.id}
              htmlFor={inputId}
              className={cn(
                "flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-left text-sm transition-colors hover:bg-[var(--bismo-bg-hover)]",
                checked && "bg-[var(--bismo-bg-hover)]",
              )}
            >
              <Checkbox
                id={inputId}
                checked={checked}
                onCheckedChange={() => toggle(option.id)}
                accentColor={accentColor}
              />
              <span className="flex flex-col">
                <span className="text-[var(--bismo-text)]">{option.label}</span>
                {option.sublabel && (
                  <span className="text-xs text-[var(--bismo-text-muted)]">{option.sublabel}</span>
                )}
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
}
