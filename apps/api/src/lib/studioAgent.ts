import { mkdir } from "node:fs/promises";
import path from "node:path";
import {
  StudioMessageModel,
  StudioThreadModel,
  type StudioMessageDocument,
} from "@bismo/db-models";
import { env } from "../config/env";
import { buildBlueprintBundle } from "../modules/generated-apps/service";
import { publish } from "./socket";
import { runAgentQuery } from "./agentRun";
import { buildStudioMcpServer, STUDIO_TOOL_NAMES } from "./studioTools";

const HISTORY_LIMIT = 20;

// The Studio agent has no filesystem tools — only the custom mcp__studio__*
// tools in studioTools.ts — so this cwd is never actually read from or
// written to. The SDK still needs a real, existing directory to spawn its
// subprocess in, so this is one shared scratch dir rather than a bogus
// path, mirroring how GENERATED_APPS_DIR is a real managed directory.
const STUDIO_SCRATCH_DIR = path.join(path.dirname(env.GENERATED_APPS_DIR), "studio-scratch");

// The custom mcp__studio__* tools plus the two built-ins deep research
// needs — WebSearch to find sources, WebFetch to read a specific page in
// full. Both granted and auto-allowed outright, same reasoning as the
// custom tools below: Studio has no human canUseTool gate.
const STUDIO_ALL_TOOLS = [...STUDIO_TOOL_NAMES, "WebSearch", "WebFetch"] as const;

async function buildStudioPrompt(
  blueprintId: string | null,
  history: StudioMessageDocument[],
  newMessage: string,
  deepResearch: boolean,
): Promise<string> {
  const historyBlock = history
    .map((msg) => `${msg.role === "user" ? "User" : "Assistant"}: ${msg.content}`)
    .join("\n\n");

  let contextBlock = "";
  if (blueprintId) {
    const { blueprint, specs } = await buildBlueprintBundle(blueprintId);
    const specBlocks = specs
      .map((spec) => {
        const section = spec.section ?? "overview";
        return `### [${section}] ${spec.frontmatter.type}: ${spec.title}\n\n${spec.content || "(no content)"}`;
      })
      .join("\n\n---\n\n");
    contextBlock = `\n# Business context\nThis conversation is grounded in the "${blueprint.name}" blueprint. Use its real entities, policies, and domain language below wherever relevant instead of generic placeholders.\n\n${specBlocks || "(no specifications found)"}\n`;
  }

  // Deep Research is a toggle in ChatPanel, not something the model infers
  // from wording — when it's on, the user has explicitly asked for a
  // researched, sourced report, so this overrides the normal
  // "use your judgment" tool guidance for just this turn.
  const deepResearchBlock = deepResearch
    ? `\n# Deep Research mode is ON for this message\nThe user explicitly enabled Deep Research before sending this. Research it thoroughly regardless of whether you already know the answer: use WebSearch (multiple queries as needed) and WebFetch to read the most relevant pages, then call deliver_research_report once with the finished report and the real sources you found. Do not reply with plain text or a different tool for this turn.\n`
    : "";

  return `You are a helpful creation assistant. Reply conversationally for questions and small talk. When the request calls for a real deliverable, use the matching tool to produce it — don't force a tool call just to have used one. Use create_doc for prose (reports, memos, letters); use create_spreadsheet for tabular/numeric content (budgets, trackers, any data that belongs in rows and columns) — prefer a real spreadsheet with working formulas (e.g. "=SUM(B2:B5)") over pre-computed numbers wherever a formula is the more natural way to express it; use create_slides for presentations/pitch decks — one slide per major point, each picking the closest matching layout template rather than cramming everything into one slide (the tool description lists the available layouts and their content fields); use generate_image for a picture, poster, illustration, or banner — describe it visually (subject, style, composition, colors), don't just repeat the user's request verbatim as the prompt; use deliver_research_report for questions that need current, real-world information you should verify on the web (market data, recent events, competitor research, "what does X company do") — search with WebSearch, read the most relevant pages with WebFetch, then call deliver_research_report once with the finished report and the real sources you found. Don't use deliver_research_report for things you already know confidently — that's a plain reply or create_doc. Every one of these tools takes a "description" argument shown on the artifact's card in chat — write a real one-sentence summary of what's actually in it, not a restatement of the title.
${contextBlock}${deepResearchBlock}
# Conversation so far
${historyBlock || "(this is the first message)"}

# New request from the user
${newMessage}
`;
}

/**
 * A failed Studio turn never fails the thread itself — same reasoning as
 * generated-apps chat (lib/chat.ts): earlier artifacts in this thread are
 * still perfectly usable, so `status` always returns to "idle" here. The
 * failure is recorded on this one message instead.
 */
async function markStudioTurnFailed(threadId: string, message: string) {
  console.error(`[studio] ${threadId} turn failed: ${message}`);
  await StudioMessageModel.create({
    threadId,
    role: "assistant",
    content: message.slice(0, 2000),
    failed: true,
  });
  await StudioThreadModel.updateOne({ _id: threadId }, { $set: { status: "idle" } });
  publish(threadId, { type: "done", status: "idle", lastError: null });
}

export async function runStudioTurn(
  threadId: string,
  userMessageId: string,
  content: string,
  deepResearch = false,
) {
  const thread = await StudioThreadModel.findById(threadId);
  if (!thread) return;

  try {
    const history = await StudioMessageModel.find({ threadId, _id: { $ne: userMessageId } })
      .sort({ createdAt: -1 })
      .limit(HISTORY_LIMIT);
    history.reverse();

    const prompt = await buildStudioPrompt(
      thread.blueprintId ? String(thread.blueprintId) : null,
      history,
      content,
      deepResearch,
    );

    let createdArtifactId: string | null = null;
    const studioServer = buildStudioMcpServer({
      threadId,
      createdBy: String(thread.createdBy),
      onArtifactReady: (id) => {
        createdArtifactId = id;
      },
    });

    await mkdir(STUDIO_SCRATCH_DIR, { recursive: true });
    const text = await runAgentQuery(threadId, STUDIO_SCRATCH_DIR, prompt, {
      tools: STUDIO_ALL_TOOLS,
      // Studio's tools are fully vetted, in-process handlers we wrote
      // ourselves (see studioTools.ts) — unlike Build/Ask/Plan's file
      // access, there's nothing here that needs a human or canUseTool
      // gate, so every Studio tool is auto-allowed outright.
      allowedTools: STUDIO_ALL_TOOLS,
      mcpServers: { studio: studioServer },
    });

    await StudioMessageModel.create({
      threadId,
      role: "assistant",
      content: text || (createdArtifactId ? "Done." : "I'm not sure how to help with that."),
      artifactId: createdArtifactId,
    });

    await StudioThreadModel.updateOne({ _id: threadId }, { $set: { status: "idle" } });
    publish(threadId, { type: "done", status: "idle", lastError: null });
  } catch (err) {
    await markStudioTurnFailed(threadId, err instanceof Error ? err.message : String(err));
  }
}
