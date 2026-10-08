/**
 * The data source's document, validated into the shape the browser half reads
 * (D54).
 *
 * The source is a community-maintained catalog of every provider's billing
 * clock: a document that is not the version read here, a profile without a
 * usable clock, or a window that is not a real time of day is dropped rather
 * than approximated. A malformed entry must never reach the browser, because
 * every judgement there is made from these fields.
 */
import { isClockValue, isIsoDate, isIsoInstant } from '@dsh-claude-style/contracts/peakrate'
import type { PeakCatalog, RateOverride, RateProfile, RateSchedule, RateWindow } from '@dsh-claude-style/contracts/peakrate'

/** The document version this reader understands. */
const SCHEMA_VERSION = 1

/** A JSON object, or null when the value is not one. */
function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null
}

/** A non-empty string, or undefined. */
function asText(value: unknown): string | undefined {
  return typeof value === 'string' && value !== '' ? value : undefined
}

/**
 * Whether the platform can resolve one IANA zone.
 *
 * A zone it cannot resolve would throw inside every judgement made from this
 * profile, so the document's own answer is asked for here: the caller drops
 * the profile, or that one field, instead of carrying a clock nothing can
 * read (docs/decisions D54).
 */
function zoneResolves(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone })
    return true
  } catch {
    return false
  }
}

/** Weekdays as the document states them: whole numbers 0 (Sunday) to 6, anything else dropped. */
function asDays(value: unknown): number[] {
  if (!Array.isArray(value)) return []
  const days: number[] = []
  for (const day of value) {
    if (Number.isInteger(day) && day >= 0 && day <= 6 && !days.includes(day)) days.push(day)
  }
  return days
}

/**
 * The windows of one list, in the order the document states them.
 *
 * A zero-length window is the whole day exactly where the document marks it
 * (`allDay`): providers whose standard rate runs around the clock write their
 * cycle that way, and the flag is what tells it apart from a malformed entry.
 */
function asWindows(value: unknown): RateWindow[] {
  if (!Array.isArray(value)) return []
  const windows: RateWindow[] = []
  for (const entry of value) {
    const window = asRecord(entry)
    if (window === null) continue
    const start = window.start
    const end = window.end
    if (!isClockValue(start) || !isClockValue(end)) continue
    if (start === end && window.allDay !== true) continue
    windows.push({ start, end })
  }
  return windows
}

/**
 * The dated promotional windows, in the order the document states them.
 *
 * An override that restates the regular peak / off-peak cycle is not a
 * campaign and is dropped: the regular cycle is what applies when no override
 * does. A stated instant bound the document cannot be read as an instant drops
 * the whole override, because a campaign placed wrongly in time either never
 * applies or never expires.
 */
function asOverrides(schedule: Record<string, unknown>, periods: Record<string, unknown>): RateOverride[] {
  const out: RateOverride[] = []
  if (!Array.isArray(schedule.overrides)) return out
  for (const entry of schedule.overrides) {
    const raw = asRecord(entry)
    if (raw === null) continue
    const periodName = asText(raw.period)
    if (periodName === undefined || periodName === 'peak' || periodName === 'offPeak') continue
    const fields = asRecord(periods[periodName])
    if (fields === null) continue
    if (raw.startAt !== undefined && !isIsoInstant(raw.startAt)) continue
    if (raw.endAt !== undefined && !isIsoInstant(raw.endAt)) continue
    const windows = asWindows(raw.windows)
    if (windows.length === 0) continue
    const override: RateOverride = { period: 'campaign', periodName, days: asDays(raw.days), windows }
    const badge = asText(fields.badge)
    const name = asText(fields.name)
    const detail = asText(fields.detail)
    if (badge !== undefined) override.badge = badge
    if (name !== undefined) override.name = name
    if (detail !== undefined) override.detail = detail
    // A bound the document states but that is not a date is dropped, not
    // fatal: the window keeps its other bounds.
    if (isIsoDate(raw.startDate)) override.startDate = raw.startDate
    if (isIsoDate(raw.endDate)) override.endDate = raw.endDate
    if (isIsoInstant(raw.startAt)) override.startAt = raw.startAt
    if (isIsoInstant(raw.endAt)) override.endAt = raw.endAt
    out.push(override)
  }
  return out
}

/** The holiday calendar, in its own time zone when it declares one. */
function asHolidays(schedule: Record<string, unknown>): Pick<RateSchedule, 'publicHolidayDates' | 'publicHolidayName' | 'publicHolidayTimeZone'> {
  if (!Array.isArray(schedule.publicHolidayDates)) return {}
  const dates: string[] = []
  for (const value of schedule.publicHolidayDates) {
    if (isIsoDate(value) && !dates.includes(value)) dates.push(value)
  }
  if (dates.length === 0) return {}
  dates.sort()
  const out: Pick<RateSchedule, 'publicHolidayDates' | 'publicHolidayName' | 'publicHolidayTimeZone'> = { publicHolidayDates: dates }
  const name = asText(schedule.publicHolidayName)
  const timeZone = asText(schedule.publicHolidayTimeZone)
  if (name !== undefined) out.publicHolidayName = name
  // A holiday calendar in a zone the platform cannot resolve is read in the
  // profile's own zone instead of losing the profile.
  if (timeZone !== undefined && zoneResolves(timeZone)) out.publicHolidayTimeZone = timeZone
  return out
}

/** One profile, or null when its clock cannot be read. */
function asProfile(value: unknown): RateProfile | null {
  const raw = asRecord(value)
  if (raw === null) return null
  const id = asText(raw.id)
  const provider = asText(raw.provider)
  if (id === undefined || provider === undefined) return null
  const schedule = asRecord(raw.schedule)
  if (schedule === null) return null
  const timeZone = asText(schedule.timeZone)
  if (timeZone === undefined) return null
  // A zone `Intl` cannot resolve would throw inside every evaluation; the
  // profile is rejected here instead of being judged in the wrong zone.
  if (!zoneResolves(timeZone)) return null
  const peakDays = asDays(schedule.peakDays)
  const peakWindows = asWindows(schedule.peakWindows)
  if (peakDays.length === 0 || peakWindows.length === 0) return null
  const periods = asRecord(raw.periods)
  const peak = periods === null ? null : asRecord(periods.peak)
  const offPeak = periods === null ? null : asRecord(periods.offPeak)
  const peakBadge = peak === null ? undefined : asText(peak.badge)
  const offPeakBadge = offPeak === null ? undefined : asText(offPeak.badge)
  if (peakBadge === undefined || offPeakBadge === undefined) return null
  const profile: RateProfile = {
    id,
    provider,
    model: asText(raw.model) ?? '',
    schedule: { timeZone, peakDays, peakWindows, ...asHolidays(schedule) },
    peakBadge,
    offPeakBadge,
  }
  const offDayName = asText(schedule.offDayName)
  if (offDayName !== undefined) profile.schedule.offDayName = offDayName
  const overrides = periods === null ? [] : asOverrides(schedule, periods)
  if (overrides.length > 0) profile.schedule.overrides = overrides
  // The profile-level campaign slot is the fallback badge for a campaign whose
  // own window carries none.
  const campaign = periods === null ? null : asRecord(periods.campaign)
  const campaignBadge = (campaign === null ? undefined : asText(campaign.badge)) ?? overrides.find((one) => one.badge !== undefined)?.badge
  if (campaignBadge !== undefined) profile.campaignBadge = campaignBadge
  if (campaign !== null) {
    const campaignName = asText(campaign.name)
    if (campaignName !== undefined) profile.campaignName = campaignName
  }
  const source = asText(raw.source)
  if (source !== undefined) profile.source = source
  return profile
}

/**
 * Validate one catalog document.
 *
 * @param value - the parsed JSON.
 * @returns the catalog, or null when the document is not this version or
 *     carries no usable profile (the caller then keeps what it already had).
 */
export function parseCatalog(value: unknown): PeakCatalog | null {
  const raw = asRecord(value)
  if (raw === null) return null
  if (raw.schemaVersion !== SCHEMA_VERSION) return null
  if (!Array.isArray(raw.profiles)) return null
  const profiles: RateProfile[] = []
  const seen = new Set<string>()
  for (const entry of raw.profiles) {
    const profile = asProfile(entry)
    if (profile === null || seen.has(profile.id)) continue
    seen.add(profile.id)
    profiles.push(profile)
  }
  if (profiles.length === 0) return null
  const catalog: PeakCatalog = { schemaVersion: SCHEMA_VERSION, profiles }
  const updatedAt = asText(raw.updatedAt)
  if (updatedAt !== undefined) catalog.updatedAt = updatedAt
  return catalog
}
