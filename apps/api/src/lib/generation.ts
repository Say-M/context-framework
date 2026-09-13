import { mkdir } from "node:fs/promises";
import { GeneratedAppModel, type AppBlueprintDocument, type SpecificationDocument } from "@bismo/db-models";
import type { DatabaseChoice, OutputTarget } from "@bismo/shared-schemas";
import { commitWorkingTree, repoDir } from "./gitRepo";
import { buildBlueprintBundle } from "../modules/generated-apps/service";
import { publish } from "./socket";
import { runAgentQuery } from "./agentRun";
import { injectDashboard } from "./dashboardScaffold";

function buildGenerationPrompt(
  blueprint: AppBlueprintDocument,
  specs: SpecificationDocument[],
  choices: { database: DatabaseChoice; outputTargets: OutputTarget[]; userPrompt: string },
): string {
  const specBlocks = specs
    .map((spec) => {
      const section = spec.section ?? "overview";
      return `### [${section}] ${spec.frontmatter.type}: ${spec.title}\n\n${spec.content || "(no content)"}`;
    })
    .join("\n\n---\n\n");

  const withAgents = choices.outputTargets.includes("agent");
  const targetsLabel = choices.outputTargets.map((t) => (t === "api" ? "backend APIs" : "Google ADK agents")).join(" + ");

  return `You are scaffolding the initial version of a real backend from a set of business specifications. Work only inside the current directory — it is empty.

# Application
Name: ${blueprint.name}
Description: ${blueprint.description || "(none provided)"}

# What this run produces
Output targets: ${targetsLabel}. There is no frontend in scope, ever — the customer brings their own
frontend (built with Lovable, their own developers, or an existing platform) and integrates with what
you build here purely through the HTTP API (and, if agents are in scope, the agent interact endpoint)
documented in API.md. Do not create a \`frontend/\` directory or any UI code.

Put everything under a \`backend/\` subdirectory, not the repo root — package.json, tsconfig.json, the
Prisma schema, src/, all of it. This is required, not stylistic: a separately-injected admin dashboard
looks for your code at exactly \`backend/src/...\` and silently skips itself if it isn't there.

# Required stack (fixed — do not substitute anything)
- Backend: Bun + Hono
- ORM: Prisma, targeting ${choices.database === "mongodb" ? "MongoDB" : "PostgreSQL"}
- Validation: Zod for request/response validation
${withAgents ? "- Agents: Google ADK (`@google/adk`) for every \"AI Agent\" spec — see \"Building agents\" below.\n" : ""}
# Your task
Produce a buildable initial scaffold of this backend based on the specifications below:
- A Prisma schema modeling every "Entity" spec (data_model section) as a model.
- Hono routes providing basic CRUD for each entity. Mount each entity's router at \`/api/<path>\`, where \`<path>\` is the model name kebab-cased and then suffixed with "s" unless it already ends in one (e.g. \`FiscalPeriod\` → \`/api/fiscal-periods\`, \`Address\` → \`/api/address\`) — mechanical, not grammatical, so it stays unambiguous. This exact convention is required, not just a suggestion: the separately-injected admin dashboard derives each entity's API path from its Prisma model name using this same rule (see its already-built \`GET /__dashboard/api/schema\`, which parses your \`schema.prisma\` directly) and depends on the two never disagreeing. Response bodies must follow this exact shape so the dashboard can render them generically: list → \`{ "items": [...] }\`, get/create/update → \`{ "item": {...} }\`, delete → \`{ "ok": true }\`.
- An \`AuditLog\` Prisma model, and every write (create/update/delete on any entity route${withAgents ? ", and every agent tool call that writes" : ""}) inserts a row into it. Expose it read-only at \`GET /api/logs\`, returning \`{ "items": [{ "id": string, "time": string, "severity": "Info"|"Success"|"Warning"|"Error", "source": string, "message": string, "requestId": string }] }\` — map your \`AuditLog\` model's own columns to exactly these field names in the handler, regardless of what you named them internally. The injected dashboard's Logs section depends on this exact response shape.
${
  withAgents
    ? `- For every "AI Agent" spec, a real Google ADK agent (not a stub). Expose \`GET /api/agents\` returning \`{ "items": [{ "id": string, "name": string, "description": string }] }\`, and \`POST /api/agents/:agentId/interact\` accepting \`{ "message": string }\` and returning \`{ "message": string, "data"?: unknown }\`. See "Building agents" below.\n`
    : ""
}- "Screen", "Form", and "Report" specs describe UI that is out of scope for this run — instead of building it, document the intended request/response shape for each in \`API.md\` so an external frontend developer knows what to build against.
- "Permission" specs → a route-level auth middleware stub. "State" specs → a status enum on the relevant Prisma model. "Notification" and "Integration" specs → a stub service class. "Workflow" and "Business Rule" specs describe behavior beyond basic CRUD — approximate them reasonably (e.g. a comment, a stub function, a simplified check) rather than fully implementing them. This is an initial scaffold; the user will keep refining it afterward.
- \`API.md\` documenting every implemented route${withAgents ? " and every agent's interact endpoint" : ""}, each with an example request and response — this is what the customer's own frontend integrates against, so it must be accurate to what you actually built, not aspirational.
- A README explaining what was generated, its current limitations, and how to run it.
- Valid package.json/tsconfig for the backend so the result is structurally buildable.
- \`.env.example\` with everything needed to run it${withAgents ? ", including \`LLM_PROVIDER\`, \`LLM_MODEL\`, and a placeholder for whichever provider's API key \`LLM_PROVIDER\` implies (e.g. \`GOOGLE_API_KEY\`, \`OPENAI_API_KEY\`, \`ANTHROPIC_API_KEY\`) — never a real key, just the placeholder names. The customer supplies their own real key after generation; you never see or need one." : "."}
${
  withAgents
    ? `
## Building agents
Install the SDK yourself: \`bun add @google/adk\`. A minimal agent (confirmed against the package's public docs) looks like this:

\`\`\`ts
import { LlmAgent } from "@google/adk";

export const someAgent = new LlmAgent({
  name: "some_agent",
  description: "...",
  model: process.env.LLM_MODEL ?? "gemini-flash-latest",
  instruction: "...",
  tools: [/* Zod-typed function tools */],
});
\`\`\`

Public documentation for \`@google/adk\` is thin beyond this — treat \`node_modules/@google/adk\`'s shipped \`.d.ts\` files as the source of truth for anything else you need (the exact Runner/session API to invoke an agent from a Hono route, how to define a tool function, multi-agent composition, etc.) rather than guessing, since this must actually compile. Every tool an agent uses must go through the same Prisma Client as the plain CRUD routes — never hand the agent a raw database connection — and every tool call that writes data must insert an \`AuditLog\` row, exactly like the plain CRUD routes do.
`
    : ""
}
This is a non-interactive, one-shot run — there is no one available to answer questions or clarify anything, now or later. If a specification is thin, vague, or incomplete (e.g. a placeholder like "Fields..." with no real detail), do not stop to ask about it or explain what's missing: fill the gap with a reasonable, clearly-labeled assumption (e.g. a comment noting it's a placeholder) and keep going. Ending your turn without having written any files is only acceptable if the task is genuinely impossible, never because the input was imperfect — a rough scaffold the user can correct beats no scaffold at all.
${
  choices.userPrompt
    ? `\n# Additional instructions from the requester\nThese come directly from the person who requested this app — follow them alongside the specifications above, and where they conflict, prefer these instructions:\n\n${choices.userPrompt}\n`
    : ""
}
# Constraints
- You have Read, Write, Edit, Glob, Grep, and Bash — but Bash only runs a fixed set of commands: \`cd <subdir>\`/\`cd ..\`, \`bun install\`, \`bunx prisma generate\`${withAgents ? ", `bun add @google/adk`" : ""}. Anything else (including chaining with \`;\`, \`&&\`, \`|\`, backticks, or \`$()\`) is denied — don't waste turns trying other commands.
- Do not initialize a git repository or attempt to commit — that happens outside your control after you finish.
- Stay inside the current directory.

# Specifications (${specs.length} total)

${specBlocks || "(no specifications were found — use your judgement for a minimal, reasonable starting scaffold)"}
`;
}

async function markFailed(generatedAppId: string, message: string) {
  console.error(`[generation] ${generatedAppId} failed: ${message}`);
  const lastError = message.slice(0, 2000);
  await GeneratedAppModel.updateOne({ _id: generatedAppId }, { $set: { status: "failed", lastError } });
  publish(generatedAppId, { type: "done", status: "failed", lastError });
}

/**
 * Runs the agentic generator for `generatedAppId` and always resolves the
 * doc to a terminal status ("idle" or "failed") — never leaves it stuck on
 * "working", even if the agent itself throws or times out.
 */
export async function runGeneration(generatedAppId: string) {
  const doc = await GeneratedAppModel.findById(generatedAppId);
  if (!doc) return;

  try {
    const { blueprint, specs } = await buildBlueprintBundle(String(doc.blueprintId));
    const dir = repoDir(generatedAppId);
    await mkdir(dir, { recursive: true });

    const prompt = buildGenerationPrompt(blueprint, specs, {
      database: doc.database,
      outputTargets: doc.outputTargets as OutputTarget[],
      userPrompt: doc.initialPrompt,
    });

    await runAgentQuery(generatedAppId, dir, prompt, { model: "claude-haiku-4-5-20251001" });
    // Additive, never a hard requirement — a real generation failure would
    // be far more disruptive than a missing dashboard, so this is only
    // ever logged, never allowed to fail the whole run.
    await injectDashboard(dir, generatedAppId).catch((err) => {
      console.error(`[dashboardScaffold] ${generatedAppId}: injection failed:`, err);
    });
    await commitWorkingTree(dir, "Initial generation");

    await GeneratedAppModel.updateOne(
      { _id: generatedAppId },
      { $set: { status: "idle", lastError: null } },
    );
    publish(generatedAppId, { type: "done", status: "idle", lastError: null });
  } catch (err) {
    await markFailed(generatedAppId, err instanceof Error ? err.message : String(err));
  }
}
