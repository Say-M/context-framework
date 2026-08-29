import { WizardStepper } from "@bismo/ui";
import type { AppBlueprint } from "@bismo/shared-schemas";
import { useAppBlueprint } from "../queries";
import { BlueprintStudioProvider, useBlueprintStudio } from "../context/BlueprintStudioContext";
import { BlueprintStudioStep1 } from "./BlueprintStudioStep1";
import { BlueprintStudioStep2 } from "./BlueprintStudioStep2";
import { BlueprintStudioStep3 } from "./BlueprintStudioStep3";

const STEPS = [
  { label: "1. Module Connections" },
  { label: "2. 12 Blueprint Sections" },
  { label: "3. Review & Publish" },
];

export function BlueprintStudioWizard({
  draftId,
  onDraftCreated,
}: {
  draftId: string | null;
  onDraftCreated: (id: string) => void;
}) {
  return (
    <BlueprintStudioProvider initialStep={draftId ? 1 : 0}>
      <BlueprintStudioWizardInner draftId={draftId} onDraftCreated={onDraftCreated} />
    </BlueprintStudioProvider>
  );
}

function BlueprintStudioWizardInner({
  draftId,
  onDraftCreated,
}: {
  draftId: string | null;
  onDraftCreated: (id: string) => void;
}) {
  const { step, setStep } = useBlueprintStudio();
  const { data: blueprint, isLoading } = useAppBlueprint(draftId);

  const handleCreated = (created: AppBlueprint) => {
    onDraftCreated(created.id);
    setStep(1);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--bismo-text)]">Create Application Blueprint</h1>
          <p className="text-sm text-[var(--bismo-text-muted)]">Authoring & Interconnection Studio</p>
        </div>
        <WizardStepper steps={STEPS} activeIndex={step} />
      </div>

      {draftId && isLoading && <p className="text-sm text-[var(--bismo-text-muted)]">Loading draft…</p>}

      {step === 0 && (
        <BlueprintStudioStep1
          existing={blueprint ?? null}
          onCreated={handleCreated}
          onSaved={() => setStep(1)}
        />
      )}
      {step === 1 && blueprint && (
        <div className="flex flex-col gap-4">
          <BlueprintStudioStep2 blueprint={blueprint} />
          <div className="flex justify-between">
            <button
              type="button"
              onClick={() => setStep(0)}
              className="text-sm text-[var(--bismo-text-muted)] hover:underline"
            >
              ← Back to Module Connections
            </button>
            <button
              type="button"
              onClick={() => setStep(2)}
              className="text-sm font-medium text-[var(--bismo-accent-blueprint)] hover:underline"
            >
              Continue to Review & Publish →
            </button>
          </div>
        </div>
      )}
      {step === 2 && blueprint && (
        <div className="flex flex-col gap-4">
          <BlueprintStudioStep3 blueprint={blueprint} />
          <button
            type="button"
            onClick={() => setStep(1)}
            className="text-sm text-[var(--bismo-text-muted)] hover:underline"
          >
            ← Back to Sections Studio
          </button>
        </div>
      )}
    </div>
  );
}
