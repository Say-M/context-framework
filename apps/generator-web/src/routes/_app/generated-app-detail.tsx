import { useEffect, useRef, useState } from "react";
import { createRoute, useNavigate } from "@tanstack/react-router";
import { Loader2, Trash2 } from "lucide-react";
import { Button, ConfirmDialog, cn } from "@bismo/ui";
import { appLayoutRoute } from "../AppLayout";
import { ChatPanel } from "@/features/generated-apps/components/ChatPanel";
import {
  downloadGeneratedAppVersion,
  useDeleteGeneratedApp,
  useGeneratedApp,
  useGeneratedAppVersions,
  useGenerationStream,
} from "@/features/generated-apps/queries";

type Tab = "versions" | "chat";

function GeneratedAppDetailPage() {
  const { id } = generatedAppDetailRoute.useParams();
  const navigate = useNavigate();
  const { data: app, isLoading: isLoadingApp } = useGeneratedApp(id);
  const { data: versions, isLoading: isLoadingVersions } = useGeneratedAppVersions(id, app?.status);
  const progressLog = useGenerationStream(id, app?.status === "working" || app?.status === "awaiting_approval");
  const deleteGeneratedApp = useDeleteGeneratedApp();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [tab, setTab] = useState<Tab>("versions");

  const logEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ block: "end" });
  }, [progressLog.length]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-[var(--bismo-text)]">
            {app?.blueprintName ?? "Version History"}
          </h1>
          <p className="text-sm text-[var(--bismo-text-muted)]">
            Every version is a git commit — download any of them as a zip.
          </p>
        </div>
        {app && app.status !== "working" && app.status !== "awaiting_approval" && (
          <Button variant="secondary" size="sm" onClick={() => setConfirmingDelete(true)}>
            <Trash2 size={14} strokeWidth={1.75} />
            Delete
          </Button>
        )}
      </div>

      {isLoadingApp && <p className="text-sm text-[var(--bismo-text-muted)]">Loading…</p>}

      {app?.initialPrompt && (
        <div className="rounded-md border border-[var(--bismo-border)] p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--bismo-text-muted)]">
            Your instructions
          </p>
          <p className="mt-1 whitespace-pre-wrap text-sm text-[var(--bismo-text)]">{app.initialPrompt}</p>
        </div>
      )}

      {app && (
        <div className="flex gap-1 border-b border-[var(--bismo-border)]">
          {(["versions", "chat"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={cn(
                "-mb-px border-b-2 px-3 py-2 text-sm font-medium capitalize",
                tab === t
                  ? "border-[var(--bismo-accent-blueprint)] text-[var(--bismo-text)]"
                  : "border-transparent text-[var(--bismo-text-muted)] hover:text-[var(--bismo-text)]",
              )}
            >
              {t === "versions" ? "Versions" : "Chat"}
            </button>
          ))}
        </div>
      )}

      {tab === "versions" && (
        <>
          {(app?.status === "working" || app?.status === "awaiting_approval") && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3 rounded-md border border-[var(--bismo-border)] p-4">
                <Loader2 size={18} strokeWidth={2} className="animate-spin text-[var(--bismo-accent-blueprint)]" />
                <p className="text-sm text-[var(--bismo-text)]">
                  {app.status === "awaiting_approval"
                    ? "Waiting for your review — check the Chat tab to approve or request changes."
                    : "Generating your application… this can take a few minutes."}
                </p>
              </div>
              <div className="max-h-80 overflow-y-auto rounded-md border border-[var(--bismo-border)] bg-[var(--bismo-bg)] p-3 font-mono text-xs">
                {progressLog.length === 0 && (
                  <p className="text-[var(--bismo-text-muted)]">Waiting for the agent to start…</p>
                )}
                {progressLog.map((event, index) =>
                  event.type === "tool_use" ? (
                    <p key={index} className="text-[var(--bismo-accent-blueprint)]">
                      {event.summary}
                    </p>
                  ) : event.type === "assistant_text" ? (
                    <p key={index} className="whitespace-pre-wrap text-[var(--bismo-text-muted)]">
                      {event.text}
                    </p>
                  ) : null,
                )}
                <div ref={logEndRef} />
              </div>
            </div>
          )}

          {app?.status === "failed" && (
            <div className="rounded-md border border-[var(--bismo-status-rejected)]/40 bg-[var(--bismo-status-rejected)]/10 p-4">
              <p className="text-sm font-medium text-[var(--bismo-status-rejected)]">Generation failed</p>
              <p className="mt-1 text-sm text-[var(--bismo-text-muted)]">
                {app.lastError ?? "No further detail was reported."}
              </p>
            </div>
          )}

          {app?.status === "idle" && (
            <div className="flex flex-col gap-2">
              {isLoadingVersions && <p className="text-sm text-[var(--bismo-text-muted)]">Loading versions…</p>}
              {versions?.items.map((version) => (
                <div
                  key={version.sha}
                  className="flex items-center justify-between gap-3 rounded-md border border-[var(--bismo-border)] p-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm text-[var(--bismo-text)]">{version.message}</p>
                    <p className="font-mono text-xs text-[var(--bismo-text-muted)]">
                      {version.shortSha} · {new Date(version.authorDate).toLocaleString()}
                    </p>
                  </div>
                  <Button variant="secondary" size="sm" onClick={() => downloadGeneratedAppVersion(id, version.sha)}>
                    Download
                  </Button>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {tab === "chat" && app && (
        <ChatPanel generatedAppId={id} status={app.status} pendingPlan={app.pendingPlan} />
      )}

      <ConfirmDialog
        open={confirmingDelete}
        onOpenChange={setConfirmingDelete}
        title="Delete this app?"
        description="This permanently deletes it and every version of it. This can't be undone."
        confirmLabel="Delete"
        isPending={deleteGeneratedApp.isPending}
        onConfirm={() => {
          deleteGeneratedApp.mutate(id, { onSuccess: () => navigate({ to: "/my-apps" }) });
        }}
      />
    </div>
  );
}

export const generatedAppDetailRoute = createRoute({
  path: "/my-apps/$id",
  getParentRoute: () => appLayoutRoute,
  component: GeneratedAppDetailPage,
});
