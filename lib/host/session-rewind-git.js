// packages/host/src/session-rewind-git.ts
import { execFile } from "node:child_process";
import { copyFile, lstat, mkdir, readdir, rmdir, unlink } from "node:fs/promises";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { randomUUID } from "node:crypto";
var MAX_OUTPUT = 32 * 1024 * 1024;
var GIT_TIMEOUT_MS = 3e4;
var GitExit = class extends Error {
  constructor(code, stdout, stderr) {
    super(`git failed: ${stderr.toString("utf8").trim() || stdout.toString("utf8").trim()}`);
    this.code = code;
  }
  code;
};
function baseEnv() {
  return {
    ...process.env,
    GIT_CONFIG_COUNT: "0",
    GIT_TERMINAL_PROMPT: "0",
    GIT_OPTIONAL_LOCKS: "0",
    LC_ALL: "C"
  };
}
function git(args, cwd, env = {}) {
  return new Promise((settle, reject) => {
    execFile("git", [...args], {
      cwd,
      env: { ...baseEnv(), ...env },
      encoding: "buffer",
      maxBuffer: MAX_OUTPUT,
      timeout: GIT_TIMEOUT_MS,
      windowsHide: true
    }, (error, stdout, stderr) => {
      const out = Buffer.isBuffer(stdout) ? stdout : Buffer.from(String(stdout));
      const err = Buffer.isBuffer(stderr) ? stderr : Buffer.from(String(stderr));
      if (error !== null) {
        reject(new GitExit(error.code, out, err));
        return;
      }
      settle({ stdout: out, stderr: err });
    });
  });
}
async function text(args, cwd, env = {}) {
  return (await git(args, cwd, env)).stdout.toString("utf8").trim();
}
function missing(error) {
  return error?.code === "ENOENT";
}
async function locateGit(cwd, storage) {
  let found;
  try {
    found = await text(["rev-parse", "--show-toplevel", "--absolute-git-dir", "--git-path", "objects"], cwd);
  } catch (error) {
    if (error instanceof GitExit && /not a git repository/i.test(error.message)) return null;
    throw error;
  }
  const lines = found.split("\n").map((line) => resolve(cwd, line));
  if (lines.length !== 3) throw new Error(`git rev-parse returned ${lines.length} paths`);
  const [root, gitDir, repositoryObjects] = lines;
  const objects = join(storage, "objects");
  await mkdir(objects, { recursive: true, mode: 448 });
  return {
    root,
    gitDir,
    repositoryObjects,
    objects,
    env: {
      GIT_OBJECT_DIRECTORY: objects,
      GIT_ALTERNATE_OBJECT_DIRECTORIES: repositoryObjects
    }
  };
}
function indexPath(storage) {
  return join(storage, "indexes", `${process.pid}-${randomUUID()}.index`);
}
async function dropFile(path) {
  try {
    await unlink(path);
  } catch (error) {
    if (!missing(error)) throw error;
  }
}
async function snapshotTree(workspace, storage) {
  const index = indexPath(storage);
  await mkdir(dirname(index), { recursive: true, mode: 448 });
  try {
    try {
      await copyFile(join(workspace.gitDir, "index"), index);
    } catch (error) {
      if (!missing(error)) throw error;
    }
    const env = { ...workspace.env, GIT_INDEX_FILE: index };
    const storageRelative = relative(workspace.root, storage);
    const excluded = storageRelative !== "" && !isAbsolute(storageRelative) && !storageRelative.startsWith(".." + sep) ? ["--", ".", `:(exclude)${storageRelative.split(sep).join("/")}`] : [];
    await text(["-c", "core.autocrlf=false", "add", "--all", "--ignore-errors", ...excluded], workspace.root, env);
    return await text(["write-tree"], workspace.root, env);
  } finally {
    await dropFile(index);
    await dropFile(index + ".lock");
  }
}
function nullPaths(bytes) {
  return bytes.toString("utf8").split("\0").filter((path) => path !== "");
}
async function treePaths(workspace, tree) {
  const result = await git(["ls-tree", "-r", "-z", "--name-only", tree], workspace.root, workspace.env);
  return new Set(nullPaths(result.stdout));
}
async function diffTrees(workspace, before, after) {
  if (before === after) return [];
  const result = await git(["diff-tree", "-r", "--name-status", "-z", before, after], workspace.root, workspace.env);
  const fields = nullPaths(result.stdout);
  const files = [];
  for (let index = 0; index < fields.length; ) {
    const status = fields[index++] ?? "";
    if (status.startsWith("R") || status.startsWith("C")) {
      const from = fields[index++];
      const to = fields[index++];
      if (from !== void 0) files.push({ path: from, status: "deleted" });
      if (to !== void 0) files.push({ path: to, status: "added" });
      continue;
    }
    const path = fields[index++];
    if (path === void 0) break;
    files.push({ path, status: status === "A" ? "deleted" : status === "D" ? "added" : "modified" });
  }
  return files;
}
async function removeEmptyParents(root, path) {
  let current = dirname(path);
  while (current !== root && current.startsWith(root + sep)) {
    try {
      await rmdir(current);
    } catch (error) {
      const code = error.code;
      if (code === "ENOTEMPTY" || code === "EEXIST") break;
      if (code !== "ENOENT") throw error;
    }
    current = dirname(current);
  }
}
async function removeSnapshotPath(root, slashPath) {
  const absolute = resolve(root, ...slashPath.split("/"));
  if (absolute !== root && !absolute.startsWith(root + sep)) throw new Error(`snapshot path escapes repository: ${slashPath}`);
  try {
    const info = await lstat(absolute);
    if (info.isDirectory() && !info.isSymbolicLink()) {
      if ((await readdir(absolute)).length > 0) throw new Error(`refusing to replace non-empty directory ${slashPath}`);
      await rmdir(absolute);
    } else {
      await unlink(absolute);
    }
    await removeEmptyParents(root, absolute);
  } catch (error) {
    if (!missing(error)) throw error;
  }
}
async function applyTree(workspace, storage, target, reference) {
  const [wanted, current] = await Promise.all([
    treePaths(workspace, target),
    treePaths(workspace, reference)
  ]);
  for (const path of current) if (!wanted.has(path)) await removeSnapshotPath(workspace.root, path);
  const index = indexPath(storage);
  await mkdir(dirname(index), { recursive: true, mode: 448 });
  try {
    const env = { ...workspace.env, GIT_INDEX_FILE: index, GIT_WORK_TREE: workspace.root };
    await text(["read-tree", target], workspace.root, env);
    await text(["-c", "core.autocrlf=false", "checkout-index", "--all", "--force"], workspace.root, env);
  } finally {
    await dropFile(index);
    await dropFile(index + ".lock");
  }
}
export {
  applyTree,
  diffTrees,
  locateGit,
  snapshotTree,
  treePaths
};
