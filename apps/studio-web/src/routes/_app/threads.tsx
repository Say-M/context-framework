import { useState } from "react";
import { createRoute, useNavigate } from "@tanstack/react-router";
import { Send, Sparkles } from "lucide-react";
import { Button, Select, Textarea } from "@bismo/ui";
import type { StudioMessage } from "@bismo/shared-schemas";
import { appLayoutRoute } from "../AppLayout";
import { apiRequest } from "@/lib/api-client";
import { useCatalogBlueprints } from "@/features/catalog/queries";
import { useCreateStudioThread } from "@/features/studio/queries";

const NO_BLUEPRINT = "__skip__";

const SUGGESTIONS = [
  "Build a 12-month startup budget spreadsheet",
  "Create a 10-slide pitch deck for a fictional app",
  "Design a poster for a product launch event",
  "Deep research the state of solid-state batteries",
];

/**
 * The empty-state landing composer — the thread list moved to AppLayout's
 * sidebar, so this page's only job now is starting a new one. Submitting
 * creates the thread and sends the typed message in one action (create,
 * then a direct POST to that thread's /messages — not the
 * useSendStudioMessage hook, since that hook binds to a thread id at hook
 * creation time and no id exists yet here) rather than today's two-step
 * "click Start, then type in chat".
 */
function ThreadsPage() {
  const navigate = useNavigate();
  const { data: blueprints } = useCatalogBlueprints();
  const createThread = useCreateStudioThread();
  const [blueprintChoice, setBlueprintChoice] = useState(NO_BLUEPRINT);
  const [draft, setDraft] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const canSend = draft.trim().length > 0 && !submitting;

  const onSend = async () => {
    if (!canSend) return;
    const content = draft.trim();
    setSubmitting(true);
    try {
      const blueprintId = blueprintChoice === NO_BLUEPRINT ? undefined : blueprintChoice;
      const thread = await createThread.mutateAsync({ blueprintId });
      await apiRequest<StudioMessage>(`/api/v1/studio/threads/${thread.id}/messages`, {
        method: "POST",
        body: JSON.stringify({ content }),
      });
      navigate({ to: "/threads/$id", params: { id: thread.id } });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-1 flex-col items-center justify-center gap-6 p-8">
        <div className="flex flex-col items-center gap-2 text-center">
          <Sparkles size={28} strokeWidth={1.5} className="text-[var(--bismo-accent-blueprint)]" />
          <h1 className="text-2xl font-bold text-[var(--bismo-text)]">What should we build today?</h1>
          <p className="max-w-md text-sm text-[var(--bismo-text-muted)]">
            Chat normally, or ask for a document, spreadsheet, slide deck, image, or deep research report — Studio
            turns it into an editable artifact.
          </p>
        </div>

        <div className="grid w-full max-w-2xl grid-cols-1 gap-2.5 sm:grid-cols-2">
          {SUGGESTIONS.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => setDraft(suggestion)}
              className="rounded-lg border border-[var(--bismo-border)] bg-[var(--bismo-bg-elevated)] px-4 py-3 text-left text-sm text-[var(--bismo-text)] hover:bg-[var(--bismo-bg-hover)]"
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-shrink-0 p-4 sm:px-8 sm:pb-8">
        <div className="mx-auto flex max-w-2xl flex-col gap-2">
          <div className="flex justify-end">
            <Select
              value={blueprintChoice}
              onValueChange={setBlueprintChoice}
              options={[
                { value: NO_BLUEPRINT, label: "No blueprint — skip" },
                ...(blueprints?.items.map((b) => ({ value: b.id, label: b.name })) ?? []),
              ]}
              className="w-56"
            />
          </div>
          <div className="flex gap-2">
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void onSend();
                }
              }}
              placeholder="Ask anything — docs, sheets, slides, images, or deep research…"
              className="min-h-0 flex-1"
            />
            <Button onClick={() => void onSend()} disabled={!canSend}>
              {submitting ? "Starting…" : <Send size={14} strokeWidth={1.75} />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export const threadsRoute = createRoute({
  path: "/",
  getParentRoute: () => appLayoutRoute,
  component: ThreadsPage,
});
