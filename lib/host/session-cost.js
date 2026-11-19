// packages/contracts/src/package.ts
var PACKAGE_NAME = "dsh-claude-style";

// packages/contracts/src/prices.ts
var CURRENCY_CNY = "CNY";
var CURRENCY_USD = "USD";
var CURRENCY_SYMBOL = {
  [CURRENCY_CNY]: "\xA5",
  [CURRENCY_USD]: "$"
};
var WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
var formatters = /* @__PURE__ */ new Map();
function formatter(timeZone) {
  let held = formatters.get(timeZone);
  if (held === void 0) {
    held = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      weekday: "short",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23"
    });
    formatters.set(timeZone, held);
  }
  return held;
}
function clockAt(atMs, timeZone) {
  if (!Number.isFinite(atMs)) return null;
  let parts;
  try {
    parts = formatter(timeZone).formatToParts(new Date(atMs));
  } catch {
    return null;
  }
  const field = (type) => parts.find((part) => part.type === type)?.value ?? "";
  const weekday = WEEKDAYS.indexOf(field("weekday"));
  const year = Number(field("year"));
  const month = Number(field("month"));
  const day = Number(field("day"));
  const hour = Number(field("hour"));
  const minute = Number(field("minute"));
  if (weekday < 0 || !Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day) || !Number.isFinite(hour) || !Number.isFinite(minute)) return null;
  const pad = (value) => String(value).padStart(2, "0");
  return { weekday, date: `${year}-${pad(month)}-${pad(day)}`, minutes: hour * 60 + minute };
}
function clockMinutes(value) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value);
  if (match === null) return Number.NaN;
  return Number(match[1]) * 60 + Number(match[2]);
}
function isPeak(atMs, schedule) {
  const clock = clockAt(atMs, schedule.timeZone);
  if (clock === null || !schedule.peakDays.includes(clock.weekday)) return false;
  const holiday = clockAt(atMs, schedule.holidayZone);
  if (holiday !== null && schedule.holidays.includes(holiday.date)) return false;
  for (let i = 0; i < schedule.peakWindows.length; i++) {
    const window = schedule.peakWindows[i];
    const start = clockMinutes(window.start);
    const end = clockMinutes(window.end);
    if (clock.minutes >= start && clock.minutes < end) return true;
  }
  return false;
}
function bareModelId(modelId) {
  const raw = modelId.trim().toLowerCase();
  if (raw === "") return null;
  return raw.includes("/") ? raw.slice(raw.lastIndexOf("/") + 1) : raw;
}
var CATALOG_SUFFIXES = ["-high", "-low", "-fast", "-sg", "-256k", "-128k", "-1m", "-32k", "-200k", "-flex"];
function catalogIdFor(document, bare) {
  const catalog = document.catalog;
  if (catalog === void 0) return null;
  const candidates = [document.aliases[bare], bare];
  for (const suffix of CATALOG_SUFFIXES) {
    if (bare.endsWith(suffix) && bare.length > suffix.length) candidates.push(bare.slice(0, -suffix.length));
  }
  for (const candidate of candidates) {
    if (candidate !== void 0 && Object.hasOwn(catalog, candidate)) return candidate;
  }
  return null;
}
function priceModelId(document, modelId) {
  const bare = bareModelId(modelId);
  if (bare === null) return null;
  if (Object.hasOwn(document.models, bare)) return bare;
  const alias = document.aliases[bare];
  return alias !== void 0 && Object.hasOwn(document.models, alias) ? alias : null;
}
function priceFor(document, modelId, currency) {
  const id = priceModelId(document, modelId);
  if (id !== null) return document.models[id]?.[currency];
  const bare = bareModelId(modelId);
  if (bare === null) return void 0;
  const catalogId = catalogIdFor(document, bare);
  if (catalogId === null) return void 0;
  const published = currency === "CNY" ? document.catalogCny?.[catalogId] : void 0;
  const parts = (published ?? document.catalog?.[catalogId] ?? "").split(" ").map(Number);
  if (parts.length !== 3 || !parts.every((value) => Number.isFinite(value) && value >= 0)) return void 0;
  if (parts[0] === 0 && parts[2] === 0) return void 0;
  const rate2 = published !== void 0 ? 1 : currency === "CNY" ? document.usdToCny ?? 7.2 : 1;
  const tier = { cacheHit: parts[1] * rate2, cacheMiss: parts[0] * rate2, output: parts[2] * rate2 };
  return { offPeak: tier, peak: tier };
}
function priceTierAt(price, atMs, schedule) {
  return isPeak(atMs, schedule) ? price.peak : price.offPeak;
}
function costMicro(usage, tier) {
  const count2 = (value) => Number.isFinite(value) && value > 0 ? value : 0;
  const cost = count2(usage.input) * tier.cacheMiss + count2(usage.cacheRead) * tier.cacheHit + count2(usage.cacheWrite) * tier.cacheHit + count2(usage.output) * tier.output;
  return Number.isFinite(cost) && cost > 0 ? cost : 0;
}

// packages/contracts/src/billing-table.ts
function splitBillingRow(entry) {
  const parts = entry.split("|");
  return [parts[0] ?? "", parts[1] ?? "", parts[2] ?? "", parts[3] ?? ""].map((part) => part.trim());
}
function parseBillingRow(entry) {
  const [model, input, cacheRead, output] = splitBillingRow(entry);
  if (model === "") return null;
  return { model, cacheMiss: rate(input), cacheHit: rate(cacheRead), output: rate(output) };
}
function rate(text) {
  if (text === "") return null;
  const value = Number(text);
  return Number.isFinite(value) && value >= 0 ? value : null;
}
function parseBillingTable(entries) {
  const rows = [];
  for (const entry of entries) {
    const row = parseBillingRow(entry);
    if (row !== null) rows.push(row);
  }
  return rows;
}
function billingModelKey(modelId) {
  const raw = modelId.trim().toLowerCase();
  if (raw === "") return null;
  return raw.includes("/") ? raw.slice(raw.lastIndexOf("/") + 1) : raw;
}
function billingRowFor(rows, modelId) {
  const key = billingModelKey(modelId);
  if (key === null) return null;
  for (const row of rows) {
    if (billingModelKey(row.model) === key) return row;
  }
  return null;
}
function overlayBilling(rows, modelId, table) {
  const row = billingRowFor(rows, modelId);
  if (row === null) return table;
  const base = table ?? { cacheHit: 0, cacheMiss: 0, output: 0 };
  const tier = {
    cacheMiss: row.cacheMiss ?? base.cacheMiss,
    cacheHit: row.cacheHit ?? base.cacheHit,
    output: row.output ?? base.output
  };
  if (tier.cacheMiss === 0 && tier.cacheHit === 0 && tier.output === 0) return void 0;
  return tier;
}

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

// packages/host/src/session-cost.ts
import { modelOf, usageOf } from "./usage-fold.js";
var KEPT_SESSIONS = 128;
var NO_BILLING = { rows: [], currency: null };
function billingRowsOf(entries, currency) {
  const rows = parseBillingTable(entries);
  return rows.length === 0 ? NO_BILLING : { rows, currency };
}
function count(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : 0;
}
function usageOfSample(event) {
  const sample = usageOf(event);
  if (sample === void 0) return null;
  return {
    input: count(sample.inputTokens),
    output: count(sample.outputTokens),
    cacheRead: count(sample.cacheReadTokens),
    cacheWrite: count(sample.cacheWriteTokens)
  };
}
function sameUsage(settlement, usage) {
  return settlement.input === usage.input && settlement.output === usage.output && settlement.cacheRead === usage.cacheRead && settlement.cacheWrite === usage.cacheWrite;
}
function applyCostEvent(state, event, document, billing = NO_BILLING) {
  const type = event?.type;
  if (type === "llm/retry-started") {
    const turn2 = event.data?.turn;
    const step2 = event.data?.step;
    if (state.last !== null && state.last.turn === turn2 && state.last.step === step2) {
      return { ...state, last: null };
    }
    return state;
  }
  if (type !== "assistant/message" && type !== "assistant/attempt") return state;
  const usage = usageOfSample(event);
  if (usage === null) {
    const named = modelOf(event);
    return named === null || named === state.model ? state : { ...state, model: named };
  }
  const time = event.time;
  const model = modelOf(event) ?? state.model;
  if (typeof time !== "number" || !Number.isFinite(time)) return state;
  let cny = 0;
  let usd = 0;
  let partial = state.partial;
  const priced = (currency) => {
    const price = model === null ? void 0 : priceFor(document, model, currency);
    const tier = price === void 0 ? void 0 : priceTierAt(price, time, document.schedule);
    const overlaid = model === null || billing.currency !== null && billing.currency !== currency ? tier : overlayBilling(billing.rows, model, tier);
    if (overlaid === void 0) return null;
    return costMicro(usage, overlaid);
  };
  const cnyCost = priced("CNY");
  const usdCost = priced("USD");
  if (cnyCost === null || usdCost === null) partial = true;
  cny = cnyCost ?? 0;
  usd = usdCost ?? 0;
  const turn = event.data?.turn;
  const step = event.data?.step;
  const previous = state.last;
  const replacing = previous !== null && previous.turn === turn && previous.step === step;
  if (replacing && previous !== null && sameUsage(previous, usage)) return state;
  const takeBack = replacing && previous !== null ? previous : null;
  return {
    cny: Math.max(0, state.cny - (takeBack?.cny ?? 0) + cny),
    usd: Math.max(0, state.usd - (takeBack?.usd ?? 0) + usd),
    partial,
    last: {
      ...turn === void 0 ? {} : { turn },
      ...step === void 0 ? {} : { step },
      ...usage,
      cny,
      usd
    },
    model: modelOf(event) ?? state.model
  };
}
function foldSessionCost(events, document, billing = NO_BILLING) {
  let state = { cny: 0, usd: 0, partial: false, last: null, model: null };
  for (let i = 0; i < events.length; i++) state = applyCostEvent(state, events[i], document, billing);
  return state;
}
var STALE_MS = 1e4;
function createSessionCost(ctx, prices) {
  const states = /* @__PURE__ */ new Map();
  let liveBilling = NO_BILLING;
  let billingSignature = "";
  const touchedAt = /* @__PURE__ */ new Map();
  const pending = /* @__PURE__ */ new Map();
  const offPriceChange = prices.onChange(() => {
    states.clear();
    touchedAt.clear();
  });
  function trim() {
    while (states.size > KEPT_SESSIONS) {
      const oldest = states.keys().next().value;
      if (oldest === void 0 || oldest === "") break;
      states.delete(oldest);
      touchedAt.delete(oldest);
    }
  }
  function answer(state) {
    return { cny: state.cny, usd: state.usd, partial: state.partial, model: state.model };
  }
  function observe(sessionId, event) {
    const state = states.get(sessionId);
    if (state === void 0) return;
    const document = prices.document();
    if (document === null) return;
    const next = applyCostEvent(state, event, document, liveBilling);
    if (next !== state) states.set(sessionId, next);
    touchedAt.set(sessionId, Date.now());
  }
  function ensure() {
    if (typeof ctx.on !== "function") return;
    ctx.on("session/event", (session, event) => {
      const id = typeof session?.id === "string" ? session.id : "";
      if (id !== "") observe(id, event);
    });
  }
  async function get(sessionId, billing = NO_BILLING) {
    prices.ensure();
    const signature = billing.currency === null ? "" : billing.rows.map((row) => `${row.model}|${row.cacheMiss}|${row.cacheHit}|${row.output}`).join(";");
    if (signature !== billingSignature) {
      billingSignature = signature;
      liveBilling = billing;
      states.clear();
      touchedAt.clear();
      pending.clear();
    }
    const held = states.get(sessionId);
    const touched = touchedAt.get(sessionId);
    if (held !== void 0 && touched !== void 0 && Date.now() - touched < STALE_MS) return answer(held);
    const running = pending.get(sessionId);
    if (running !== void 0) return running;
    const document = prices.document();
    if (document === null) return null;
    const work = readEvents(ctx, PACKAGE_NAME, sessionId, "the session cost").then((events) => {
      pending.delete(sessionId);
      if (events === null) return null;
      const state = foldSessionCost(events, document, liveBilling);
      states.set(sessionId, state);
      touchedAt.set(sessionId, Date.now());
      trim();
      return answer(state);
    }, (error) => {
      pending.delete(sessionId);
      throw error;
    });
    pending.set(sessionId, work);
    return work;
  }
  return {
    ensure,
    get,
    dispose() {
      offPriceChange();
      states.clear();
      touchedAt.clear();
      pending.clear();
    }
  };
}
export {
  NO_BILLING,
  applyCostEvent,
  billingRowsOf,
  createSessionCost,
  foldSessionCost
};
