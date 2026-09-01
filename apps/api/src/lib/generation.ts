import { mkdir } from "node:fs/promises";
import { GeneratedAppModel, type AppBlueprintDocument, type SpecificationDocument } from "@bismo/db-models";
import type { DatabaseChoice } from "@bismo/shared-schemas";
import { commitWorkingTree, repoDir } from "./gitRepo";
import { buildBlueprintBundle } from "../modules/generated-apps/service";
import { publish } from "./socket";
import { runAgentQuery } from "./agentRun";
import { injectDashboard } from "./dashboardScaffold";

function buildGenerationPrompt(
  blueprint: AppBlueprintDocument,
  specs: SpecificationDocument[],
  choices: { database: DatabaseChoice; frontendFramework: string; userPrompt: string },
): string {
  const specBlocks = specs
    .map((spec) => {
      const section = spec.section ?? "overview";
      return `### [${section}] ${spec.frontmatter.type}: ${spec.title}\n\n${spec.content || "(no content)"}`;
    })
    .join("\n\n---\n\n");

  return `You are scaffolding the initial version of a real application from a set of business specifications. Work only inside the current directory — it is empty.

# Application
Name: ${blueprint.name}
Description: ${blueprint.description || "(none provided)"}

# Required stack (fixed — do not substitute anything)
- Backend: Bun + Hono
- ORM: Prisma, targeting ${choices.database === "mongodb" ? "MongoDB" : "PostgreSQL"}
- Frontend: ${choices.frontendFramework}

# Your task
Produce a buildable initial scaffold of this application based on the specifications below:
- A Prisma schema modeling every "Entity" spec as a model.
- Hono routes providing basic CRUD for each entity. Mount each entity's router at \`/api/<path>\`, where \`<path>\` is the model name kebab-cased and then suffixed with "s" unless it already ends in one (e.g. \`FiscalPeriod\` → \`/api/fiscal-periods\`, \`Address\` → \`/api/address\`) — mechanical, not grammatical, so it stays unambiguous. This exact convention is required, not just a suggestion: a separately-injected admin dashboard derives each entity's API path from its Prisma model name using this same rule, and depends on the two never disagreeing.
- A minimal frontend with list/detail pages for each entity, wired to the backend via the frontend's data-fetching layer.
- A README explaining what was generated and its current limitations.
- Valid package.json/tsconfig files for both backend and frontend so the result is structurally buildable.

"Workflow", "Business Rule", and "AI Agent" specs describe behavior beyond basic CRUD — approximate them reasonably (e.g. a comment, a stub function, a simplified check) rather than fully implementing them. This is an initial scaffold; the user will keep refining it afterward.
${
  choices.userPrompt
    ? `\n# Additional instructions from the requester\nThese come directly from the person who requested this app — follow them alongside the specifications above, and where they conflict, prefer these instructions:\n\n${choices.userPrompt}\n`
    : ""
}
# Constraints
- You have Read, Write, Edit, Glob, and Grep tools only — no shell access. You cannot run \`bun install\`, \`prisma generate\`, or any other command. Do not assume dependencies are installed.
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
      frontendFramework: doc.frontendFramework,
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
