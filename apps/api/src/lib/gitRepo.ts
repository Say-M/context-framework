import { mkdir, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { $ } from "bun";
import { env } from "../config/env";

export interface GitCommit {
  sha: string;
  shortSha: string;
  message: string;
  authorDate: string;
}

/** Where a GeneratedApp's working tree lives on disk — shared by every module that touches it. */
export function repoDir(generatedAppId: string) {
  return path.join(env.GENERATED_APPS_DIR, generatedAppId);
}

// \x1f (unit separator) can't appear in a commit subject, so it's a safe
// field delimiter for a one-line-per-commit `git log --format`.
const GIT_LOG_FORMAT = "%H%x1f%h%x1f%s%x1f%aI";

/**
 * Commits whatever is currently on disk at `dir` — initializing a plain
 * (non-bare) git repo there first if one doesn't exist yet. Non-bare on
 * purpose: an agent needs to read/write real files here directly, not just a
 * bare object database. Reused by every commit-producing step (initial
 * generation, chat-driven edits) rather than each one writing files and
 * committing itself.
 *
 * A chat turn (unlike initial generation, where the directory starts empty)
 * may produce no file changes at all — returns `null` in that case instead
 * of throwing on git's "nothing to commit", so callers can tell "no new
 * version" apart from a real failure.
 */
export async function commitWorkingTree(dir: string, message: string): Promise<string | null> {
  await mkdir(dir, { recursive: true });

  if (!existsSync(path.join(dir, ".git"))) {
    await $`git init -b main`.cwd(dir).quiet();
    await $`git config user.name "BISMO Generator"`.cwd(dir).quiet();
    await $`git config user.email "generator@bismo.local"`.cwd(dir).quiet();
  }

  await $`git add -A`.cwd(dir).quiet();
  const diff = await $`git diff --cached --quiet`.cwd(dir).quiet().nothrow();
  if (diff.exitCode === 0) return null;

  await $`git commit -m ${message}`.cwd(dir).quiet();
  const rev = await $`git rev-parse HEAD`.cwd(dir).quiet();
  return rev.stdout.toString().trim();
}

export async function listCommits(dir: string): Promise<GitCommit[]> {
  // `git log` exits 128 on a freshly-`init`'d repo with no commits yet (e.g.
  // while the generating agent is still working on its first commit) — that's
  // "no versions yet", not a failure, so don't let it throw.
  const result = await $`git log --format=${GIT_LOG_FORMAT}`.cwd(dir).quiet().nothrow();
  if (result.exitCode !== 0) return [];
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
