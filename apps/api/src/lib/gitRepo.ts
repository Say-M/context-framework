import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { $ } from "bun";

export interface GitCommit {
  sha: string;
  shortSha: string;
  message: string;
  authorDate: string;
}

// \x1f (unit separator) can't appear in a commit subject, so it's a safe
// field delimiter for a one-line-per-commit `git log --format`.
const GIT_LOG_FORMAT = "%H%x1f%h%x1f%s%x1f%aI";

/**
 * Creates a plain (non-bare) git repo with a real working tree at `dir` and
 * makes one commit. Non-bare on purpose: later milestones need an agent to
 * read/write real files here directly, not just a bare object database.
 */
export async function initRepoWithCommit(
  dir: string,
  files: Record<string, string>,
  message: string,
) {
  await mkdir(dir, { recursive: true });
  for (const [relPath, content] of Object.entries(files)) {
    const filePath = path.join(dir, relPath);
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, content, "utf8");
  }

  await $`git init -b main`.cwd(dir).quiet();
  await $`git config user.name "BISMO Generator"`.cwd(dir).quiet();
  await $`git config user.email "generator@bismo.local"`.cwd(dir).quiet();
  await $`git add -A`.cwd(dir).quiet();
  await $`git commit -m ${message}`.cwd(dir).quiet();
}

export async function listCommits(dir: string): Promise<GitCommit[]> {
  const result = await $`git log --format=${GIT_LOG_FORMAT}`.cwd(dir).quiet();
  const text = result.stdout.toString().trim();
  if (!text) return [];
  return text.split("\n").map((line) => {
    const [sha = "", shortSha = "", message = "", authorDate = ""] = line.split("\x1f");
    return { sha, shortSha, message, authorDate };
  });
}

export async function archiveCommitToBuffer(dir: string, sha: string): Promise<Buffer> {
  // git resolves a relative -o path against its own cwd (== `dir`, set
  // below), not the caller's cwd — so this must be a bare filename, not
  // `path.join(dir, ...)`, or git ends up looking for `dir/dir/...`.
  const archiveName = `.archive-${sha}-${Date.now()}.zip`;
  const tmpFile = path.join(dir, archiveName);
  try {
    await $`git archive --format=zip -o ${archiveName} ${sha}`.cwd(dir).quiet();
    const bytes = await Bun.file(tmpFile).arrayBuffer();
    return Buffer.from(bytes);
  } finally {
    await rm(tmpFile, { force: true });
  }
}
