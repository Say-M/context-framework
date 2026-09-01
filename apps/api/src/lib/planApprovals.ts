// In-memory registry pairing a Plan-mode turn's paused agent (waiting
// inside canUseTool) with the API route that eventually delivers the
// user's decision. Same single-process/lost-on-restart tradeoff as the
// `backlogs` Map in socket.ts — acceptable here because decidePlan()
// self-heals: a resolveApproval() that finds nothing pending (e.g. the
// dev server's --watch restarted mid-review) resets the app back to idle
// instead of leaving the UI stuck.
export type PlanDecision = { approved: boolean; feedback?: string };

const EXPIRY_MS = 30 * 60 * 1000;

const pending = new Map<string, { resolve: (decision: PlanDecision) => void }>();

export function hasPendingApproval(generatedAppId: string): boolean {
  return pending.has(generatedAppId);
}

/**
 * Registers a pending approval and returns a promise that resolves once
 * `resolveApproval` is called for the same id. Auto-resolves as rejected
 * after EXPIRY_MS so an abandoned browser tab can't leave the agent paused
 * forever.
 */
export function awaitApproval(generatedAppId: string): Promise<PlanDecision> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      pending.delete(generatedAppId);
      resolve({ approved: false, feedback: "No response was received in time — the plan expired." });
    }, EXPIRY_MS);

    pending.set(generatedAppId, {
      resolve: (decision) => {
        clearTimeout(timer);
        pending.delete(generatedAppId);
        resolve(decision);
      },
    });
  });
}

/** Returns false if nothing was pending for this id (caller should self-heal). */
export function resolveApproval(generatedAppId: string, decision: PlanDecision): boolean {
  const entry = pending.get(generatedAppId);
  if (!entry) return false;
  entry.resolve(decision);
  return true;
}
