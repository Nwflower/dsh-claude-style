// packages/host/src/usage-summary.ts
import { BUCKET_KEYS, addBuckets, emptyBuckets } from "./usage-ledger.js";
import { dayKey } from "./usage-fold.js";
function bucketTotal(buckets) {
  let total = 0;
  for (const key of BUCKET_KEYS) total += Number(buckets?.[key]) || 0;
  return total;
}
function mergeSessions(sessions) {
  const days = /* @__PURE__ */ new Map();
  const hours = new Array(24).fill(0);
  const seen = /* @__PURE__ */ new Set();
  for (const [id, entry] of sessions) {
    seen.add(id);
    if (Array.isArray(entry.hours)) {
      for (let hour = 0; hour < 24; hour += 1) hours[hour] += Number(entry.hours[hour]) || 0;
    }
    for (const [day, buckets] of entry.days) {
      let target = days.get(day);
      if (target === void 0) {
        target = emptyBuckets();
        target.sessions = /* @__PURE__ */ new Set();
        target.hours = new Array(24).fill(0);
        days.set(day, target);
      }
      addBuckets(target, buckets, 1);
      if (target.sessions instanceof Set) target.sessions.add(id);
      const dayHours = target.hours ?? (target.hours = new Array(24).fill(0));
      for (let hour = 0; hour < 24; hour += 1) dayHours[hour] += (buckets.hours ?? [])[hour] ?? 0;
      if (buckets.models === void 0) continue;
      for (const [model, cell] of buckets.models) {
        if (target.models === void 0) target.models = /* @__PURE__ */ new Map();
        let into = target.models.get(model);
        if (into === void 0) {
          into = emptyBuckets();
          target.models.set(model, into);
        }
        addBuckets(into, cell, 1);
      }
    }
  }
  for (const day of days.values()) {
    const behind = day.sessions instanceof Set ? [...day.sessions].sort() : [];
    day.sessionIds = behind;
    day.sessions = behind.length;
  }
  return { days, sessionCount: seen.size, hours };
}
function summarize(days, sessionCount, source, hours, window) {
  const inWindow = (date) => window?.dates === void 0 || window.dates.has(date);
  const list = [...days.entries()].map(([date, buckets]) => ({
    date,
    input: buckets.input,
    output: buckets.output,
    cacheRead: buckets.cacheRead,
    cacheWrite: buckets.cacheWrite,
    calls: buckets.calls,
    sessions: Number.isFinite(buckets.sessions) ? buckets.sessions : 0,
    // The ids behind the day, so the dashboard can union them over any range
    // window instead of summing per-day counts (a two-day session is one).
    sessionIds: buckets.sessionIds === void 0 ? [] : [...buckets.sessionIds].filter((id) => typeof id === "string").sort(),
    // The day's tokens per model, for the models chart. Absent when nothing
    // on the day is attributed to a model.
    models: buckets.models === void 0 ? void 0 : Object.fromEntries([...buckets.models].map(([id, cell]) => [id, bucketTotal(cell)])),
    // The day's settlements per hour, so a range window can find its own peak
    // hour. Only the fold knows the hour of a settlement.
    ...buckets.hours === void 0 ? {} : { hours: buckets.hours }
  })).sort((left, right) => left.date < right.date ? -1 : 1);
  const totals = emptyBuckets();
  const byModel = /* @__PURE__ */ new Map();
  for (const [date, buckets] of days) {
    if (!inWindow(date)) continue;
    addBuckets(totals, buckets, 1);
    if (buckets.models === void 0) continue;
    for (const [id, cell] of buckets.models) {
      let into = byModel.get(id);
      if (into === void 0) {
        into = emptyBuckets();
        byModel.set(id, into);
      }
      addBuckets(into, cell, 1);
    }
  }
  const models = [...byModel.entries()].map(([id, cell]) => ({ id, ...cell, tokens: bucketTotal(cell) })).sort((left, right) => right.tokens - left.tokens);
  const count = window?.sessionIds === void 0 ? sessionCount : window.sessionIds.size;
  return {
    source,
    computedAt: Date.now(),
    days: list,
    models,
    firstDay: list.length === 0 ? null : list[0].date,
    lastDay: list.length === 0 ? null : list[list.length - 1].date,
    // The fold knows the hour of every settlement; the cost-meter ledger has
    // no hour dimension, so its histogram arrives from the fold afterwards.
    ...hours === void 0 ? {} : { hours },
    totals: {
      ...totals,
      sessions: count,
      activeDays: list.filter((day) => inWindow(day.date)).length
    }
  };
}
function mergeLedgerFold(ledgerDays, sessions, logs) {
  const days = /* @__PURE__ */ new Map();
  const sessionIds = /* @__PURE__ */ new Set();
  let lastLedgerDay = "";
  for (const [date, buckets] of ledgerDays) {
    days.set(date, buckets);
    if (date > lastLedgerDay) lastLedgerDay = date;
    for (const id of buckets.sessionIds ?? []) sessionIds.add(id);
  }
  let folded = false;
  for (const [date, buckets] of mergeSessions(sessions).days) {
    if (date <= lastLedgerDay) continue;
    days.set(date, buckets);
    folded = true;
  }
  for (const log of logs) {
    const date = dayKey(log.mtimeMs);
    if (date !== null && date > lastLedgerDay) sessionIds.add(log.id);
  }
  return { days, sessionIds, folded };
}
export {
  mergeLedgerFold,
  mergeSessions,
  summarize
};
