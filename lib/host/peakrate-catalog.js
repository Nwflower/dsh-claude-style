// packages/contracts/src/peakrate.ts
function isClockValue(value) {
  if (typeof value !== "string") return false;
  const match = /^(\d{1,2}):(\d{2})$/.exec(value);
  if (match === null) return false;
  return Number(match[1]) <= 23 && Number(match[2]) <= 59;
}
function isIsoDate(value) {
  if (typeof value !== "string") return false;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (match === null) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  const at = new Date(Date.UTC(year, month - 1, day));
  return at.getUTCFullYear() === year && at.getUTCMonth() === month - 1 && at.getUTCDate() === day;
}
function isIsoInstant(value) {
  if (typeof value !== "string") return false;
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})$/.test(value)) return false;
  return !Number.isNaN(Date.parse(value));
}

// packages/host/src/peakrate-catalog.ts
var SCHEMA_VERSION = 1;
function asRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value : null;
}
function asText(value) {
  return typeof value === "string" && value !== "" ? value : void 0;
}
function zoneResolves(timeZone) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return true;
  } catch {
    return false;
  }
}
function asDays(value) {
  if (!Array.isArray(value)) return [];
  const days = [];
  for (const day of value) {
    if (Number.isInteger(day) && day >= 0 && day <= 6 && !days.includes(day)) days.push(day);
  }
  return days;
}
function asWindows(value) {
  if (!Array.isArray(value)) return [];
  const windows = [];
  for (const entry of value) {
    const window = asRecord(entry);
    if (window === null) continue;
    const start = window.start;
    const end = window.end;
    if (!isClockValue(start) || !isClockValue(end)) continue;
    if (start === end && window.allDay !== true) continue;
    windows.push({ start, end });
  }
  return windows;
}
function asOverrides(schedule, periods) {
  const out = [];
  if (!Array.isArray(schedule.overrides)) return out;
  for (const entry of schedule.overrides) {
    const raw = asRecord(entry);
    if (raw === null) continue;
    const periodName = asText(raw.period);
    if (periodName === void 0 || periodName === "peak" || periodName === "offPeak") continue;
    const fields = asRecord(periods[periodName]);
    if (fields === null) continue;
    if (raw.startAt !== void 0 && !isIsoInstant(raw.startAt)) continue;
    if (raw.endAt !== void 0 && !isIsoInstant(raw.endAt)) continue;
    const windows = asWindows(raw.windows);
    if (windows.length === 0) continue;
    const override = { period: "campaign", periodName, days: asDays(raw.days), windows };
    const badge = asText(fields.badge);
    const name = asText(fields.name);
    const detail = asText(fields.detail);
    if (badge !== void 0) override.badge = badge;
    if (name !== void 0) override.name = name;
    if (detail !== void 0) override.detail = detail;
    if (isIsoDate(raw.startDate)) override.startDate = raw.startDate;
    if (isIsoDate(raw.endDate)) override.endDate = raw.endDate;
    if (isIsoInstant(raw.startAt)) override.startAt = raw.startAt;
    if (isIsoInstant(raw.endAt)) override.endAt = raw.endAt;
    out.push(override);
  }
  return out;
}
function asHolidays(schedule) {
  if (!Array.isArray(schedule.publicHolidayDates)) return {};
  const dates = [];
  for (const value of schedule.publicHolidayDates) {
    if (isIsoDate(value) && !dates.includes(value)) dates.push(value);
  }
  if (dates.length === 0) return {};
  dates.sort();
  const out = { publicHolidayDates: dates };
  const name = asText(schedule.publicHolidayName);
  const timeZone = asText(schedule.publicHolidayTimeZone);
  if (name !== void 0) out.publicHolidayName = name;
  if (timeZone !== void 0 && zoneResolves(timeZone)) out.publicHolidayTimeZone = timeZone;
  return out;
}
function asProfile(value) {
  const raw = asRecord(value);
  if (raw === null) return null;
  const id = asText(raw.id);
  const provider = asText(raw.provider);
  if (id === void 0 || provider === void 0) return null;
  const schedule = asRecord(raw.schedule);
  if (schedule === null) return null;
  const timeZone = asText(schedule.timeZone);
  if (timeZone === void 0) return null;
  if (!zoneResolves(timeZone)) return null;
  const peakDays = asDays(schedule.peakDays);
  const peakWindows = asWindows(schedule.peakWindows);
  if (peakDays.length === 0 || peakWindows.length === 0) return null;
  const periods = asRecord(raw.periods);
  const peak = periods === null ? null : asRecord(periods.peak);
  const offPeak = periods === null ? null : asRecord(periods.offPeak);
  const peakBadge = peak === null ? void 0 : asText(peak.badge);
  const offPeakBadge = offPeak === null ? void 0 : asText(offPeak.badge);
  if (peakBadge === void 0 || offPeakBadge === void 0) return null;
  const profile = {
    id,
    provider,
    model: asText(raw.model) ?? "",
    schedule: { timeZone, peakDays, peakWindows, ...asHolidays(schedule) },
    peakBadge,
    offPeakBadge
  };
  const offDayName = asText(schedule.offDayName);
  if (offDayName !== void 0) profile.schedule.offDayName = offDayName;
  const overrides = periods === null ? [] : asOverrides(schedule, periods);
  if (overrides.length > 0) profile.schedule.overrides = overrides;
  const campaign = periods === null ? null : asRecord(periods.campaign);
  const campaignBadge = (campaign === null ? void 0 : asText(campaign.badge)) ?? overrides.find((one) => one.badge !== void 0)?.badge;
  if (campaignBadge !== void 0) profile.campaignBadge = campaignBadge;
  if (campaign !== null) {
    const campaignName = asText(campaign.name);
    if (campaignName !== void 0) profile.campaignName = campaignName;
  }
  const source = asText(raw.source);
  if (source !== void 0) profile.source = source;
  return profile;
}
function parseCatalog(value) {
  const raw = asRecord(value);
  if (raw === null) return null;
  if (raw.schemaVersion !== SCHEMA_VERSION) return null;
  if (!Array.isArray(raw.profiles)) return null;
  const profiles = [];
  const seen = /* @__PURE__ */ new Set();
  for (const entry of raw.profiles) {
    const profile = asProfile(entry);
    if (profile === null || seen.has(profile.id)) continue;
    seen.add(profile.id);
    profiles.push(profile);
  }
  if (profiles.length === 0) return null;
  const catalog = { schemaVersion: SCHEMA_VERSION, profiles };
  const updatedAt = asText(raw.updatedAt);
  if (updatedAt !== void 0) catalog.updatedAt = updatedAt;
  return catalog;
}
export {
  parseCatalog
};
