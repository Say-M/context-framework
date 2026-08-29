import { useEffect, useRef, useState } from "react";
import { Loader2, Send } from "lucide-react";
import { Button, Textarea, cn } from "@bismo/ui";
import type { ChatMode, GeneratedApp } from "@bismo/shared-schemas";
import { useChatMessages, useGenerationStream, useSendChatMessage } from "../queries";

const MODES: { value: ChatMode; label: string }[] = [
  { value: "build", label: "Build" },
  { value: "ask", label: "Ask" },
];

export function ChatPanel({ generatedAppId, status }: { generatedAppId: string; status: GeneratedApp["status"] }) {
  const { data: messages, isLoading } = useChatMessages(generatedAppId);
  const progressLog = useGenerationStream(generatedAppId, status === "working");
  const sendMessage = useSendChatMessage(generatedAppId);
  const [draft, setDraft] = useState("");
  const [mode, setMode] = useState<ChatMode>("build");

  const bottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages?.items.length, progressLog.length]);

  const canSend = status === "idle" && draft.trim().length > 0 && !sendMessage.isPending;

  const onSend = () => {
    if (!canSend) return;
    const content = draft.trim();
    setDraft("");
    sendMessage.mutate({ content, mode });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex max-h-[28rem] min-h-[12rem] flex-col gap-3 overflow-y-auto rounded-md border border-[var(--bismo-border)] p-3">
        {isLoading && <p className="text-sm text-[var(--bismo-text-muted)]">Loading…</p>}
        {!isLoading && messages?.items.length === 0 && status === "idle" && (
          <p className="text-sm text-[var(--bismo-text-muted)]">
            Build mode makes changes and creates a new version. Ask mode just answers — it never touches a file.
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
              <p className="whitespace-pre-wrap">{message.content}</p>
            </div>
            {(message.mode === "ask" || message.commitSha) && (
              <p className="mt-1 font-mono text-xs text-[var(--bismo-text-muted)]">
                {message.mode === "ask" && "Ask"}
                {message.mode === "ask" && message.commitSha && " · "}
                {message.commitSha && `→ new version ${message.commitSha.slice(0, 7)}`}
              </p>
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

      <div className="flex items-center gap-1 self-start rounded-md border border-[var(--bismo-border)] p-0.5">
        {MODES.map((m) => (
          <button
            key={m.value}
            type="button"
            onClick={() => setMode(m.value)}
            className={cn(
              "rounded px-2.5 py-1 text-xs font-medium",
              mode === m.value
                ? "bg-[var(--bismo-accent-blueprint)] text-white"
                : "text-[var(--bismo-text-muted)] hover:text-[var(--bismo-text)]",
            )}
          >
            {m.label}
          </button>
        ))}
      </div>

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
              : mode === "ask"
                ? "Ask a question about this app…"
                : "Ask for a change…"
          }
          disabled={status !== "idle"}
          className="min-h-0 flex-1"
        />
        <Button onClick={onSend} disabled={!canSend}>
          <Send size={14} strokeWidth={1.75} />
        </Button>
      </div>
    </div>
  );
}
