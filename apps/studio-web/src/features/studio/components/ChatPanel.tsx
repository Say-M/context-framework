import { useEffect, useRef, useState } from "react";
import { Loader2, Send, Telescope } from "lucide-react";
import { Button, Textarea, cn } from "@bismo/ui";
import type { StudioThread } from "@bismo/shared-schemas";
import { useSendStudioMessage, useStudioMessages, useStudioStream } from "../queries";
import { ChatMarkdown } from "./ChatMarkdown";
import { ArtifactCard } from "./ArtifactCard";

/**
 * Simplified relative to generated-apps' ChatPanel — no Build/Ask/Plan mode
 * switcher, since a Studio turn only ever has one shape (reply, or call a
 * tool to produce an artifact).
 */
export function ChatPanel({ threadId, status }: { threadId: string; status: StudioThread["status"] }) {
  const { data: messages, isLoading } = useStudioMessages(threadId);
  const progressLog = useStudioStream(threadId, status === "working");
  const sendMessage = useSendStudioMessage(threadId);
  const [draft, setDraft] = useState("");
  // Deep Research is an explicit user choice, not something the agent
  // should infer from wording — this stays on across sends (matching
  // Claude.ai/ChatGPT's own research toggles) until the user turns it off,
  // so a follow-up question in the same research thread doesn't need it
  // re-enabled every time.
  const [deepResearch, setDeepResearch] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages?.items.length, progressLog.length]);

  const canSend = status === "idle" && draft.trim().length > 0 && !sendMessage.isPending;

  const onSend = () => {
    if (!canSend) return;
    const content = draft.trim();
    setDraft("");
    sendMessage.mutate({ content, deepResearch });
  };

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-1 flex-col gap-3 overflow-y-auto rounded-md border border-[var(--bismo-border)] p-3">
        {isLoading && <p className="text-sm text-[var(--bismo-text-muted)]">Loading…</p>}
        {!isLoading && messages?.items.length === 0 && status === "idle" && (
          <p className="text-sm text-[var(--bismo-text-muted)]">
            Ask a question, or ask for a document, spreadsheet, slide deck, image, or deep-research report — a
            creation assistant that can handle the whole workflow.
          </p>
        )}
        {messages?.items.map((message) => (
          <div key={message.id} className={message.role === "user" ? "self-end text-right" : "self-start"}>
            <div
              className={
                message.role === "user"
                  ? "inline-block rounded-lg bg-[var(--bismo-accent-blueprint)] px-3 py-2 text-sm text-white"
                  : message.failed
                    ? "inline-block rounded-lg border border-[var(--bismo-status-rejected)]/40 bg-[var(--bismo-status-rejected)]/10 px-3 py-2 text-sm text-[var(--bismo-status-rejected)]"
                    : "inline-block rounded-lg border border-[var(--bismo-border)] px-3 py-2 text-sm text-[var(--bismo-text)]"
              }
            >
              {message.role === "user" && message.deepResearch && (
                <p className="mb-1 inline-flex items-center gap-1 text-xs font-medium text-white/80">
                  <Telescope size={11} strokeWidth={1.75} />
                  Deep research
                </p>
              )}
              <ChatMarkdown content={message.content} />
            </div>
            {message.artifactId && (
              <div className="mt-1.5 inline-block text-left">
                <ArtifactCard artifactId={message.artifactId} />
              </div>
            )}
          </div>
        ))}

        {status === "working" && (
          <div className="flex flex-col gap-1.5 self-start">
            <div className="flex items-center gap-2 text-sm text-[var(--bismo-text-muted)]">
              <Loader2 size={14} strokeWidth={2} className="animate-spin text-[var(--bismo-accent-blueprint)]" />
              Working…
            </div>
            {progressLog.map((event, index) =>
              event.type === "tool_use" ? (
                <p key={index} className="font-mono text-xs text-[var(--bismo-accent-blueprint)]">
                  {event.summary}
                </p>
              ) : event.type === "assistant_text" ? (
                <p key={index} className="whitespace-pre-wrap font-mono text-xs text-[var(--bismo-text-muted)]">
                  {event.text}
                </p>
              ) : null,
            )}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={() => setDeepResearch((v) => !v)}
          aria-pressed={deepResearch}
          className={cn(
            "inline-flex w-fit items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
            deepResearch
              ? "border-[var(--bismo-accent-blueprint)] bg-[var(--bismo-accent-blueprint)]/10 text-[var(--bismo-accent-blueprint)]"
              : "border-[var(--bismo-border)] text-[var(--bismo-text-muted)] hover:bg-[var(--bismo-bg-hover)]",
          )}
        >
          <Telescope size={13} strokeWidth={1.75} />
          Deep research
        </button>
        <div className="flex gap-2">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                onSend();
              }
            }}
            placeholder={
              status !== "idle"
                ? "Wait for the current turn to finish…"
                : deepResearch
                  ? "What should I research?"
                  : "Ask anything…"
            }
            disabled={status !== "idle"}
            className="min-h-0 flex-1"
          />
          <Button onClick={onSend} disabled={!canSend}>
            <Send size={14} strokeWidth={1.75} />
          </Button>
        </div>
      </div>
    </div>
  );
}
