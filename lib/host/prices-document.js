// packages/contracts/src/prices.ts
var CURRENCY_CNY = "CNY";
var CURRENCY_USD = "USD";
var CURRENCIES = [CURRENCY_CNY, CURRENCY_USD];
var CURRENCY_SYMBOL = {
  [CURRENCY_CNY]: "\xA5",
  [CURRENCY_USD]: "$"
};
var PRICE_SCHEMA_VERSION = 1;
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

// packages/host/src/prices-document.ts
import { asRecord } from "./json-document.js";
function asText(value) {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : void 0;
}
function asRate(value) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : void 0;
}
function asDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return void 0;
  const [year, month, day] = value.split("-").map(Number);
  const at = new Date(Date.UTC(year, month - 1, day));
  return at.getUTCFullYear() === year && at.getUTCMonth() === month - 1 && at.getUTCDate() === day ? value : void 0;
}
function asClock(value) {
  const text = asText(value);
  if (text === void 0 || !/^([01]?\d|2[0-3]):[0-5]\d$/.test(text)) return void 0;
  return text;
}
function asTier(value) {
  const raw = asRecord(value);
  if (raw === null) return null;
  const cacheHit = asRate(raw.cacheHit);
  const cacheMiss = asRate(raw.cacheMiss);
  const output = asRate(raw.output);
  if (cacheHit === void 0 || cacheMiss === void 0 || output === void 0) return null;
  return { cacheHit, cacheMiss, output };
}
function asPrice(value) {
  const raw = asRecord(value);
  if (raw === null) return null;
  const offPeak = asTier(raw.offPeak);
  const peak = asTier(raw.peak);
  if (offPeak === null || peak === null) return null;
  for (const key of ["cacheHit", "cacheMiss", "output"]) {
    if (peak[key] < offPeak[key]) return null;
  }
  return { offPeak, peak };
}
function asWindows(value) {
  if (!Array.isArray(value) || value.length === 0) return null;
  const windows = [];
  for (const entry of value) {
    const raw = asRecord(entry);
    if (raw === null) continue;
    const start = asClock(raw.start);
    const end = asClock(raw.end);
    if (start === void 0 || end === void 0) continue;
    windows.push({ start, end });
  }
  return windows.length > 0 ? windows : null;
}
function asSchedule(value) {
  const raw = asRecord(value);
  if (raw === null) return null;
  const timeZone = asText(raw.timeZone);
  const holidayZone = asText(raw.holidayZone) ?? timeZone;
  if (timeZone === void 0 || holidayZone === void 0) return null;
  if (clockAt(Date.now(), timeZone) === null || clockAt(Date.now(), holidayZone) === null) return null;
  const peakDays = [];
  if (!Array.isArray(raw.peakDays)) return null;
  for (const day of raw.peakDays) {
    if (!Number.isInteger(day) || day < 0 || day > 6 || peakDays.includes(day)) continue;
    peakDays.push(day);
  }
  if (peakDays.length === 0) return null;
  const peakWindows = asWindows(raw.peakWindows);
  if (peakWindows === null) return null;
  const holidays = [];
  if (raw.holidays !== void 0) {
    if (!Array.isArray(raw.holidays)) return null;
    for (const day of raw.holidays) {
      const date = asDate(day);
      if (date !== void 0 && !holidays.includes(date)) holidays.push(date);
    }
    holidays.sort();
  }
  return { timeZone, peakDays, peakWindows, holidays, holidayZone };
}
function asCatalog(value) {
  const raw = asRecord(value);
  if (raw === null) return null;
  const out = {};
  for (const [id, line] of Object.entries(raw)) {
    if (typeof line !== "string" || id.trim() === "") continue;
    const parts = line.trim().split(/\s+/u);
    const rates = parts.map(Number);
    if (parts.length !== 3 || !rates.every((candidate) => Number.isFinite(candidate) && candidate >= 0)) continue;
    out[id.trim().toLowerCase()] = rates.join(" ");
  }
  return out;
}
function parsePriceDocument(value) {
  const raw = asRecord(value);
  if (raw === null || raw.schemaVersion !== PRICE_SCHEMA_VERSION) return null;
  const updatedAt = asDate(raw.updatedAt);
  const schedule = asSchedule(raw.schedule);
  if (updatedAt === void 0 || schedule === null) return null;
  const rawModels = asRecord(raw.models);
  if (rawModels === null) return null;
  const models = {};
  for (const [id, entry] of Object.entries(rawModels)) {
    if (id.trim() === "") continue;
    const perCurrency = asRecord(entry);
    if (perCurrency === null) return null;
    const priced = {};
    for (const currency of CURRENCIES) {
      const price = asPrice(perCurrency[currency]);
      if (price === null) return null;
      priced[currency] = price;
    }
    models[id] = priced;
  }
  if (Object.keys(models).length === 0) return null;
  const catalog = raw.catalog === void 0 ? {} : asCatalog(raw.catalog);
  if (catalog === null) return null;
  const catalogCny = raw.catalogCny === void 0 ? {} : asCatalog(raw.catalogCny);
  if (catalogCny === null) return null;
  const aliases = {};
  if (raw.aliases !== void 0) {
    const rawAliases = asRecord(raw.aliases);
    if (rawAliases === null) return null;
    for (const [from, to] of Object.entries(rawAliases)) {
      const target = asText(to);
      if (target !== void 0 && (Object.hasOwn(models, target) || Object.hasOwn(catalog, target) || Object.hasOwn(catalogCny, target)) && from.trim() !== "") {
        aliases[from.trim().toLowerCase()] = target;
      }
    }
  }
  const document = { schemaVersion: PRICE_SCHEMA_VERSION, updatedAt, schedule, models, aliases };
  if (Object.keys(catalog).length > 0) document.catalog = catalog;
  if (Object.keys(catalogCny).length > 0) document.catalogCny = catalogCny;
  const rate = raw.usdToCny;
  if (typeof rate === "number" && Number.isFinite(rate) && rate > 0) document.usdToCny = rate;
  const capturedAt = asText(raw.capturedAt);
  if (capturedAt !== void 0) document.capturedAt = capturedAt;
  const source = asRecord(raw.source);
  if (source !== null) {
    const zh = asText(source.zh);
    const en = asText(source.en);
    if (zh !== void 0 || en !== void 0) document.source = { ...zh === void 0 ? {} : { zh }, ...en === void 0 ? {} : { en } };
  }
  return document;
}
export {
  parsePriceDocument
};
