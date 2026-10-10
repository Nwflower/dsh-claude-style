// packages/host/src/usage-fold.ts
import { existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { BUCKET_KEYS, addBuckets, emptyBuckets } from "./usage-ledger.js";
var SESSION_LOG = /^session(?:\.v([1-9][0-9]*))?\.jsonl(?:\.zstd)?$/i;
function dayKey(time) {
  const date = new Date(time);
  if (!Number.isFinite(date.getTime())) return null;
  const pad = (value) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
function usageOf(event) {
  const data = event?.data;
  if (data === null || data === void 0 || typeof data !== "object") return void 0;
  if (event.type === "assistant/message" && data.usage !== void 0) return data.usage;
  if (event.type !== "assistant/message" && event.type !== "assistant/attempt") return void 0;
  const stream = data.stream;
  if (!Array.isArray(stream)) return void 0;
  for (let index = stream.length - 1; index >= 0; index -= 1) {
    const record = stream[index];
    if (record !== null && typeof record === "object" && record.type === "chunk" && record.chunk !== null && typeof record.chunk === "object" && record.chunk.type === "usage") {
      return record.chunk.usage;
    }
  }
  return void 0;
}
function bucketsFrom(usage) {
  const count = (value) => Number.isFinite(Number(value)) ? Number(value) : 0;
  return {
    input: count(usage?.inputTokens),
    output: count(usage?.outputTokens),
    cacheRead: count(usage?.cacheReadTokens),
    cacheWrite: count(usage?.cacheWriteTokens),
    calls: 1
  };
}
function bucketsEqual(left, right) {
  return BUCKET_KEYS.every((key) => left[key] === right[key]);
}
function modelOf(event) {
  const model = event?.data?.message?.source?.model;
  return typeof model === "string" && model !== "" ? model : null;
}
function foldSession(events) {
  const days = /* @__PURE__ */ new Map();
  const hours = new Array(24).fill(0);
  const bump = (day, hour, buckets, sign, model) => {
    hours[hour] += sign;
    let target = days.get(day);
    if (target === void 0) {
      if (sign < 0) return;
      const fresh = emptyBuckets();
      fresh.hours = new Array(24).fill(0);
      fresh.models = /* @__PURE__ */ new Map();
      days.set(day, fresh);
      target = fresh;
    }
    const targetHours = target.hours ?? (target.hours = new Array(24).fill(0));
    targetHours[hour] += sign;
    addBuckets(target, buckets, sign);
    if (model !== null) {
      const models = target.models ?? (target.models = /* @__PURE__ */ new Map());
      let cell = models.get(model);
      if (cell === void 0 && sign > 0) {
        if (target.models === void 0) target.models = /* @__PURE__ */ new Map();
        cell = emptyBuckets();
        models.set(model, cell);
      }
      if (cell !== void 0) {
        addBuckets(cell, buckets, sign);
        if (sign < 0 && BUCKET_KEYS.every((key) => cell[key] === 0) && cell.calls === 0) models.delete(model);
      }
    }
    if (sign < 0 && BUCKET_KEYS.every((key) => target[key] === 0) && target.calls === 0) days.delete(day);
  };
  let last = null;
  for (const event of events) {
    const type = event?.type;
    if (type === "llm/retry-started") {
      const data = event.data;
      if (last !== null && last.turn === data?.turn && last.step === data?.step) last = null;
      continue;
    }
    if (type !== "assistant/message" && type !== "assistant/attempt") continue;
    const usage = usageOf(event);
    if (usage === void 0) continue;
    if (typeof event.time !== "number") continue;
    const day = dayKey(event.time);
    if (day === null) continue;
    const hour = new Date(event.time).getHours();
    const buckets = bucketsFrom(usage);
    const model = modelOf(event);
    const turn = event.data?.turn;
    const step = event.data?.step;
    const previous = last;
    const replacing = previous !== null && previous.turn === turn && previous.step === step;
    if (replacing && previous !== null && bucketsEqual(previous.buckets, buckets)) continue;
    if (replacing && previous !== null) bump(previous.day, previous.hour, previous.buckets, -1, previous.model);
    bump(day, hour, buckets, 1, model);
    last = { turn, step, buckets, day, hour, model };
  }
  return { days, hours };
}
function newestLog(dir) {
  let best = null;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isFile()) continue;
    const match = SESSION_LOG.exec(entry.name);
    if (match === null) continue;
    const version = Number(match[1] ?? 0);
    const compressed = /\.zstd$/i.test(entry.name);
    if (best === null || version > best.version || version === best.version && Number(compressed) > Number(best.compressed)) {
      best = { name: entry.name, version, compressed };
    }
  }
  if (best === null) return null;
  const path = join(dir, best.name);
  const stat = statSync(path);
  return { path, size: stat.size, mtimeMs: stat.mtimeMs };
}
function listSessionLogs(root) {
  const out = [];
  if (!existsSync(root)) return out;
  for (const project of readdirSync(root, { withFileTypes: true })) {
    if (!project.isDirectory()) continue;
    for (const session of readdirSync(join(root, project.name), { withFileTypes: true })) {
      if (!session.isDirectory()) continue;
      const log = newestLog(join(root, project.name, session.name));
      if (log === null) continue;
      out.push({ id: session.name, ...log });
    }
  }
  return out;
}
export {
  dayKey,
  foldSession,
  listSessionLogs
};
