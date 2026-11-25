// packages/host/src/session-rewind-git.ts
import { spawn, spawnSync } from "node:child_process";
import { copyFile, lstat, mkdir, readdir, rmdir, unlink } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { randomUUID } from "node:crypto";
var MAX_OUTPUT = 32 * 1024 * 1024;
var GIT_TIMEOUT_MS = 3e4;
var KILL_SETTLE_MS = 2e3;
var STAT_BATCH_SIZE = 32;
var EMPTY_TREE_HASH = "4b825dc642cb6eb9a060e54bf8d69288fbee4904";
var REWIND_IGNORE_FILE = ".dsh-rewind-ignore";
var DEFAULT_MAX_FILE_BYTES = 16 * 1024 * 1024;
var DEFAULT_MAX_DIRTY_FILES = 1e4;
var DEFAULT_MAX_SNAPSHOT_BYTES = 128 * 1024 * 1024;
var GitExit = class extends Error {
  constructor(code, stdout, stderr, detail) {
    const output = stderr.toString("utf8").trim() || stdout.toString("utf8").trim();
    super("git failed: " + (detail ?? (output || "unknown error")));
    this.code = code;
  }
  code;
};
var activeChildren = /* @__PURE__ */ new Set();
var exitHookInstalled = false;
function killTreeSync(pid) {
  if (!Number.isSafeInteger(pid) || pid <= 0) return;
  if (process.platform === "win32") {
    try {
      spawnSync("taskkill", ["/PID", String(pid), "/T", "/F"], { windowsHide: true, stdio: "ignore", timeout: 5e3 });
    } catch {
    }
    return;
  }
  try {
    process.kill(-pid, "SIGKILL");
  } catch {
    try {
      process.kill(pid, "SIGKILL");
    } catch {
    }
  }
}
function ensureExitHook() {
  if (exitHookInstalled) return;
  exitHookInstalled = true;
  process.on("exit", () => {
    for (const child of activeChildren) {
      if (typeof child.pid === "number") killTreeSync(child.pid);
    }
    activeChildren.clear();
  });
}
function killTreeAsync(child) {
  const pid = child.pid;
  if (typeof pid !== "number" || pid <= 0) return Promise.resolve();
  if (process.platform === "win32") {
    return new Promise((done) => {
      const killer = spawn("taskkill", ["/PID", String(pid), "/T", "/F"], {
        windowsHide: true,
        stdio: "ignore"
      });
      const fallback = setTimeout(() => {
        try {
          child.kill("SIGKILL");
        } catch {
        }
        done();
      }, KILL_SETTLE_MS);
      killer.once("error", () => {
        clearTimeout(fallback);
        try {
          child.kill("SIGKILL");
        } catch {
        }
        done();
      });
      killer.once("close", () => {
        clearTimeout(fallback);
        done();
      });
    });
  }
  try {
    process.kill(-pid, "SIGKILL");
  } catch {
    try {
      child.kill("SIGKILL");
    } catch {
    }
  }
  return Promise.resolve();
}
function baseEnv() {
  return {
    ...process.env,
    GIT_CONFIG_COUNT: "0",
    GIT_TERMINAL_PROMPT: "0",
    GIT_OPTIONAL_LOCKS: "0",
    LC_ALL: "C"
  };
}
function samePath(left, right) {
  const a = resolve(left);
  const b = resolve(right);
  return process.platform === "win32" ? a.toLowerCase() === b.toLowerCase() : a === b;
}
function missing(error) {
  return error?.code === "ENOENT";
}
function runGit(args, cwd, env = {}, options = {}) {
  const { input, signal, timeoutMs = GIT_TIMEOUT_MS } = options;
  if (signal?.aborted) {
    return Promise.reject(new GitExit("ABORT_ERR", Buffer.alloc(0), Buffer.alloc(0), "aborted"));
  }
  ensureExitHook();
  return new Promise((settle, reject) => {
    const child = spawn("git", [...args], {
      cwd,
      env: { ...baseEnv(), ...env },
      stdio: [input !== void 0 ? "pipe" : "ignore", "pipe", "pipe"],
      windowsHide: true,
      detached: process.platform !== "win32"
    });
    activeChildren.add(child);
    const outChunks = [];
    const errChunks = [];
    let outBytes = 0;
    let errBytes = 0;
    let settled = false;
    let terminatedReason;
    let terminating = false;
    const cleanup = () => {
      clearTimeout(timer);
      if (signal !== void 0) signal.removeEventListener("abort", onAbort);
      activeChildren.delete(child);
    };
    const finish = (error) => {
      if (settled) return;
      settled = true;
      cleanup();
      if (error !== null) reject(error);
      else settle({ stdout: Buffer.concat(outChunks), stderr: Buffer.concat(errChunks) });
    };
    const terminate = (reason) => {
      if (terminating || settled) return;
      terminating = true;
      terminatedReason = reason;
      void killTreeAsync(child).then(() => {
        const guard = setTimeout(() => {
          finish(new GitExit("ETIMEDOUT", Buffer.concat(outChunks), Buffer.concat(errChunks), terminatedReason));
        }, KILL_SETTLE_MS);
        guard.unref?.();
      });
    };
    const onAbort = () => terminate("aborted");
    if (signal !== void 0) signal.addEventListener("abort", onAbort, { once: true });
    const timer = setTimeout(() => terminate("timed out after " + String(timeoutMs) + "ms"), timeoutMs);
    timer.unref?.();
    child.stdout?.on("data", (chunk) => {
      outBytes += chunk.length;
      if (outBytes > MAX_OUTPUT) {
        terminate("stdout exceeded buffer limit");
        return;
      }
      outChunks.push(chunk);
    });
    child.stderr?.on("data", (chunk) => {
      errBytes += chunk.length;
      if (errBytes > MAX_OUTPUT) {
        terminate("stderr exceeded buffer limit");
        return;
      }
      errChunks.push(chunk);
    });
    if (input !== void 0 && child.stdin !== null) {
      child.stdin.on("error", () => {
      });
      child.stdin.end(input);
    }
    child.once("error", (error) => {
      finish(new GitExit(error.code, Buffer.concat(outChunks), Buffer.concat(errChunks), error.message));
    });
    child.once("close", (code, sig) => {
      const stdout = Buffer.concat(outChunks);
      const stderr = Buffer.concat(errChunks);
      if (terminatedReason !== void 0) {
        finish(new GitExit(sig ?? code ?? "ABORT_ERR", stdout, stderr, terminatedReason));
        return;
      }
      if (code !== 0) {
        finish(new GitExit(code ?? sig ?? void 0, stdout, stderr));
        return;
      }
      finish(null);
    });
  });
}
async function text(args, cwd, env = {}, options = {}) {
  return (await runGit(args, cwd, env, options)).stdout.toString("utf8").trim();
}
async function locateGit(cwd, storage, signal) {
  let found;
  try {
    found = await text(["rev-parse", "--show-toplevel", "--absolute-git-dir", "--git-path", "objects"], cwd, {}, { signal });
  } catch (error) {
    if (error instanceof GitExit && /not a git repository/i.test(error.message)) return null;
    throw error;
  }
  const lines = found.split(/\r?\n/).map((line) => resolve(cwd, line));
  if (lines.length !== 3) throw new Error("git rev-parse returned " + String(lines.length) + " paths");
  const [root, gitDir, repositoryObjects] = lines;
  if (!samePath(root, cwd) && (samePath(root, homedir()) || samePath(dirname(root), root))) {
    return null;
  }
  const objects = join(storage, "objects");
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
  return join(storage, "indexes", String(process.pid) + "-" + randomUUID() + ".index");
}
async function dropFile(path) {
  try {
    await unlink(path);
  } catch (error) {
    if (!missing(error)) throw error;
  }
}
function nullPaths(bytes) {
  return bytes.toString("utf8").split("\0").filter((path) => path !== "");
}
function pathInWorkspace(root, absolute) {
  const rel = relative(root, absolute);
  if (rel === "" || isAbsolute(rel) || rel === ".." || rel.startsWith(".." + sep)) return null;
  return rel.split(sep).join("/");
}
function insidePrefix(slashPath, prefix) {
  if (process.platform === "win32") {
    const p = slashPath.toLowerCase();
    const pre = prefix.toLowerCase();
    return p === pre || p.startsWith(pre + "/");
  }
  return slashPath === prefix || slashPath.startsWith(prefix + "/");
}
async function rewindIgnoreFile(root) {
  const file = join(root, REWIND_IGNORE_FILE);
  try {
    return (await lstat(file)).isFile() ? file : null;
  } catch (error) {
    if (missing(error)) return null;
    throw error;
  }
}
async function snapshotTree(workspace, storage, options = {}) {
  const maxFileBytes = options.maxFileBytes ?? DEFAULT_MAX_FILE_BYTES;
  const maxDirtyFiles = options.maxDirtyFiles ?? DEFAULT_MAX_DIRTY_FILES;
  const maxSnapshotBytes = options.maxSnapshotBytes ?? DEFAULT_MAX_SNAPSHOT_BYTES;
  const signal = options.signal;
  const index = indexPath(storage);
  await Promise.all([
    mkdir(dirname(index), { recursive: true, mode: 448 }),
    mkdir(workspace.objects, { recursive: true, mode: 448 })
  ]);
  try {
    let indexPresent = false;
    try {
      await copyFile(join(workspace.gitDir, "index"), index);
      indexPresent = true;
    } catch (error) {
      if (!missing(error)) throw error;
    }
    const env = { ...workspace.env, GIT_INDEX_FILE: index };
    const storagePrefix = pathInWorkspace(workspace.root, storage);
    const lsArgs = ["ls-files", "-z", "--modified", "--others", "--deleted", "--exclude-standard"];
    const ignoreFile = await rewindIgnoreFile(workspace.root);
    if (ignoreFile !== null) lsArgs.push("--exclude-from=" + ignoreFile);
    if (storagePrefix !== null) lsArgs.push("--", ".", ":(exclude)" + storagePrefix);
    const listed = await runGit(lsArgs, workspace.root, env, { signal });
    const unique = /* @__PURE__ */ new Set();
    for (const candidate of nullPaths(listed.stdout)) {
      if (storagePrefix !== null && insidePrefix(candidate, storagePrefix)) continue;
      unique.add(candidate);
    }
    const candidates = [...unique];
    if (candidates.length > maxDirtyFiles) {
      throw new Error(`dirty-files-exceeded:${String(candidates.length)}:${String(maxDirtyFiles)}`);
    }
    const safePaths = [];
    const oversized = [];
    let totalDirtyBytes = 0;
    for (let offset = 0; offset < candidates.length; offset += STAT_BATCH_SIZE) {
      if (signal?.aborted) throw new GitExit("ABORT_ERR", Buffer.alloc(0), Buffer.alloc(0), "aborted");
      const batch = candidates.slice(offset, offset + STAT_BATCH_SIZE);
      const infos = await Promise.all(batch.map(async (slashPath) => {
        const absolute = resolve(workspace.root, ...slashPath.split("/"));
        try {
          return { slashPath, info: await lstat(absolute) };
        } catch (error) {
          if (missing(error)) return { slashPath, info: null };
          throw error;
        }
      }));
      for (const { slashPath, info } of infos) {
        if (info === null || info.isSymbolicLink() || info.isDirectory()) {
          safePaths.push(slashPath);
          continue;
        }
        if (info.isFile()) {
          if (info.size > maxFileBytes) {
            oversized.push(slashPath);
            continue;
          }
          totalDirtyBytes += info.size;
          if (totalDirtyBytes > maxSnapshotBytes) {
            const limitMb = Math.max(1, Math.round(maxSnapshotBytes / (1024 * 1024)));
            throw new Error(`snapshot-size-exceeded:${String(limitMb)}`);
          }
          safePaths.push(slashPath);
        }
      }
    }
    if (safePaths.length > 0) {
      await runGit(
        ["--literal-pathspecs", "-c", "core.autocrlf=false", "add", "--all", "--ignore-errors", "--pathspec-from-file=-", "--pathspec-file-nul"],
        workspace.root,
        env,
        { input: Buffer.from(safePaths.join("\0") + "\0", "utf8"), signal }
      );
      indexPresent = true;
    }
    const tree = indexPresent ? await text(["write-tree"], workspace.root, env, { signal }) : EMPTY_TREE_HASH;
    return { tree, oversized };
  } finally {
    await dropFile(index);
    await dropFile(index + ".lock");
  }
}
async function treePaths(workspace, tree, signal) {
  const result = await runGit(["ls-tree", "-r", "-z", "--name-only", tree], workspace.root, workspace.env, { signal });
  return new Set(nullPaths(result.stdout));
}
async function ignoredPaths(workspace, paths, signal) {
  if (!paths.length) return /* @__PURE__ */ new Set();
  const input = Buffer.from(paths.join("\0") + "\0");
  const result = /* @__PURE__ */ new Set();
  const collect = async (config) => {
    try {
      const found = await runGit([...config, "check-ignore", "--no-index", "-z", "--stdin"], workspace.root, workspace.env, { input, signal });
      for (const path of nullPaths(found.stdout)) result.add(path);
    } catch (error) {
      if (!(error instanceof GitExit && error.code === 1)) throw error;
    }
  };
  await collect([]);
  const ignoreFile = await rewindIgnoreFile(workspace.root);
  if (ignoreFile !== null) await collect(["-c", "core.excludesFile=" + ignoreFile]);
  return result;
}
async function listReachableObjects(workspace, trees, signal) {
  const uniqueTrees = [...new Set(trees.filter((tree) => /^[0-9a-f]{40}$/i.test(tree)))];
  if (uniqueTrees.length === 0) return /* @__PURE__ */ new Set();
  const result = await runGit(["rev-list", "--objects", ...uniqueTrees], workspace.root, workspace.env, { signal });
  const reachable = /* @__PURE__ */ new Set();
  for (const line of result.stdout.toString("utf8").split(/\r?\n/)) {
    const oid = line.split(" ", 1)[0]?.trim();
    if (oid !== void 0 && /^[0-9a-f]{40}$/i.test(oid)) reachable.add(oid.toLowerCase());
  }
  return reachable;
}
async function diffTrees(workspace, before, after, skipPaths, signal) {
  if (before === after) return [];
  const result = await runGit(["diff-tree", "-r", "--name-status", "-z", before, after], workspace.root, workspace.env, { signal });
  const fields = nullPaths(result.stdout);
  const files = [];
  for (let index = 0; index < fields.length; ) {
    const status = fields[index++] ?? "";
    if (status.startsWith("R") || status.startsWith("C")) {
      const from = fields[index++];
      const to = fields[index++];
      if (from !== void 0 && !skipPaths?.has(from)) files.push({ path: from, status: "deleted" });
      if (to !== void 0 && !skipPaths?.has(to)) files.push({ path: to, status: "added" });
      continue;
    }
    const path = fields[index++];
    if (path === void 0) break;
    if (skipPaths?.has(path)) continue;
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
  if (absolute !== root && !absolute.startsWith(root + sep)) throw new Error("snapshot path escapes repository: " + slashPath);
  try {
    const info = await lstat(absolute);
    if (info.isDirectory() && !info.isSymbolicLink()) {
      if ((await readdir(absolute)).length > 0) throw new Error("refusing to replace non-empty directory " + slashPath);
      await rmdir(absolute);
    } else {
      await unlink(absolute);
    }
    await removeEmptyParents(root, absolute);
  } catch (error) {
    if (!missing(error)) throw error;
  }
}
async function applyTree(workspace, storage, target, reference, skipPaths, signal) {
  const [wanted, current] = await Promise.all([
    treePaths(workspace, target, signal),
    treePaths(workspace, reference, signal)
  ]);
  for (const path of current) {
    if (!wanted.has(path) && !skipPaths?.has(path)) await removeSnapshotPath(workspace.root, path);
  }
  const index = indexPath(storage);
  await mkdir(dirname(index), { recursive: true, mode: 448 });
  try {
    const env = { ...workspace.env, GIT_INDEX_FILE: index, GIT_WORK_TREE: workspace.root };
    await text(["read-tree", target], workspace.root, env, { signal });
    if (skipPaths !== void 0 && skipPaths.size > 0) {
      await runGit(
        ["--literal-pathspecs", "rm", "--cached", "--ignore-unmatch", "-q", "--pathspec-from-file=-", "--pathspec-file-nul"],
        workspace.root,
        env,
        { input: Buffer.from([...skipPaths].join("\0") + "\0", "utf8"), signal }
      );
    }
    await text(["-c", "core.autocrlf=false", "checkout-index", "--all", "--force"], workspace.root, env, { signal });
  } finally {
    await dropFile(index);
    await dropFile(index + ".lock");
  }
}
export {
  DEFAULT_MAX_DIRTY_FILES,
  DEFAULT_MAX_FILE_BYTES,
  DEFAULT_MAX_SNAPSHOT_BYTES,
  applyTree,
  diffTrees,
  ignoredPaths,
  listReachableObjects,
  locateGit,
  pathInWorkspace,
  runGit,
  snapshotTree,
  treePaths
};
