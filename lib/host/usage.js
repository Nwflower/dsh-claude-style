// packages/contracts/src/package.ts
var PACKAGE_NAME = "dsh-claude-style";

// packages/host/src/usage.ts
import { join as join2, resolve } from "node:path";

// packages/engine/node/harness-home.ts
import { homedir } from "node:os";
import { join } from "node:path";
function harnessPath(ctx, ...segments) {
  const resolvePath = ctx.get("dshHomePath");
  if (typeof resolvePath === "function") return resolvePath(...segments);
  return join(process.env.DSH_HOME ?? join(homedir(), ".dsh"), ...segments);
}

// packages/host/src/usage.ts
import { readRecord, writeRecord } from "./usage-record.js";

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
    if (typeof query.observeSession === "function") {
      const observation = await query.observeSession(sessionId, { projectionMode: "none" });
      try {
        return eventsOf(observation.events);
      } finally {
        releaseObservation(observation);
      }
    }
    if (typeof query.readSession !== "function") return null;
    const snapshot = await query.readSession(sessionId);
    return eventsOf(snapshot?.events);
  } catch (error) {
    if (unreadableLog(error) === null) throw error;
    reportUnreadable(ctx, packageName, error, sessionId, label);
    return null;
  }
}

// packages/host/src/usage.ts
import { foldSession, listSessionLogs } from "./usage-fold.js";
import { readLedger } from "./usage-ledger.js";
import { mergeLedgerFold, summarize } from "./usage-summary.js";
var LEDGER_SOURCE = "cost-meter";
var LOCAL_SOURCE = "local";
var USAGE_TTL_MS = 30 * 1e3;
var SLOW_PASS_FACTOR = 2;
function recheckDelay(durationMs) {
  return Math.max(USAGE_TTL_MS, durationMs * SLOW_PASS_FACTOR);
}
function messageOf(error) {
  return String(error?.message ?? error);
}
function hoursOf(days) {
  const hours = new Array(24).fill(0);
  for (const buckets of days.values()) {
    if (buckets.hours === void 0) continue;
    for (let hour = 0; hour < 24; hour += 1) hours[hour] += Number(buckets.hours[hour]) || 0;
  }
  return hours;
}
function recordChanged(stored, sessions, read) {
  if (read > 0 || stored.size !== sessions.size) return true;
  for (const [id, entry] of sessions) {
    const held = stored.get(id);
    if (held === void 0 || held.days.size !== entry.days.size) return true;
    if (held.fingerprint !== void 0 !== (entry.fingerprint !== void 0)) return true;
  }
  return false;
}
function createUsage(ctx) {
  const home = () => harnessPath(ctx);
  let state = null;
  let pending = null;
  let nextAt = 0;
  let disposed = false;
  async function computeLocal(logs, ledgerDays) {
    const record = readRecord(ctx);
    const sessions = /* @__PURE__ */ new Map();
    let read = 0;
    let failed = 0;
    let firstFailure = null;
    for (const log of logs) {
      const stored = record.sessions.get(log.storedName);
      const fingerprint = stored?.fingerprint;
      if (stored !== void 0 && fingerprint !== void 0 && fingerprint.size === log.size && fingerprint.mtimeMs === log.mtimeMs) {
        sessions.set(log.storedName, stored);
        continue;
      }
      let events;
      try {
        events = await readEvents(ctx, PACKAGE_NAME, log.id, "the usage roll-up");
      } catch (error) {
        failed += 1;
        firstFailure = firstFailure ?? `${log.id}: ${messageOf(error)}`;
        if (stored !== void 0) sessions.set(log.storedName, stored);
        continue;
      }
      if (events === null) {
        failed += 1;
        if (stored !== void 0) sessions.set(log.storedName, stored);
        continue;
      }
      sessions.set(log.storedName, { fingerprint: { size: log.size, mtimeMs: log.mtimeMs }, days: foldSession(events).days });
      read += 1;
    }
    if (firstFailure !== null) {
      ctx.logger?.warn?.(`${PACKAGE_NAME}: ${failed} session log(s) left out of the usage roll-up; the rest are recorded (first: ${firstFailure})`);
    }
    for (const [id, stored] of record.sessions) {
      if (!sessions.has(id) && stored.days.size > 0) sessions.set(id, { days: stored.days });
    }
    const recorded = !disposed && record.writable && (record.mustWrite || recordChanged(record.sessions, sessions, read)) ? writeRecord(ctx, sessions, new Set(logs.map((log) => log.storedName))) : sessions;
    const merge = mergeLedgerFold(ledgerDays, recorded);
    const source = ledgerDays === null ? LOCAL_SOURCE : merge.folded ? `${LEDGER_SOURCE}+${LOCAL_SOURCE}` : LEDGER_SOURCE;
    const summary = summarize(
      merge.days,
      merge.sessionIds.size,
      source,
      merge.days.size === 0 ? void 0 : hoursOf(merge.days),
      { sessionIds: merge.sessionIds }
    );
    if (sessions.size === 0 && failed > 0) {
      return { ...summary, unavailable: true, reason: "session-query-unavailable" };
    }
    return { ...summary, read, failed, sessions: logs.length };
  }
  async function compute(publish) {
    const root = resolve(join2(home(), "sessions"));
    const logs = await listSessionLogs(root);
    const ledgerDays = readLedger(home(), ctx.logger);
    if (ledgerDays !== null && ledgerDays.size > 0) {
      const sessionIds = /* @__PURE__ */ new Set();
      for (const buckets of ledgerDays.values()) {
        for (const id of buckets.sessionIds ?? []) sessionIds.add(id);
      }
      publish({ ...summarize(ledgerDays, sessionIds.size, LEDGER_SOURCE), sessions: logs.length });
    }
    return await computeLocal(logs, ledgerDays);
  }
  function refresh() {
    if (disposed) return Promise.resolve(null);
    if (pending !== null) return pending;
    if (state !== null && Date.now() < nextAt) return Promise.resolve(state.value);
    state = state === null ? { value: null, computing: true } : { ...state, computing: true };
    const startedAt = Date.now();
    const finish = () => {
      pending = null;
      const finishedAt = Date.now();
      nextAt = finishedAt + recheckDelay(finishedAt - startedAt);
    };
    pending = compute((partial) => {
      if (!disposed) state = { value: partial, computing: true };
    }).then(
      (value) => {
        finish();
        if (disposed) return value;
        state = { value, computing: false };
        return value;
      },
      (error) => {
        finish();
        if (!disposed) state = { value: state?.value ?? null, computing: false, error: messageOf(error) };
        return null;
      }
    );
    return pending ?? Promise.resolve(null);
  }
  return {
    /** The current state: a value, a computing flag, and the last error if any. */
    snapshot() {
      return state === null ? { ok: true, value: null, computing: false } : { ok: true, value: state.value, computing: state.computing === true, error: state.error };
    },
    refresh,
    dispose() {
      disposed = true;
    }
  };
}
export {
  createUsage
};
