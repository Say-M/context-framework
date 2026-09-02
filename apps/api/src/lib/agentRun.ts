import { query, type CanUseTool, type McpServerConfig } from "@anthropic-ai/claude-agent-sdk";
import { publish } from "./socket";

const DEFAULT_MODEL = "claude-sonnet-5";
const MAX_TURNS = 60;
const TIMEOUT_MS = 10 * 60 * 1000;

export const BUILD_TOOLS = ["Read", "Write", "Edit", "Glob", "Grep"] as const;
export const READ_ONLY_TOOLS = ["Read", "Glob", "Grep"] as const;
// Plan mode explores like Ask, but needs Write/Edit available in its
// toolset for once a plan is approved, plus the built-in ExitPlanMode tool
// it uses to propose the plan — tools is an allow-list, so ExitPlanMode
// has to be listed explicitly or the model can't call it at all.
export const PLAN_TOOLS = [...BUILD_TOOLS, "ExitPlanMode"] as const;

const MUTATING_TOOLS = new Set(["Write", "Edit", "NotebookEdit"]);

function summarizeToolUse(name: string, input: unknown): string {
  const record = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const filePath = typeof record.file_path === "string" ? record.file_path : undefined;
  const pattern = typeof record.pattern === "string" ? record.pattern : undefined;
  const query = typeof record.query === "string" ? record.query : undefined;
  const url = typeof record.url === "string" ? record.url : undefined;
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
    case "WebSearch":
      return query ? `Searching the web for "${query}"` : "Searching the web";
    case "WebFetch":
      return url ? `Reading ${url}` : "Fetching a web page";
    default:
      return `Using ${name}`;
  }
}

export interface RunAgentQueryOptions {
  tools?: readonly string[];
  permissionMode?: "acceptEdits" | "plan";
  model?: string;
  /**
   * Custom in-process tools (e.g. from `createSdkMcpServer`) the model can
   * call in addition to `tools`. Each tool's fully-qualified name
   * (`mcp__<server>__<tool>`) still has to be listed in `tools` too, or the
   * model can't call it — same allow-list rule `ExitPlanMode` follows.
   */
  mcpServers?: Record<string, McpServerConfig>;
  /**
   * Tool names auto-allowed without a permission prompt. `permissionMode:
   * "acceptEdits"` only covers file-edit operations (Write/Edit/
   * NotebookEdit) — custom MCP tools are NOT auto-approved by it and need
   * to be listed here explicitly, or the model's tool call is silently
   * denied and it falls back to describing what it would have done in
   * plain text instead.
   */
  allowedTools?: readonly string[];
  /**
   * Only meaningful with permissionMode "plan". Called when the agent
   * proposes a plan via the built-in ExitPlanMode tool; resolve it with the
   * user's real decision. While this is pending, the hard timeout below is
   * disarmed — a human reading a plan shouldn't be racing the same clock
   * that bounds autonomous agent work.
   */
  onPlanReady?: (plan: string) => Promise<{ approved: boolean; feedback?: string }>;
}

/**
 * Runs one agent turn scoped to `dir`, streaming progress to the
 * `generatedAppId` room via `publish()`, and resolves to the agent's final
 * text on success. Throws on any failure — an agent-reported error, no
 * result at all, or the hard timeout — leaving it to the caller to decide
 * what "failed" means for its own record (the whole GeneratedApp for
 * initial generation, a single ChatMessage for a chat turn). Shared by
 * `generation.ts` (initial scaffold) and `chat.ts` (follow-up turns).
 * `tools`/`permissionMode` vary by caller: Build gets the full read/write
 * set with `acceptEdits`, Ask is restricted to `READ_ONLY_TOOLS`, Plan gets
 * `PLAN_TOOLS` with `permissionMode: "plan"` plus `onPlanReady`. `model`
 * defaults to `DEFAULT_MODEL` but callers can override it per call (e.g.
 * initial generation choosing a cheaper/faster model for a given run).
 * Also reused by `studioAgent.ts`'s chat turns via `mcpServers` — despite
 * the parameter name, `generatedAppId` is really just "the room id to
 * publish progress to," generic enough that Studio passes a `threadId`.
 */
export async function runAgentQuery(
  generatedAppId: string,
  dir: string,
  prompt: string,
  options: RunAgentQueryOptions = {},
): Promise<string> {
  const {
    tools = BUILD_TOOLS,
    permissionMode = "acceptEdits",
    model = DEFAULT_MODEL,
    mcpServers,
    allowedTools,
    onPlanReady,
  } = options;
  const abortController = new AbortController();

  // Two timers, armed/disarmed together: `timeout` asks the SDK to abort
  // gracefully at TIMEOUT_MS; `hardTimer` is the fallback that force-ends
  // the race below 5s later, since abortController alone isn't a hard
  // guarantee. Both are cleared while a plan-mode canUseTool pause is
  // awaiting a human decision, and re-armed with a fresh TIMEOUT_MS budget
  // once it resolves — `resolveTimedOut` stays the same function across
  // every arm/disarm cycle, so `timedOutPromise` itself never needs to be
  // recreated, just whether anything is still scheduled to call it.
  const timedOut = Symbol("timed-out");
  let resolveTimedOut!: (value: typeof timedOut) => void;
  const timedOutPromise = new Promise<typeof timedOut>((resolve) => {
    resolveTimedOut = resolve;
  });
  let timeout: ReturnType<typeof setTimeout> | undefined;
  let hardTimer: ReturnType<typeof setTimeout> | undefined;
  const armTimeout = () => {
    timeout = setTimeout(() => abortController.abort(), TIMEOUT_MS);
    hardTimer = setTimeout(() => resolveTimedOut(timedOut), TIMEOUT_MS + 5000);
  };
  const disarmTimeout = () => {
    clearTimeout(timeout);
    clearTimeout(hardTimer);
  };

  // Plan mode's own read-only-until-approved contract is enforced twice:
  // permissionMode "plan" itself, plus this explicit denial of any
  // mutating tool before onPlanReady has resolved approved — so
  // correctness here doesn't depend on exactly how the CLI enforces the
  // mode internally.
  let planApproved = false;
  const canUseTool: CanUseTool | undefined = onPlanReady
    ? async (toolName, input) => {
        if (toolName === "ExitPlanMode") {
          const plan = typeof input.plan === "string" ? input.plan : "";
          disarmTimeout();
          try {
            const decision = await onPlanReady(plan);
            if (decision.approved) {
              planApproved = true;
              return {
                behavior: "allow",
                updatedInput: input,
                updatedPermissions: [{ type: "setMode", mode: "acceptEdits", destination: "session" }],
              };
            }
            return {
              behavior: "deny",
              message: decision.feedback || "Plan rejected — please revise and propose again.",
            };
          } finally {
            armTimeout();
          }
        }
        if (!planApproved && MUTATING_TOOLS.has(toolName)) {
          return {
            behavior: "deny",
            message: "Still in planning mode — call ExitPlanMode with your plan before making changes.",
          };
        }
        return { behavior: "allow", updatedInput: input };
      }
    : undefined;

  const stream = query({
    prompt,
    options: {
      cwd: dir,
      tools: [...tools],
      permissionMode,
      model,
      maxTurns: MAX_TURNS,
      abortController,
      ...(canUseTool ? { canUseTool } : {}),
      ...(mcpServers ? { mcpServers } : {}),
      ...(allowedTools ? { allowedTools: [...allowedTools] } : {}),
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
            if (block.name === "ExitPlanMode") {
              const plan = typeof block.input === "object" && block.input && "plan" in block.input
                ? String((block.input as Record<string, unknown>).plan ?? "")
                : "";
              publish(generatedAppId, { type: "plan_proposed", plan });
            } else {
              publish(generatedAppId, {
                type: "tool_use",
                tool: block.name,
                summary: summarizeToolUse(block.name, block.input),
              });
            }
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

  armTimeout();
  let finalMessage: FinalMessage | null;
  try {
    finalMessage = await Promise.race([consume, timedOutPromise]).then((result) => {
      if (result === timedOut) {
        void stream.return?.(undefined).catch(() => {});
        throw new Error(`Generation timed out after ${TIMEOUT_MS / 60000} minutes.`);
      }
      return result;
    });
  } finally {
    disarmTimeout();
  }

  if (!finalMessage) {
    throw new Error("Generation ended without a result — the agent may have been interrupted.");
  }
  if (finalMessage.is_error) {
    throw new Error(finalMessage.text || `Generation failed (${finalMessage.subtype}).`);
  }
  return finalMessage.text ?? "";
}
