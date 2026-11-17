// packages/contracts/src/package.ts
var PACKAGE_NAME = "dsh-claude-style";

// packages/host/src/usage-record.ts
import { existsSync, renameSync, unlinkSync } from "node:fs";
import { cachePath, readJsonDocument, writeJsonDocument } from "./cache-file.js";
import { pluginPath } from "./harness-home.js";
import { BUCKET_KEYS, addBuckets, emptyBuckets } from "./usage-ledger.js";
var RECORD_VERSION = 1;
var RECORD_FILE = "usage.json";
var LEGACY_CACHE_VERSION = 4;
var NO_ROUTE = "";
var CELL_KEYS = [...BUCKET_KEYS, "calls"];
function bucketsFromCell(cell) {
  if (!Array.isArray(cell)) return null;
  const buckets = emptyBuckets();
  for (let at = 0; at < CELL_KEYS.length; at += 1) {
    const value = Number(cell[at]);
    if (Number.isFinite(value)) buckets[CELL_KEYS[at]] = value;
  }
  return buckets;
}
function cellFromBuckets(buckets) {
  return CELL_KEYS.map((key) => buckets[key]);
}
function hoursFromSlots(raw) {
  if (raw === null || typeof raw !== "object") return null;
  const hours = new Array(24).fill(0);
  let settled = false;
  for (const [slot, count] of Object.entries(raw)) {
    const hour = Number(slot);
    const value = Number(count);
    if (!Number.isInteger(hour) || hour < 0 || hour > 23 || !Number.isFinite(value) || value === 0) continue;
    hours[hour] += value;
    settled = true;
  }
  return settled ? hours : null;
}
function slotsFromHours(hours) {
  if (!Array.isArray(hours)) return null;
  const slots = {};
  let settled = false;
  for (let hour = 0; hour < 24; hour += 1) {
    const count = Number(hours[hour]) || 0;
    if (count === 0) continue;
    slots[String(hour)] = count;
    settled = true;
  }
  return settled ? slots : null;
}
function isEmptyDay(buckets, hours) {
  if (hours !== null) return false;
  return BUCKET_KEYS.every((key) => buckets[key] === 0) && buckets.calls === 0;
}
function storedDay(raw) {
  return raw !== null && typeof raw === "object" ? raw : null;
}
function daysFromStored(raw) {
  const days = /* @__PURE__ */ new Map();
  if (raw === null || typeof raw !== "object") return days;
  for (const [day, value] of Object.entries(raw)) {
    const stored = storedDay(value);
    if (stored === null) continue;
    const buckets = emptyBuckets();
    const models = /* @__PURE__ */ new Map();
    if (stored.m !== null && typeof stored.m === "object") {
      for (const [route, cell] of Object.entries(stored.m)) {
        const counts = bucketsFromCell(cell);
        if (counts === null) continue;
        addBuckets(buckets, counts, 1);
        if (route !== NO_ROUTE) models.set(route, counts);
      }
    }
    const hours = hoursFromSlots(stored.h);
    if (isEmptyDay(buckets, hours)) continue;
    if (models.size > 0) buckets.models = models;
    if (hours !== null) buckets.hours = hours;
    days.set(day, buckets);
  }
  return days;
}
function dayToStored(buckets) {
  const rest = emptyBuckets();
  addBuckets(rest, buckets, 1);
  const routes = {};
  if (buckets.models !== void 0) {
    for (const [model, cell] of buckets.models) {
      routes[model] = cellFromBuckets(cell);
      addBuckets(rest, cell, -1);
    }
  }
  if (CELL_KEYS.some((key) => rest[key] !== 0)) routes[NO_ROUTE] = cellFromBuckets(rest);
  const stored = { m: routes };
  const hours = slotsFromHours(buckets.hours);
  if (hours !== null) stored.h = hours;
  return stored;
}
function sessionToStored(entry) {
  const stored = {};
  if (entry.fingerprint !== void 0) {
    stored.size = entry.fingerprint.size;
    stored.mtimeMs = entry.fingerprint.mtimeMs;
  }
  if (entry.days.size === 0) return stored;
  const days = {};
  for (const [day, buckets] of entry.days) days[day] = dayToStored(buckets);
  stored.days = days;
  return stored;
}
function sessionFromStored(value) {
  if (value === null || typeof value !== "object") return null;
  const stored = value;
  const days = daysFromStored(stored.days);
  if (!Number.isFinite(stored.size) || !Number.isFinite(stored.mtimeMs)) {
    return days.size === 0 ? null : { days };
  }
  return { fingerprint: { size: Number(stored.size), mtimeMs: Number(stored.mtimeMs) }, days };
}
function hoursFromArray(raw) {
  if (!Array.isArray(raw) || raw.length !== 24) return null;
  const hours = new Array(24).fill(0);
  let settled = false;
  for (let hour = 0; hour < 24; hour += 1) {
    const count = Number(raw[hour]) || 0;
    hours[hour] = count;
    if (count !== 0) settled = true;
  }
  return settled ? hours : null;
}
function legacyDays(raw) {
  const days = /* @__PURE__ */ new Map();
  if (raw === null || typeof raw !== "object") return days;
  for (const [day, value] of Object.entries(raw)) {
    const stored = storedDay(value);
    if (stored === null) continue;
    const buckets = emptyBuckets();
    addBuckets(buckets, stored, 1);
    if (stored.models !== null && typeof stored.models === "object") {
      const models = /* @__PURE__ */ new Map();
      for (const [model, cell] of Object.entries(stored.models)) {
        if (cell === null || typeof cell !== "object") continue;
        const counts = emptyBuckets();
        addBuckets(counts, cell, 1);
        models.set(model, counts);
      }
      if (models.size > 0) buckets.models = models;
    }
    const hours = hoursFromArray(stored.hours);
    if (isEmptyDay(buckets, hours)) continue;
    if (hours !== null) buckets.hours = hours;
    days.set(day, buckets);
  }
  return days;
}
function legacyCachePath(ctx) {
  return cachePath(ctx, RECORD_FILE);
}
function legacyRecord(ctx) {
  const path = legacyCachePath(ctx);
  if (!existsSync(path)) return null;
  const sessions = /* @__PURE__ */ new Map();
  const parsed = readJsonDocument(ctx, path, "usage cache");
  if (parsed === null || typeof parsed !== "object") return sessions;
  const document = parsed;
  if (document.version !== LEGACY_CACHE_VERSION) return sessions;
  if (document.sessions === null || typeof document.sessions !== "object") return sessions;
  for (const [id, value] of Object.entries(document.sessions)) {
    if (value === null || typeof value !== "object") continue;
    const entry = value;
    if (!Number.isFinite(entry.size) || !Number.isFinite(entry.mtimeMs)) continue;
    const days = legacyDays(entry.days);
    if (days.size === 0) continue;
    sessions.set(id, { fingerprint: { size: Number(entry.size), mtimeMs: Number(entry.mtimeMs) }, days });
  }
  return sessions;
}
function readStored(ctx) {
  const path = pluginPath(ctx, RECORD_FILE);
  const parsed = readJsonDocument(ctx, path, "usage record");
  if (parsed === null || typeof parsed !== "object") {
    if (existsSync(path)) {
      const aside = `${path}.corrupt-${Date.now()}`;
      renameSync(path, aside);
      ctx.logger?.warn?.(`${PACKAGE_NAME}: usage record moved aside to ${aside}; it is rebuilt from the session logs`);
    }
    return { kind: "absent" };
  }
  const document = parsed;
  if (document.version !== RECORD_VERSION) {
    ctx.logger?.warn?.(`${PACKAGE_NAME}: usage record version ${String(document.version)} is not one this build reads; it is left as it stands`);
    return { kind: "foreign" };
  }
  const sessions = /* @__PURE__ */ new Map();
  if (document.sessions === null || typeof document.sessions !== "object") return { kind: "ours", sessions };
  for (const [id, value] of Object.entries(document.sessions)) {
    const entry = sessionFromStored(value);
    if (entry !== null) sessions.set(id, entry);
  }
  return { kind: "ours", sessions };
}
function readRecord(ctx) {
  const stored = readStored(ctx);
  if (stored.kind === "foreign") return { sessions: /* @__PURE__ */ new Map(), mustWrite: false, writable: false };
  const sessions = stored.kind === "ours" ? stored.sessions : /* @__PURE__ */ new Map();
  const legacy = legacyRecord(ctx);
  for (const [id, entry] of legacy ?? []) {
    if (!sessions.has(id)) sessions.set(id, entry);
  }
  return { sessions, mustWrite: stored.kind === "absent" || legacy !== null, writable: true };
}
function overStored(stored, sessions, live) {
  const merged = new Map(sessions);
  for (const [id, held] of stored) {
    if (sessions.get(id)?.fingerprint !== void 0) continue;
    if (live.has(id)) merged.set(id, held);
    else if (held.days.size > 0) merged.set(id, { days: held.days });
  }
  return merged;
}
function writeRecord(ctx, sessions, live) {
  const stored = readStored(ctx);
  if (stored.kind === "foreign") return sessions;
  const merged = stored.kind === "ours" ? overStored(stored.sessions, sessions, live) : sessions;
  const document = {
    version: RECORD_VERSION,
    computedAt: Date.now(),
    sessions: {}
  };
  for (const [id, entry] of merged) document.sessions[id] = sessionToStored(entry);
  if (!writeJsonDocument(ctx, pluginPath(ctx, RECORD_FILE), "usage record", document)) return merged;
  const legacy = legacyCachePath(ctx);
  if (existsSync(legacy)) unlinkSync(legacy);
  return merged;
}
export {
  readRecord,
  writeRecord
};
