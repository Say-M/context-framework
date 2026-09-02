import { useState } from "react";
import { createRoute, Link, useNavigate } from "@tanstack/react-router";
import { Button, Card, Select } from "@bismo/ui";
import { appLayoutRoute } from "../AppLayout";
import { useCatalogBlueprints } from "@/features/catalog/queries";
import { useCreateStudioThread, useStudioThreads } from "@/features/studio/queries";

const NO_BLUEPRINT = "__skip__";

function ThreadsPage() {
  const navigate = useNavigate();
  const { data: blueprints } = useCatalogBlueprints();
  const { data: threads, isLoading } = useStudioThreads();
  const createThread = useCreateStudioThread();
  const [blueprintChoice, setBlueprintChoice] = useState(NO_BLUEPRINT);

  const onStart = () => {
    const blueprintId = blueprintChoice === NO_BLUEPRINT ? undefined : blueprintChoice;
    createThread.mutate(
      { blueprintId },
      { onSuccess: (thread) => navigate({ to: "/threads/$id", params: { id: thread.id } }) },
    );
  };

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <p className="mb-1 text-sm font-semibold text-[var(--bismo-text)]">Start a new thread</p>
        <p className="mb-3 text-sm text-[var(--bismo-text-muted)]">
          Optionally ground it in an approved blueprint — your requests will use that business's real entities and
          policies instead of generic placeholders.
        </p>
        <div className="flex gap-2">
          <Select
            value={blueprintChoice}
            onValueChange={setBlueprintChoice}
            options={[
              { value: NO_BLUEPRINT, label: "No blueprint — skip" },
              ...(blueprints?.items.map((b) => ({ value: b.id, label: b.name })) ?? []),
            ]}
            className="max-w-sm"
          />
          <Button onClick={onStart} disabled={createThread.isPending}>
            {createThread.isPending ? "Starting…" : "Start"}
          </Button>
        </div>
      </Card>

      <div>
        <h2 className="mb-3 text-sm font-semibold text-[var(--bismo-text)]">Your threads</h2>
        {isLoading && <p className="text-sm text-[var(--bismo-text-muted)]">Loading…</p>}
        {!isLoading && threads?.items.length === 0 && (
          <p className="text-sm text-[var(--bismo-text-muted)]">Nothing yet — start your first thread above.</p>
        )}
        <div className="flex flex-col gap-2">
          {threads?.items.map((thread) => (
            <Link key={thread.id} to="/threads/$id" params={{ id: thread.id }}>
              <Card className="transition-colors hover:bg-[var(--bismo-bg-hover)]">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-[var(--bismo-text)]">{thread.title}</p>
                    {thread.blueprintName && (
                      <p className="text-xs text-[var(--bismo-text-muted)]">Grounded in {thread.blueprintName}</p>
                    )}
                  </div>
                  <span className="flex-shrink-0 text-xs text-[var(--bismo-text-muted)]">
                    {new Date(thread.updatedAt).toLocaleString()}
                  </span>
                </div>
              </Card>
            </Link>
          ))}
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
