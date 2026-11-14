// packages/host/src/checkout.ts
import { execFile } from "node:child_process";
import { homedir, userInfo } from "node:os";
import { resolve } from "node:path";
import { promisify } from "node:util";

// packages/contracts/src/session-panel.ts
function repositorySlug(remote) {
  if (remote === null) return null;
  let path = remote.trim();
  if (path === "") return null;
  const scp = path.match(/^[^@/\s]+@[^:/\s]+:(.+)$/);
  if (scp !== null) path = scp[1];
  else {
    let parsed;
    try {
      parsed = new URL(path);
    } catch {
      return null;
    }
    if (!["http:", "https:", "ssh:", "git:"].includes(parsed.protocol)) return null;
    path = parsed.pathname;
  }
  const parts = path.replace(/\.git$/i, "").split("/").filter((segment) => segment !== "");
  if (parts.length < 2) return null;
  return `${parts[parts.length - 2]}/${parts[parts.length - 1]}`;
}

// packages/host/src/checkout.ts
var run = promisify(execFile);
var GIT_TIMEOUT_MS = 2500;
var GIT_MAX_OUTPUT = 256 * 1024;
var CHECKOUT_TTL_MS = 5e3;
async function git(directory, args) {
  try {
    const { stdout } = await run("git", ["--no-optional-locks", "-C", directory, ...args], {
      timeout: GIT_TIMEOUT_MS,
      maxBuffer: GIT_MAX_OUTPUT,
      windowsHide: true,
      encoding: "utf8"
    });
    const text = stdout.trim();
    return text === "" ? null : text;
  } catch {
    return null;
  }
}
async function checkoutOf(directory) {
  const root = await git(directory, ["rev-parse", "--show-toplevel"]);
  if (root === null) return null;
  const [branch, commit, commonDir, remote] = await Promise.all([
    git(directory, ["symbolic-ref", "--short", "-q", "HEAD"]),
    git(directory, ["rev-parse", "--short", "HEAD"]),
    git(directory, ["rev-parse", "--git-common-dir"]),
    git(directory, ["config", "--get", "remote.origin.url"])
  ]);
  return {
    root,
    branch,
    commit,
    // A linked worktree's common directory is the source checkout's `.git`,
    // which differs from the worktree's own root-relative one.
    linked: commonDir !== null && resolve(directory, commonDir) !== resolve(root, ".git"),
    repository: repositorySlug(remote)
  };
}
async function panelEnvironment(directory) {
  const home = homedir();
  const resolved = directory === null || directory.trim() === "" ? null : resolve(directory);
  const target = resolved ?? home;
  let user = "";
  try {
    user = userInfo().username;
  } catch {
    user = "";
  }
  const cached = environments.get(target);
  if (cached !== void 0 && Date.now() - cached.at < CHECKOUT_TTL_MS) return { ...cached.value, user };
  let checkout = null;
  try {
    checkout = await checkoutOf(target);
  } catch {
    checkout = null;
  }
  const value = { home, user, directory: target, checkout };
  environments.set(target, { value, at: Date.now() });
  prune();
  return value;
}
var environments = /* @__PURE__ */ new Map();
var ENVIRONMENT_LIMIT = 16;
function prune() {
  if (environments.size <= ENVIRONMENT_LIMIT) return;
  const oldest = [...environments.entries()].sort((left, right) => left[1].at - right[1].at)[0];
  if (oldest !== void 0) environments.delete(oldest[0]);
}
export {
  panelEnvironment
};
