// packages/host/src/usage-cache.ts
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { addBuckets, emptyBuckets } from "./usage-ledger.js";
var CACHE_VERSION = 4;
function cacheFile(home) {
  return join(home, "cache", "dsh-claude-style", "usage.json");
}
function hoursFrom(raw) {
  return Array.isArray(raw) && raw.length === 24 ? raw.map((value) => Number.isFinite(Number(value)) ? Number(value) : 0) : new Array(24).fill(0);
}
function daysToObject(days) {
  const out = {};
  for (const [day, buckets] of days) {
    const entry = { ...buckets, models: void 0, sessions: void 0 };
    const cells = {};
    if (buckets.models !== void 0) {
      for (const [model, cell] of buckets.models) cells[model] = cell;
      entry.models = cells;
    }
    out[day] = entry;
  }
  return out;
}
function daysFromObject(raw) {
  const days = /* @__PURE__ */ new Map();
  if (raw === null || typeof raw !== "object") return days;
  for (const [day, buckets] of Object.entries(raw)) {
    if (buckets === null || typeof buckets !== "object") continue;
    const stored = buckets;
    const clean = emptyBuckets();
    addBuckets(clean, stored, 1);
    clean.hours = hoursFrom(stored.hours);
    if (stored.models !== null && typeof stored.models === "object") {
      const models = /* @__PURE__ */ new Map();
      for (const [model, cell] of Object.entries(stored.models)) {
        if (cell === null || typeof cell !== "object") continue;
        const into = emptyBuckets();
        addBuckets(into, cell, 1);
        models.set(model, into);
      }
      clean.models = models;
    }
    days.set(day, clean);
  }
  return days;
}
function readCache(ctx, home) {
  const file = cacheFile(home);
  if (!existsSync(file)) return /* @__PURE__ */ new Map();
  let parsed;
  try {
    parsed = JSON.parse(readFileSync(file, "utf8"));
  } catch (error) {
    ctx.logger?.warn?.(`dsh-claude-style: usage cache unreadable, folding again: ${error.message}`);
    return /* @__PURE__ */ new Map();
  }
  if (parsed === null || typeof parsed !== "object") return /* @__PURE__ */ new Map();
  const document = parsed;
  if (document.version !== CACHE_VERSION) return /* @__PURE__ */ new Map();
  const sessions = /* @__PURE__ */ new Map();
  const rawSessions = document.sessions;
  if (rawSessions === null || typeof rawSessions !== "object") return sessions;
  for (const [id, value] of Object.entries(rawSessions)) {
    if (value === null || typeof value !== "object") continue;
    const entry = value;
    if (!Number.isFinite(entry.size) || !Number.isFinite(entry.mtimeMs)) continue;
    sessions.set(id, {
      size: Number(entry.size),
      mtimeMs: Number(entry.mtimeMs),
      days: daysFromObject(entry.days),
      hours: hoursFrom(entry.hours)
    });
  }
  return sessions;
}
function writeCache(ctx, home, sessions) {
  const document = { version: CACHE_VERSION, computedAt: Date.now(), sessions: {} };
  for (const [id, entry] of sessions) {
    document.sessions[id] = { size: entry.size, mtimeMs: entry.mtimeMs, days: daysToObject(entry.days), hours: entry.hours };
  }
  const path = cacheFile(home);
  const temp = `${path}.${process.pid}.tmp`;
  try {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(temp, JSON.stringify(document), "utf8");
    renameSync(temp, path);
  } catch (error) {
    ctx.logger?.warn?.(`dsh-claude-style: usage cache not written: ${error.message}`);
  }
}
export {
  readCache,
  writeCache
};
