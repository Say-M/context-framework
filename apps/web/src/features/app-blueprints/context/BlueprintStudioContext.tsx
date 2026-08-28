import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

interface BlueprintStudioContextValue {
  step: number;
  setStep: (step: number) => void;
  /** The spec currently open in the Step 2 file browser — ephemeral, not server state. */
  selectedFileId: string | null;
  setSelectedFileId: (id: string | null) => void;
}

const BlueprintStudioContext = createContext<BlueprintStudioContextValue | null>(null);

export function BlueprintStudioProvider({
  children,
  initialStep = 0,
}: {
  children: ReactNode;
  initialStep?: number;
}) {
  const [step, setStep] = useState(initialStep);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);

  const value = useMemo(
    () => ({ step, setStep, selectedFileId, setSelectedFileId }),
    [step, selectedFileId],
  );

  return <BlueprintStudioContext.Provider value={value}>{children}</BlueprintStudioContext.Provider>;
}

export function useBlueprintStudio() {
  const ctx = useContext(BlueprintStudioContext);
  if (!ctx) throw new Error("useBlueprintStudio must be used within BlueprintStudioProvider");
  return ctx;
}
