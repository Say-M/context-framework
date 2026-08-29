import { cn } from "../lib/cn";

export interface WizardStep {
  label: string;
}

export interface WizardStepperProps {
  steps: WizardStep[];
  /** 0-based index of the currently active step. */
  activeIndex: number;
  className?: string;
}

export function WizardStepper({ steps, activeIndex, className }: WizardStepperProps) {
  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {steps.map((step, index) => {
        const isComplete = index < activeIndex;
        const isActive = index === activeIndex;
        return (
          <div key={step.label} className="flex items-center gap-2">
            <div
              className={cn(
                "flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                isActive && "bg-[var(--bismo-accent-blueprint)] text-white",
                isComplete && "text-[var(--bismo-status-approved)]",
                !isActive && !isComplete && "text-[var(--bismo-text-muted)]",
              )}
            >
              <span
                className={cn(
                  "flex h-5 w-5 items-center justify-center rounded-full border text-xs",
                  isActive && "border-white",
                  isComplete && "border-[var(--bismo-status-approved)]",
                  !isActive && !isComplete && "border-[var(--bismo-border)]",
                )}
              >
                {isComplete ? "✓" : index + 1}
              </span>
              {step.label}
            </div>
            {index < steps.length - 1 && (
              <span className="h-px w-6 bg-[var(--bismo-border)]" aria-hidden="true" />
            )}
          </div>
        );
      })}
    </div>
  );
}
