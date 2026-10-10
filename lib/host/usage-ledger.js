// packages/host/src/usage-ledger.ts
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
var LEDGER_VERSION = 1;
var BUCKET_KEYS = ["input", "output", "cacheRead", "cacheWrite"];
function emptyBuckets() {
  return { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, calls: 0 };
}
function addBuckets(target, buckets, sign) {
  if (buckets === null || buckets === void 0) return;
  for (const key of BUCKET_KEYS) {
    const value = Number(buckets?.[key]);
    if (Number.isFinite(value) && value !== 0) target[key] += sign * value;
  }
  target.calls += sign * (Number.isFinite(Number(buckets?.calls)) ? Number(buckets.calls) : 0);
}
function readLedger(home) {
  const file = join(home, "storages", "cost-meter", "ledger.json");
  if (!existsSync(file)) return null;
  const raw = readFileSync(file, "utf8");
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (parsed === null || typeof parsed !== "object") return null;
  const ledger = parsed;
  if (ledger.version !== LEDGER_VERSION) return null;
  const rawDays = ledger.days;
  if (rawDays === null || typeof rawDays !== "object" || Array.isArray(rawDays)) return null;
  const days = /* @__PURE__ */ new Map();
  for (const [day, value] of Object.entries(rawDays)) {
    if (value === null || typeof value !== "object") continue;
    const bucket = value;
    const clean = emptyBuckets();
    addBuckets(clean, {
      input: bucket.input,
      output: bucket.output,
      cacheRead: bucket.cacheRead,
      cacheWrite: bucket.cacheWrite,
      calls: bucket.calls
    }, 1);
    clean.sessionIds = Array.isArray(bucket.sessions) ? bucket.sessions.map((entry) => entry !== null && typeof entry === "object" && typeof entry.id === "string" ? entry.id : null).filter((id) => id !== null) : [];
    clean.sessions = clean.sessionIds.length;
    const byProviderModel = bucket.byProviderModel;
    if (byProviderModel !== null && typeof byProviderModel === "object" && !Array.isArray(byProviderModel)) {
      for (const [key, entry] of Object.entries(byProviderModel)) {
        if (entry === null || typeof entry !== "object") continue;
        const model = key.slice(key.indexOf(":") + 1);
        if (model === "") continue;
        if (clean.models === void 0) clean.models = /* @__PURE__ */ new Map();
        let cell = clean.models.get(model);
        if (cell === void 0) {
          cell = emptyBuckets();
          clean.models.set(model, cell);
        }
        addBuckets(cell, entry, 1);
      }
    }
    days.set(day, clean);
  }
  if (days.size === 0) return null;
  return days;
}
export {
  BUCKET_KEYS,
  addBuckets,
  emptyBuckets,
  readLedger
};
