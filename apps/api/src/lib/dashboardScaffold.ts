import { cp, readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { randomBytes } from "node:crypto";
import path from "node:path";

const TEMPLATE_DIR = path.join(import.meta.dir, "..", "generatedAppDashboard");
const SECRET_KEY = "DASHBOARD_SESSION_SECRET";
const MOUNT_IMPORT = 'import { mountDashboard } from "./dashboard/server";';
const MOUNT_CALL = "mountDashboard(app);";

async function ensureEnvSecret(backendDir: string): Promise<void> {
  const envPath = path.join(backendDir, ".env");
  const envExamplePath = path.join(backendDir, ".env.example");

  const existing = existsSync(envPath) ? await readFile(envPath, "utf-8") : "";
  if (!existing.includes(`${SECRET_KEY}=`)) {
    const secret = randomBytes(32).toString("base64");
    const withNewline = existing.length > 0 && !existing.endsWith("\n") ? `${existing}\n` : existing;
    await writeFile(envPath, `${withNewline}${SECRET_KEY}=${secret}\n`);
  }

  const existingExample = existsSync(envExamplePath) ? await readFile(envExamplePath, "utf-8") : "";
  if (!existingExample.includes(`${SECRET_KEY}=`)) {
    const withNewline = existingExample.length > 0 && !existingExample.endsWith("\n") ? `${existingExample}\n` : existingExample;
    await writeFile(envExamplePath, `${withNewline}${SECRET_KEY}=\n`);
  }
}

async function ensureGitignore(backendDir: string): Promise<void> {
  const gitignorePath = path.join(backendDir, ".gitignore");
  const existing = existsSync(gitignorePath) ? await readFile(gitignorePath, "utf-8") : "";
  const missing = ["dashboard.db", "dashboard.db-*"].filter(
    (line) => !existing.split("\n").some((l) => l.trim() === line),
  );
  if (missing.length === 0) return;
  const withNewline = existing.length > 0 && !existing.endsWith("\n") ? `${existing}\n` : existing;
  await writeFile(gitignorePath, `${withNewline}${missing.join("\n")}\n`);
}

/**
 * Idempotently wires `mountDashboard(app)` into the generated backend's
 * entry point — inserted by this pipeline, never by the agent. Best-effort:
 * if `index.ts` doesn't match the `const app = new Hono()` /
 * `export default {` shape every real generation has produced so far, this
 * logs a warning and skips rather than failing the whole generation —
 * mounting the dashboard is additive, never a hard requirement.
 */
async function patchIndexTs(backendDir: string, generatedAppId: string): Promise<void> {
  const indexPath = path.join(backendDir, "src", "index.ts");
  if (!existsSync(indexPath)) {
    console.warn(`[dashboardScaffold] ${generatedAppId}: backend/src/index.ts not found, skipping mount patch`);
    return;
  }

  let content = await readFile(indexPath, "utf-8");
  if (content.includes("./dashboard/server")) return; // already wired

  if (!/const\s+app\s*=\s*new\s+Hono/.test(content)) {
    console.warn(`[dashboardScaffold] ${generatedAppId}: no "const app = new Hono()" found, skipping mount patch`);
    return;
  }

  const exportAnchor = content.lastIndexOf("export default {");
  if (exportAnchor === -1) {
    console.warn(`[dashboardScaffold] ${generatedAppId}: no "export default {" found, skipping mount patch`);
    return;
  }

  content = `${MOUNT_IMPORT}\n${content}`;
  const patchedAnchor = content.lastIndexOf("export default {");
  content = `${content.slice(0, patchedAnchor)}${MOUNT_CALL}\n\n${content.slice(patchedAnchor)}`;

  await writeFile(indexPath, content);
}

/** Copies the vendored dashboard template and wires it into a generated repo. See lib/generation.ts and lib/chat.ts for call sites. */
export async function injectDashboard(dir: string, generatedAppId: string): Promise<void> {
  const backendDir = path.join(dir, "backend");
  if (!existsSync(backendDir)) return; // nothing to inject into yet

  const destDir = path.join(backendDir, "src", "dashboard");
  await mkdir(destDir, { recursive: true });
  await cp(TEMPLATE_DIR, destDir, { recursive: true });

  await ensureEnvSecret(backendDir);
  await ensureGitignore(backendDir);
  await patchIndexTs(backendDir, generatedAppId);
}
