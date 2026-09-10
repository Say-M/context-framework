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
- UI components: shadcn/ui (latest — "new-york" style, Tailwind CSS v4, Radix UI primitives, lucide-react icons). Every screen must be built from shadcn/ui components, not bare unstyled HTML.

# Your task
Produce a buildable initial scaffold of this application based on the specifications below:
- A Prisma schema modeling every "Entity" spec as a model.
- Hono routes providing basic CRUD for each entity. Mount each entity's router at \`/api/<path>\`, where \`<path>\` is the model name kebab-cased and then suffixed with "s" unless it already ends in one (e.g. \`FiscalPeriod\` → \`/api/fiscal-periods\`, \`Address\` → \`/api/address\`) — mechanical, not grammatical, so it stays unambiguous. This exact convention is required, not just a suggestion: a separately-injected admin dashboard derives each entity's API path from its Prisma model name using this same rule, and depends on the two never disagreeing.
- A minimal frontend with list/detail pages for each entity, wired to the backend via the frontend's data-fetching layer, built with shadcn/ui components (Table or Card for lists, Dialog or Sheet for create/edit forms, Button/Input/Label/Select/Badge for form controls, Sonner for toasts) — not raw \`<table>\`/\`<div>\`/\`<button>\` markup.
- A README explaining what was generated and its current limitations.
- Valid package.json/tsconfig files for both backend and frontend so the result is structurally buildable.

## Setting up shadcn/ui
You have Bash, but only for a fixed set of setup commands (see Constraints) — enough to run the real shadcn/ui CLI instead of hand-authoring what it would generate:
1. Hand-write the frontend's base Vite+React skeleton yourself first (package.json with react/react-dom/vite declared, vite.config.ts, tsconfig.json, index.html, src/main.tsx) — \`create-vite\` itself isn't on the allow-list, so this part is still Write/Edit.
2. From inside \`frontend/\`, run \`bunx shadcn@latest init --yes --defaults --css-variables\` to wire up Tailwind v4 and the "new-york" theme for real.
3. From inside \`frontend/\`, run \`bunx shadcn@latest add <component> --yes --overwrite\` for exactly the primitives you use (at minimum button, input, label, card, table, dialog, badge) — one \`add\` call can take multiple component names.
4. Run \`bun install\` in both \`backend/\` and \`frontend/\` once their package.json files are complete, so dependencies are actually resolved, not just declared.
Don't hand-write files these commands would have produced — let the CLI generate them for real. Only fall back to hand-authoring a component if a command genuinely fails after a reasonable retry.

"Workflow", "Business Rule", and "AI Agent" specs describe behavior beyond basic CRUD — approximate them reasonably (e.g. a comment, a stub function, a simplified check) rather than fully implementing them. This is an initial scaffold; the user will keep refining it afterward.

This is a non-interactive, one-shot run — there is no one available to answer questions or clarify anything, now or later. If a specification is thin, vague, or incomplete (e.g. a placeholder like "Fields..." with no real detail), do not stop to ask about it or explain what's missing: fill the gap with a reasonable, clearly-labeled assumption (e.g. a comment noting it's a placeholder) and keep going. Ending your turn without having written any files is only acceptable if the task is genuinely impossible, never because the input was imperfect — a rough scaffold the user can correct beats no scaffold at all.
${
  choices.userPrompt
    ? `\n# Additional instructions from the requester\nThese come directly from the person who requested this app — follow them alongside the specifications above, and where they conflict, prefer these instructions:\n\n${choices.userPrompt}\n`
    : ""
}
# Constraints
- You have Read, Write, Edit, Glob, Grep, and Bash — but Bash only runs a fixed set of commands: \`cd <subdir>\`/\`cd ..\`, \`bun install\`, \`bunx prisma generate\`, and \`bunx/npx shadcn@latest init\`/\`add\`. Anything else (including chaining with \`;\`, \`&&\`, \`|\`, backticks, or \`$()\`) is denied — don't waste turns trying other commands.
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
