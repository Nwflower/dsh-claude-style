// packages/host/src/session-rewind.ts
import { randomUUID } from "node:crypto";
import { chmod, mkdir, rename, writeFile } from "node:fs/promises";
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
import { pluginPath } from "./paths.js";
import { rewindPeerActive } from "./rewind-peer.js";
import { readRewindConfig } from "./session-rewind-config.js";
import {
  applyTree,
  DEFAULT_MAX_SNAPSHOT_BYTES,
  diffTrees,
  locateGit,
  snapshotTree
} from "./session-rewind-git.js";
import {
  captureFile,
  pruneRewindStorage,
  restoreCapturedFile
} from "./session-rewind-store.js";
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
  constructor(ctx, config) {
    this.ctx = ctx;
    this.config = config;
    this.defaultStorage = pluginPath(ctx, "rewind");
    this.documentPath = join(this.defaultStorage, "state.json");
    this.document = existsSync(this.documentPath) ? validDocument(JSON.parse(readFileSync(this.documentPath, "utf8"))) : emptyDocument();
    this.listen();
  }
  ctx;
  config;
  defaultStorage;
  documentPath;
  document;
  recorders = /* @__PURE__ */ new Map();
  mutations = /* @__PURE__ */ new WeakMap();
  plans = /* @__PURE__ */ new Map();
  disposers = [];
  abort = new AbortController();
  disposed = false;
  writes = Promise.resolve();
  pruning = Promise.resolve();
  commitChain = Promise.resolve();
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.abort.abort();
    for (const off of this.disposers) {
      try {
        off();
      } catch {
      }
    }
    this.disposers.length = 0;
    this.recorders.clear();
    this.plans.clear();
  }
  runtimeConfig() {
    return readRewindConfig(this.ctx, this.config, this.defaultStorage);
  }
  storageOf(checkpoint) {
    return checkpoint?.storage ?? this.defaultStorage;
  }
  snapshotOptions() {
    const budget = this.runtimeConfig().storageLimitBytes;
    return {
      maxFileBytes: MAX_CAPTURE_BYTES,
      maxSnapshotBytes: Math.min(DEFAULT_MAX_SNAPSHOT_BYTES, Math.max(MAX_CAPTURE_BYTES, Math.floor(budget / 2))),
      signal: this.abort.signal
    };
  }
  signal() {
    return this.abort.signal;
  }
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
    const listen = (name, handler, options) => {
      const off = this.ctx.on?.(name, handler, options);
      if (typeof off === "function") this.disposers.push(off);
    };
    listen("session/event", (session, event) => {
      if (this.disposed || session === null || typeof session.id !== "string") return;
      const recorder = this.recorders.get(session.id);
      if (event.type === "turn/start" && typeof event.data?.turn === "number") {
        if (rewindPeerActive(this.ctx) || !this.runtimeConfig().checkpointsEnabled) {
          this.recorders.delete(session.id);
          return;
        }
        const cwd = sessionCwd(session);
        if (cwd !== null && session.header?.origin !== "subagent") this.recorderFor(session, cwd).start(event.data.turn);
      } else if (event.type === "turn/end" && typeof event.data?.turn === "number") {
        recorder?.end(event.data.turn);
      }
    });
    listen("session/disposed", (session) => {
      this.recorders.delete(session.id);
    });
    listen("tools/pre-execute", async (exec, next) => {
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
      listen(name, async (target, actor, next) => {
        const intent = await next();
        await capture(target, actor);
        return intent;
      }, { prepend: true });
    }
  }
  protectedTrees() {
    const out = [];
    for (const plan of this.plans.values()) {
      if (plan.workspace === null) continue;
      if (plan.currentTree !== null) out.push({ workspace: plan.workspace, tree: plan.currentTree });
      for (const checkpoint of plan.checkpoints) {
        if (checkpoint.git !== null) out.push({ workspace: plan.workspace, tree: checkpoint.git.beforeTree });
      }
    }
    return out;
  }
  async putCheckpoint(checkpoint) {
    if (this.disposed) return;
    const rows = this.document.checkpoints[checkpoint.sessionId] ?? [];
    const next = rows.filter((row) => row.turn !== checkpoint.turn);
    next.push(checkpoint);
    next.sort((a, b) => a.turn - b.turn);
    this.document.checkpoints[checkpoint.sessionId] = next;
    await this.save();
    const storageDir = this.storageOf(checkpoint);
    const runPrune = this.pruning.then(async () => {
      if (this.disposed) return;
      try {
        const result = await pruneRewindStorage({
          storageDir,
          defaultStorageDir: this.defaultStorage,
          limitBytes: this.runtimeConfig().storageLimitBytes,
          checkpoints: this.document.checkpoints,
          protectedTrees: this.protectedTrees(),
          signal: this.abort.signal,
          warn: (message) => this.warn(message)
        });
        if (result.changed && !this.disposed) await this.save();
      } catch (error) {
        if (!this.disposed) this.warn("storage prune failed: " + messageOf(error));
      }
    });
    this.pruning = runPrune.then(() => void 0, () => void 0);
    await runPrune;
  }
  checkpointStorage() {
    return this.runtimeConfig().storageDir;
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
  workspaceOf(stored, storage) {
    const objects = join(storage, "objects");
    return {
      root: stored.root,
      gitDir: stored.gitDir,
      repositoryObjects: stored.repositoryObjects,
      objects,
      env: {
        GIT_OBJECT_DIRECTORY: objects,
        GIT_ALTERNATE_OBJECT_DIRECTORIES: stored.repositoryObjects
      }
    };
  }
  capture(absolute, storage) {
    return captureFile(absolute, storage, MAX_CAPTURE_BYTES);
  }
  async captureFor(recorder, absolute, turn, storage) {
    const capture = await this.capture(absolute, storage);
    recorder.remember(absolute, capture, turn);
  }
  restoreCapture(absolute, capture, storage) {
    return restoreCapturedFile(absolute, capture, storage);
  }
  conversationFor(sessionId) {
    return this.document.conversations.find((conversation) => conversation.activeSessionId === sessionId) ?? this.document.conversations.find((conversation) => conversation.revisions.some((revision) => revision.sessionId === sessionId));
  }
  workspaceRegistry() {
    const registry = this.ctx.get("workspaceRegistry");
    return registry !== null && typeof registry === "object" ? registry : null;
  }
  async storedSessionIds() {
    const persistence = this.ctx.get("sessionPersistence");
    if (typeof persistence?.list !== "function") return null;
    const listed = await persistence.list();
    const ids = /* @__PURE__ */ new Set();
    for (const entry of listed) {
      const id = entry?.header?.id;
      if (typeof id === "string" && id !== "") ids.add(id);
    }
    return ids;
  }
  async sessionKnown(sessionId, storedIds) {
    if (this.liveSessions()?.get?.(sessionId) !== void 0) return true;
    if (storedIds !== null) return storedIds.has(sessionId);
    const query = this.ctx.get("sessionQuery");
    if (typeof query?.observeSession !== "function") return true;
    try {
      const observation = await query.observeSession(sessionId, { projectionMode: "none" });
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
    const storedIds = this.document.conversations.length === 0 ? null : await this.storedSessionIds();
    let changed = false;
    for (const conversation of this.document.conversations) {
      for (const revision of conversation.revisions) {
        const active = revision.sessionId === conversation.activeSessionId;
        const known = await this.sessionKnown(revision.sessionId, storedIds);
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
    let reason = target === void 0 ? "missing-target" : "";
    if (reason === "" && checkpoints.some((checkpoint) => checkpoint === void 0)) reason = "incomplete-later";
    if (checkpoints.some((checkpoint) => checkpoint?.complete === false)) {
      reason = checkpoints.find((checkpoint) => checkpoint?.complete === false)?.reason || "unrestorable-files";
    }
    if (target?.git != null && checkpoints.some((checkpoint) => checkpoint?.git?.root !== target.git?.root)) {
      reason = "workspace-moved";
    }
    const storage = this.storageOf(target);
    let workspace = null;
    let currentTree = null;
    let skipPaths = /* @__PURE__ */ new Set();
    let files = [];
    if (reason === "" && target?.git != null) {
      workspace = this.workspaceOf(target.git, storage);
      const currentSnap = await snapshotTree(workspace, storage, this.snapshotOptions());
      currentTree = currentSnap.tree;
      skipPaths = /* @__PURE__ */ new Set([...target.git.oversized ?? [], ...currentSnap.oversized]);
      files = await diffTrees(workspace, target.git.beforeTree, currentTree, skipPaths, this.abort.signal);
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
      storage,
      checkpoints: checkpoints.filter((checkpoint) => checkpoint !== void 0),
      workspace,
      currentTree,
      skipPaths
    };
    this.plans.set(id, plan);
    const {
      createdAt: _createdAt,
      headSeq: _headSeq,
      storage: _storage,
      checkpoints: _checkpoints,
      workspace: _workspace,
      currentTree: _currentTree,
      skipPaths: _skipPaths,
      ...answer
    } = plan;
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
    let skipPaths = plan.skipPaths;
    if (plan.workspace !== null && plan.currentTree !== null) {
      const currentSnap = await snapshotTree(plan.workspace, plan.storage, this.snapshotOptions());
      if (currentSnap.tree !== plan.currentTree) throw new Error("session rewind: the work tree changed after confirmation");
      skipPaths = /* @__PURE__ */ new Set([...plan.skipPaths, ...currentSnap.oversized]);
    }
    const paths = [...new Set(plan.checkpoints.flatMap((checkpoint) => Object.keys(checkpoint.captures)))];
    const safety = /* @__PURE__ */ new Map();
    for (const path of paths) {
      const capture = await this.capture(path, plan.storage);
      if (capture.kind === "oversized" || capture.kind === "unsupported") throw new Error(`cannot protect current file ${path}`);
      safety.set(path, capture);
    }
    const target = plan.checkpoints.find((checkpoint) => checkpoint.turn === plan.turn);
    try {
      if (plan.workspace !== null && plan.currentTree !== null && target?.git != null) {
        await applyTree(plan.workspace, plan.storage, target.git.beforeTree, plan.currentTree, skipPaths, this.abort.signal);
      }
      const ordered = [...plan.checkpoints].sort((a, b) => b.turn - a.turn);
      for (const checkpoint of ordered) {
        const storage = this.storageOf(checkpoint);
        for (const [path, capture] of Object.entries(checkpoint.captures)) await this.restoreCapture(path, capture, storage);
      }
    } catch (error) {
      try {
        for (const [path, capture] of safety) await this.restoreCapture(path, capture, plan.storage);
        if (plan.workspace !== null && plan.currentTree !== null && target?.git != null) {
          await applyTree(plan.workspace, plan.storage, plan.currentTree, target.git.beforeTree, skipPaths, this.abort.signal);
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
      storage: this.owner.checkpointStorage(),
      captures: /* @__PURE__ */ new Map(),
      git: null,
      beforeTree: null,
      oversized: [],
      complete: true,
      reason: ""
    };
    this.active = state;
    this.enqueue(async () => {
      try {
        state.git = await locateGit(state.cwd, state.storage, this.owner.signal());
        if (state.git !== null) {
          const snap = await snapshotTree(state.git, state.storage, this.owner.snapshotOptions());
          state.beforeTree = snap.tree;
          state.oversized = snap.oversized;
        }
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
        storage: state.storage,
        git: state.git !== null && state.beforeTree !== null ? {
          cwd: state.cwd,
          root: state.git.root,
          gitDir: state.git.gitDir,
          repositoryObjects: state.git.repositoryObjects,
          beforeTree: state.beforeTree,
          ...state.oversized.length > 0 ? { oversized: state.oversized } : {}
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
        await this.owner.captureFor(this, path, state.turn, state.storage);
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
