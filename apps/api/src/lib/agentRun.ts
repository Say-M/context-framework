import { query } from "@anthropic-ai/claude-agent-sdk";
import { publish } from "./socket";

const GENERATION_MODEL = "claude-sonnet-5";
const MAX_TURNS = 40;
const TIMEOUT_MS = 10 * 60 * 1000;

export const BUILD_TOOLS = ["Read", "Write", "Edit", "Glob", "Grep"] as const;
export const READ_ONLY_TOOLS = ["Read", "Glob", "Grep"] as const;

function summarizeToolUse(name: string, input: unknown): string {
  const record = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const filePath = typeof record.file_path === "string" ? record.file_path : undefined;
  const pattern = typeof record.pattern === "string" ? record.pattern : undefined;
  switch (name) {
    case "Write":
      return filePath ? `Writing ${filePath}` : "Writing a file";
    case "Edit":
      return filePath ? `Editing ${filePath}` : "Editing a file";
    case "Read":
      return filePath ? `Reading ${filePath}` : "Reading a file";
    case "Glob":
    case "Grep":
      return pattern ? `Searching for "${pattern}"` : `Using ${name}`;
    default:
      return `Using ${name}`;
  }
}

/**
 * Runs one agent turn scoped to `dir`, streaming progress to the
 * `generatedAppId` room via `publish()`, and resolves to the agent's final
 * text on success. Throws on any failure — an agent-reported error, no
 * result at all, or the hard timeout — leaving it to the caller to decide
 * what "failed" means for its own record (the whole GeneratedApp for
 * initial generation, a single ChatMessage for a chat turn). Shared by
 * `generation.ts` (initial scaffold) and `chat.ts` (follow-up turns) —
 * same permissionMode/model/timeout for both, since a chat turn is exactly
 * the same kind of agent work, just against an existing repo. `tools`
 * varies by caller: Build gets the full read/write set, Ask is restricted
 * to `READ_ONLY_TOOLS` so it structurally cannot touch a file no matter
 * what the prompt says.
 */
export async function runAgentQuery(
  generatedAppId: string,
  dir: string,
  prompt: string,
  tools: readonly string[] = BUILD_TOOLS,
): Promise<string> {
  const abortController = new AbortController();
  const stream = query({
    prompt,
    options: {
      cwd: dir,
      tools: [...tools],
      permissionMode: "acceptEdits",
      model: GENERATION_MODEL,
      maxTurns: MAX_TURNS,
      abortController,
    },
  });

  // abortController alone isn't a hard guarantee — it relies on the SDK's
  // subprocess noticing the signal, which it may not do if it's stuck
  // before ever spawning (a hung connection attempt, an internal retry
  // loop). Racing against a plain timer is what actually bounds this.
  type FinalMessage = { is_error: boolean; subtype: string; text: string | null };
  const consume = (async (): Promise<FinalMessage | null> => {
    let finalMessage: FinalMessage | null = null;
    for await (const message of stream) {
      if (message.type === "assistant") {
        for (const block of message.message.content) {
          if (block.type === "text" && block.text.trim()) {
            publish(generatedAppId, { type: "assistant_text", text: block.text });
          } else if (block.type === "tool_use") {
            publish(generatedAppId, {
              type: "tool_use",
              tool: block.name,
              summary: summarizeToolUse(block.name, block.input),
            });
          }
        }
      }
      if (message.type === "result") {
        finalMessage = {
          is_error: message.is_error,
          subtype: message.subtype,
          text: message.subtype === "success" ? message.result : null,
        };
      }
    }
    return finalMessage;
  })();
  // If the timeout wins the race below, `consume` is left running in the
  // background (there's no way to force-cancel an async generator that
  // ignores abort) — this stops it from surfacing as an unhandled
  // rejection whenever it eventually settles.
  consume.catch(() => {});

  const timedOut = Symbol("timed-out");
  const timeout = setTimeout(() => abortController.abort(), TIMEOUT_MS);
  let finalMessage: FinalMessage | null;
  try {
    finalMessage = await Promise.race([
      consume,
      new Promise<typeof timedOut>((resolve) => setTimeout(() => resolve(timedOut), TIMEOUT_MS + 5000)),
    ]).then((result) => {
      if (result === timedOut) {
        void stream.return?.(undefined).catch(() => {});
        throw new Error(`Generation timed out after ${TIMEOUT_MS / 60000} minutes.`);
      }
      return result;
    });
  } finally {
    clearTimeout(timeout);
  }

  if (!finalMessage) {
    throw new Error("Generation ended without a result — the agent may have been interrupted.");
  }
  if (finalMessage.is_error) {
    throw new Error(finalMessage.text || `Generation failed (${finalMessage.subtype}).`);
  }
  return finalMessage.text ?? "";
}
