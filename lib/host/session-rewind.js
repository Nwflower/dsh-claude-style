// packages/host/src/session-rewind.ts
import { createHash, randomUUID } from "node:crypto";
import {
  chmod,
  lstat,
  mkdir,
  readFile as readFileAsync,
  readlink,
  rename,
  stat,
  symlink,
  unlink,
  writeFile
} from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import { dirname, isAbsolute, join, relative, sep } from "node:path";

// packages/engine/node/session-events.ts
function eventsOf(events) {
  return Array.isArray(events) ? events : null;
}
function unreadableLog(error) {
  const failure = error;
  return failure?.code === "SESSION_QUERY_CORRUPT_SESSION" || failure?.code === "SESSION_QUERY_SESSION_NOT_FOUND" ? failure : null;
}
function reportUnreadable(ctx, packageName, error, sessionId, label) {
  ctx.logger?.warn?.(`${packageName}: session ${sessionId} left out of ${label}: ${unreadableLog(error)?.message}`);
}
function releaseObservation(observation) {
  const named = observation.dispose;
  if (typeof named === "function") named.call(observation);
  else if (Symbol.dispose in observation) observation[Symbol.dispose]();
}
async function readEvents(ctx, packageName, sessionId, label) {
  const query = ctx.get("sessionQuery");
  if (query === null || query === void 0) return null;
  try {
    if (typeof query.observeSession !== "function") return null;
    const observation = await query.observeSession(sessionId, { projectionMode: "none" });
    try {
      return eventsOf(observation.events);
    } finally {
      releaseObservation(observation);
    }
  } catch (error) {
    if (unreadableLog(error) === null) throw error;
    reportUnreadable(ctx, packageName, error, sessionId, label);
    return null;
  }
}

// packages/host/src/session-rewind.ts
import { pluginPath } from "./harness-home.js";
import { rewindPeerActive } from "./rewind-peer.js";
import {
  applyTree,
  diffTrees,
  locateGit,
  snapshotTree
} from "./session-rewind-git.js";
var DOCUMENT_VERSION = 1;
var MAX_CAPTURE_BYTES = 16 * 1024 * 1024;
var PLAN_LIFETIME_MS = 5 * 6e4;
var PLAN_LIMIT = 32;
function emptyDocument() {
  return { version: DOCUMENT_VERSION, checkpoints: {}, links: {}, conversations: [] };
}
function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
function validDocument(value) {
  if (!isRecord(value) || value.version !== DOCUMENT_VERSION || !isRecord(value.checkpoints) || !isRecord(value.links) || !Array.isArray(value.conversations)) {
    throw new Error("session rewind document has an unsupported shape");
  }
  return value;
}
function messageOf(error) {
  return error instanceof Error ? error.message : String(error);
}
function sessionCwd(session) {
  return typeof session?.header?.cwd === "string" && session.header.cwd !== "" ? session.header.cwd : null;
}
var SessionRewind = class {
  constructor(ctx) {
    this.ctx = ctx;
    this.storage = pluginPath(ctx, "rewind");
    this.documentPath = join(this.storage, "state.json");
    this.document = existsSync(this.documentPath) ? validDocument(JSON.parse(readFileSync(this.documentPath, "utf8"))) : emptyDocument();
    this.listen();
  }
  ctx;
  storage;
  documentPath;
  document;
  recorders = /* @__PURE__ */ new Map();
  mutations = /* @__PURE__ */ new WeakMap();
  plans = /* @__PURE__ */ new Map();
  writes = Promise.resolve();
  commitChain = Promise.resolve();
  save() {
    this.writes = this.writes.then(async () => {
      await mkdir(dirname(this.documentPath), { recursive: true, mode: 448 });
      const temporary = this.documentPath + "." + process.pid + ".tmp";
      await writeFile(temporary, JSON.stringify(this.document), { mode: 384 });
      await chmod(temporary, 384);
      await rename(temporary, this.documentPath);
    });
    return this.writes;
  }
  liveSessions() {
    const sessions = this.ctx.get("sessions");
    return sessions !== null && typeof sessions === "object" ? sessions : null;
  }
  recorderFor(session, cwd) {
    let recorder = this.recorders.get(session.id);
    if (recorder === void 0) {
      recorder = new SessionRecorder(this, session.id, cwd);
      this.recorders.set(session.id, recorder);
    }
    return recorder;
  }
  listen() {
    if (typeof this.ctx.on !== "function") return;
    this.ctx.on("session/event", (session, event) => {
      if (session === null || typeof session.id !== "string") return;
      const recorder = this.recorders.get(session.id);
      if (event.type === "turn/start" && typeof event.data?.turn === "number") {
        if (rewindPeerActive(this.ctx)) {
          this.recorders.delete(session.id);
          return;
        }
        const cwd = sessionCwd(session);
        if (cwd !== null && session.header?.origin !== "subagent") this.recorderFor(session, cwd).start(event.data.turn);
      } else if (event.type === "turn/end" && typeof event.data?.turn === "number") {
        recorder?.end(event.data.turn);
      }
    });
    this.ctx.on("session/disposed", (session) => {
      this.recorders.delete(session.id);
    });
    this.ctx.on("tools/pre-execute", async (exec, next) => {
      const recorder = exec.agent?.session === void 0 ? void 0 : this.recorders.get(exec.agent.session.id);
      if (recorder !== void 0) {
        this.mutations.set(exec, recorder);
        await recorder.settled();
      }
      return next();
    });
    const capture = async (target, actor) => {
      const recorder = actor === void 0 ? void 0 : this.mutations.get(actor);
      if (recorder === void 0) return;
      const fs = this.ctx.get("fs");
      if (typeof fs?.processPath !== "function") throw new Error("session rewind: host fs.processPath is unavailable");
      await recorder.capture(fs.processPath(target));
      await recorder.settled();
    };
    for (const name of ["fs/write-intent", "fs/edit-intent", "fs/delete-intent"]) {
      this.ctx.on(name, async (target, actor, next) => {
        const intent = await next();
        await capture(target, actor);
        return intent;
      }, { prepend: true });
    }
  }
  async putCheckpoint(checkpoint) {
    const rows = this.document.checkpoints[checkpoint.sessionId] ?? [];
    const next = rows.filter((row) => row.turn !== checkpoint.turn);
    next.push(checkpoint);
    next.sort((a, b) => a.turn - b.turn);
    this.document.checkpoints[checkpoint.sessionId] = next;
    await this.save();
  }
  checkpointStorage() {
    return this.storage;
  }
  warn(message) {
    this.ctx.logger?.warn?.("dsh-claude-style: session rewind: " + message);
  }
  checkpoint(sessionId, turn, seen = /* @__PURE__ */ new Set()) {
    if (seen.has(sessionId)) throw new Error("session rewind: fork lineage contains a cycle");
    seen.add(sessionId);
    const direct = this.document.checkpoints[sessionId]?.find((row) => row.turn === turn);
    if (direct !== void 0) return direct;
    const link = this.document.links[sessionId];
    return link === void 0 ? void 0 : this.checkpoint(link.sourceSessionId, turn, seen);
  }
  workspaceOf(stored) {
    return {
      root: stored.root,
      gitDir: stored.gitDir,
      repositoryObjects: stored.repositoryObjects,
      objects: join(this.storage, "objects"),
      env: {
        GIT_OBJECT_DIRECTORY: join(this.storage, "objects"),
        GIT_ALTERNATE_OBJECT_DIRECTORIES: stored.repositoryObjects
      }
    };
  }
  async capture(absolute) {
    let info;
    try {
      info = await lstat(absolute);
    } catch (error) {
      if (error.code === "ENOENT") return { kind: "absent" };
      throw error;
    }
    if (info.isSymbolicLink()) {
      let directory = false;
      try {
        directory = (await stat(absolute)).isDirectory();
      } catch (error) {
        if (error.code !== "ENOENT") throw error;
      }
      return { kind: "symlink", target: await readlink(absolute), directory };
    }
    if (!info.isFile()) return { kind: "unsupported" };
    if (info.size > MAX_CAPTURE_BYTES) return { kind: "oversized" };
    const bytes = await readFileAsync(absolute);
    const hash = createHash("sha256").update(bytes).digest("hex");
    const path = join(this.storage, "captures", hash);
    await mkdir(dirname(path), { recursive: true, mode: 448 });
    try {
      await writeFile(path, bytes, { flag: "wx", mode: 384 });
    } catch (error) {
      if (error.code !== "EEXIST") throw error;
    }
    return { kind: "file", hash, mode: info.mode & 511 };
  }
  async captureFor(recorder, absolute, turn) {
    const capture = await this.capture(absolute);
    recorder.remember(absolute, capture, turn);
  }
  async restoreCapture(absolute, capture) {
    if (capture.kind === "oversized" || capture.kind === "unsupported") throw new Error(`no complete capture for ${absolute}`);
    if (capture.kind === "absent") {
      try {
        const info = await lstat(absolute);
        if (info.isDirectory() && !info.isSymbolicLink()) throw new Error(`refusing to remove directory ${absolute}`);
        await unlink(absolute);
      } catch (error) {
        if (error.code !== "ENOENT") throw error;
      }
      return;
    }
    await mkdir(dirname(absolute), { recursive: true, mode: 448 });
    if (capture.kind === "symlink") {
      try {
        await unlink(absolute);
      } catch (error) {
        if (error.code !== "ENOENT") throw error;
      }
      await symlink(capture.target, absolute, capture.directory ? "junction" : "file");
      return;
    }
    if (capture.kind !== "file") throw new Error(`no complete capture for ${absolute}`);
    const bytes = await readFileAsync(join(this.storage, "captures", capture.hash));
    const temporary = absolute + ".dsh-claude-rewind-" + process.pid + ".tmp";
    try {
      await writeFile(temporary, bytes, { mode: capture.mode });
      await chmod(temporary, capture.mode);
      await rename(temporary, absolute);
    } catch (error) {
      try {
        await unlink(temporary);
      } catch (cleanup) {
        if (cleanup.code !== "ENOENT") throw new AggregateError([error, cleanup], "session rewind: temporary cleanup failed");
      }
      throw error;
    }
  }
  conversationFor(sessionId) {
    return this.document.conversations.find((conversation) => conversation.activeSessionId === sessionId) ?? this.document.conversations.find((conversation) => conversation.revisions.some((revision) => revision.sessionId === sessionId));
  }
  workspaceRegistry() {
    const registry = this.ctx.get("workspaceRegistry");
    return registry !== null && typeof registry === "object" ? registry : null;
  }
  async sessionKnown(sessionId) {
    if (this.liveSessions()?.get?.(sessionId) !== void 0) return true;
    const query = this.ctx.get("sessionQuery");
    if (typeof query?.observeSession !== "function") return true;
    try {
      const observation = await query.observeSession(sessionId);
      if (typeof observation.dispose === "function") observation.dispose();
      else if (Symbol.dispose in observation) observation[Symbol.dispose]();
      return true;
    } catch (error) {
      if (error.code === "SESSION_QUERY_SESSION_NOT_FOUND") return false;
      throw error;
    }
  }
  /** Reconcile old plugin revisions with the native archive, including records written before archival existed. */
  async reconcileArchiveState(pinSessionId = null) {
    const registry = this.workspaceRegistry();
    if (registry === null) return;
    let changed = false;
    for (const conversation of this.document.conversations) {
      for (const revision of conversation.revisions) {
        const active = revision.sessionId === conversation.activeSessionId;
        const known = await this.sessionKnown(revision.sessionId);
        if (!active && known && typeof registry.archiveSession === "function") {
          try {
            await registry.archiveSession(revision.sessionId, { stopActivity: true });
          } catch (error) {
            if (error.name !== "WorkspaceUnknownSessionError") throw error;
          }
        }
        const archived = active ? registry.archivedSessionIds?.includes(revision.sessionId) === true : known;
        if (revision.archived !== archived || revision.missing === !known) {
          revision.archived = archived;
          revision.missing = !known;
          changed = true;
        }
      }
    }
    if (pinSessionId !== null && typeof registry.pinSession === "function") await registry.pinSession(pinSessionId);
    if (changed) await this.save();
  }
  async register(sourceSessionId, childSessionId, cutSeq, action, failed) {
    const inheritPin = this.workspaceRegistry()?.pinnedSessionIds?.includes(sourceSessionId) === true;
    let conversation = this.conversationFor(sourceSessionId);
    if (conversation === void 0) {
      conversation = {
        id: sourceSessionId,
        activeSessionId: sourceSessionId,
        revisions: [{ sessionId: sourceSessionId, sourceSessionId: null, cutSeq: null, action: "origin", createdAt: Date.now(), status: "active" }]
      };
      this.document.conversations.push(conversation);
    }
    for (const revision of conversation.revisions) if (revision.status === "active") revision.status = "superseded";
    if (!failed) conversation.activeSessionId = childSessionId;
    else {
      const active = conversation.revisions.find((revision) => revision.sessionId === conversation.activeSessionId);
      if (active !== void 0) active.status = "active";
    }
    conversation.revisions.push({
      sessionId: childSessionId,
      sourceSessionId,
      cutSeq,
      action,
      createdAt: Date.now(),
      status: failed ? "failed" : "active"
    });
    this.document.links[childSessionId] = { sourceSessionId, cutSeq };
    await this.save();
    await this.reconcileArchiveState(failed || !inheritPin ? null : childSessionId);
    return structuredClone(conversation);
  }
  async conversations() {
    await this.commitChain;
    await this.reconcileArchiveState();
    return structuredClone(this.document.conversations);
  }
  async plan(sessionId, messageSeq, turn) {
    await this.commitChain;
    if (!Number.isSafeInteger(messageSeq) || messageSeq <= 0 || !Number.isSafeInteger(turn) || turn <= 0) {
      throw new Error("session rewind: invalid message boundary");
    }
    await this.recorders.get(sessionId)?.settled();
    const events = await readEvents(this.ctx, "dsh-claude-style", sessionId, "the rewind plan");
    if (events === null) throw new Error("session rewind: session history is unavailable");
    const turns = events.filter((event) => event.type === "turn/start" && typeof event.data?.turn === "number").map((event) => event.data?.turn);
    if (!turns.includes(turn)) throw new Error(`session rewind: turn ${turn} does not exist`);
    const headSeq = events.at(-1)?.seq ?? -1;
    const checkpoints = turns.filter((candidate) => candidate >= turn).map((candidate) => this.checkpoint(sessionId, candidate));
    const target = checkpoints[0];
    let reason = target === void 0 ? "\u8FD9\u4E2A\u76EE\u6807\u8F6E\u6B21\u8FD8\u6CA1\u6709\u63D2\u4EF6\u68C0\u67E5\u70B9" : "";
    if (checkpoints.some((checkpoint) => checkpoint === void 0)) reason = "\u90E8\u5206\u540E\u7EED\u8F6E\u6B21\u6CA1\u6709\u5B8C\u6574\u68C0\u67E5\u70B9";
    if (checkpoints.some((checkpoint) => checkpoint?.complete === false)) {
      reason = checkpoints.find((checkpoint) => checkpoint?.complete === false)?.reason || "\u68C0\u67E5\u70B9\u5305\u542B\u65E0\u6CD5\u6062\u590D\u7684\u6587\u4EF6";
    }
    if (target?.git != null && checkpoints.some((checkpoint) => checkpoint?.git?.root !== target.git?.root)) {
      reason = "\u76EE\u6807\u4E4B\u540E\u7684\u5DE5\u4F5C\u76EE\u5F55\u53D1\u751F\u4E86\u53D8\u5316\uFF0C\u65E0\u6CD5\u5B89\u5168\u6062\u590D";
    }
    let workspace = null;
    let currentTree = null;
    let files = [];
    if (reason === "" && target?.git != null) {
      workspace = this.workspaceOf(target.git);
      currentTree = await snapshotTree(workspace, this.storage);
      files = await diffTrees(workspace, target.git.beforeTree, currentTree);
    }
    const listed = new Set(files.map((file) => file.path));
    for (const checkpoint of checkpoints) {
      for (const absolute of Object.keys(checkpoint?.captures ?? {})) {
        const inside = target?.git == null ? "" : relative(target.git.root, absolute);
        const path = target?.git != null && inside !== "" && !isAbsolute(inside) && !inside.startsWith(".." + sep) ? inside.split(sep).join("/") : absolute;
        if (!listed.has(path)) {
          files.push({ path, status: "captured" });
          listed.add(path);
        }
      }
    }
    const now = Date.now();
    for (const [id2, plan2] of this.plans) {
      if (now - plan2.createdAt > PLAN_LIFETIME_MS || this.plans.size >= PLAN_LIMIT) this.plans.delete(id2);
    }
    const id = randomUUID();
    const plan = {
      id,
      sessionId,
      atSeq: messageSeq - 1,
      turn,
      laterTurns: turns.filter((candidate) => candidate > turn).length,
      restoreAvailable: reason === "",
      reason,
      files,
      createdAt: now,
      headSeq,
      checkpoints: checkpoints.filter((checkpoint) => checkpoint !== void 0),
      workspace,
      currentTree
    };
    this.plans.set(id, plan);
    const { createdAt: _createdAt, headSeq: _headSeq, checkpoints: _checkpoints, workspace: _workspace, currentTree: _currentTree, ...answer } = plan;
    return answer;
  }
  async commit(request) {
    const run = this.commitChain.then(() => this.commitNow(request));
    this.commitChain = run.then(() => void 0, () => void 0);
    return run;
  }
  async commitNow(request) {
    const plan = this.plans.get(request.planId);
    if (plan === void 0 || Date.now() - plan.createdAt > PLAN_LIFETIME_MS) throw new Error("session rewind: confirmation expired");
    this.plans.delete(request.planId);
    if (!/^[A-Za-z0-9._\-:@]{1,200}$/.test(request.childSessionId)) throw new Error("session rewind: invalid child session id");
    const events = await readEvents(this.ctx, "dsh-claude-style", plan.sessionId, "the rewind commit");
    const headSeq = events?.at(-1)?.seq ?? -1;
    if (events === null || headSeq !== plan.headSeq) {
      await this.register(plan.sessionId, request.childSessionId, plan.atSeq, request.action, true);
      throw new Error("session rewind: the session changed after confirmation");
    }
    if (request.restore && !plan.restoreAvailable) throw new Error("session rewind: code restoration is unavailable");
    try {
      if (request.restore) await this.restore(plan);
    } catch (error) {
      await this.register(plan.sessionId, request.childSessionId, plan.atSeq, request.action, true);
      throw error;
    }
    return this.register(plan.sessionId, request.childSessionId, plan.atSeq, request.action, false);
  }
  async restore(plan) {
    if (plan.workspace !== null && plan.currentTree !== null) {
      const currentTree = await snapshotTree(plan.workspace, this.storage);
      if (currentTree !== plan.currentTree) throw new Error("session rewind: the work tree changed after confirmation");
    }
    const paths = [...new Set(plan.checkpoints.flatMap((checkpoint) => Object.keys(checkpoint.captures)))];
    const safety = /* @__PURE__ */ new Map();
    for (const path of paths) {
      const capture = await this.capture(path);
      if (capture.kind === "oversized" || capture.kind === "unsupported") throw new Error(`cannot protect current file ${path}`);
      safety.set(path, capture);
    }
    const target = plan.checkpoints.find((checkpoint) => checkpoint.turn === plan.turn);
    try {
      if (plan.workspace !== null && plan.currentTree !== null && target?.git != null) {
        await applyTree(plan.workspace, this.storage, target.git.beforeTree, plan.currentTree);
      }
      const ordered = [...plan.checkpoints].sort((a, b) => b.turn - a.turn);
      for (const checkpoint of ordered) {
        for (const [path, capture] of Object.entries(checkpoint.captures)) await this.restoreCapture(path, capture);
      }
    } catch (error) {
      try {
        for (const [path, capture] of safety) await this.restoreCapture(path, capture);
        if (plan.workspace !== null && plan.currentTree !== null && target?.git != null) {
          await applyTree(plan.workspace, this.storage, plan.currentTree, target.git.beforeTree);
        }
      } catch (rollback) {
        throw new AggregateError([error, rollback], "session rewind: restoration and its safety restoration both failed");
      }
      throw error;
    }
  }
};
var SessionRecorder = class {
  constructor(owner, sessionId, cwd) {
    this.owner = owner;
    this.sessionId = sessionId;
    this.cwd = cwd;
  }
  owner;
  sessionId;
  cwd;
  chain = Promise.resolve();
  active = null;
  start(turn) {
    const state = {
      turn,
      cwd: this.cwd,
      captures: /* @__PURE__ */ new Map(),
      git: null,
      beforeTree: null,
      complete: true,
      reason: ""
    };
    this.active = state;
    this.enqueue(async () => {
      try {
        state.git = await locateGit(state.cwd, this.owner.checkpointStorage());
        if (state.git !== null) state.beforeTree = await snapshotTree(state.git, this.owner.checkpointStorage());
      } catch (error) {
        state.complete = false;
        state.reason = messageOf(error);
        this.owner.warn(`turn ${turn} baseline unavailable: ${state.reason}`);
      }
    });
  }
  end(turn) {
    const state = this.active;
    if (state === null || state.turn !== turn) return;
    this.enqueue(async () => {
      await this.owner.putCheckpoint({
        sessionId: this.sessionId,
        turn,
        cwd: state.cwd,
        createdAt: Date.now(),
        git: state.git !== null && state.beforeTree !== null ? {
          cwd: state.cwd,
          root: state.git.root,
          gitDir: state.git.gitDir,
          repositoryObjects: state.git.repositoryObjects,
          beforeTree: state.beforeTree
        } : null,
        captures: Object.fromEntries(state.captures),
        complete: state.complete && [...state.captures.values()].every((capture) => capture.kind !== "oversized" && capture.kind !== "unsupported"),
        reason: state.reason
      });
    });
  }
  async capture(path) {
    await this.enqueue(async () => {
      const state = this.active;
      if (state === null || state.captures.has(path)) return;
      try {
        await this.owner.captureFor(this, path, state.turn);
      } catch (error) {
        state.complete = false;
        state.reason = messageOf(error);
        this.owner.warn(`capture failed for ${path}: ${state.reason}`);
      }
    });
  }
  remember(path, capture, turn) {
    if (this.active?.turn === turn) this.active.captures.set(path, capture);
  }
  settled() {
    return this.chain;
  }
  enqueue(task) {
    this.chain = this.chain.then(task);
    return this.chain;
  }
};
export {
  SessionRewind
};
