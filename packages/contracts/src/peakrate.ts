/**
 * The peak / off-peak rate catalog both halves exchange (D54).
 *
 * The host half fetches the data source, validates it into these shapes and
 * serves them over its own route; the browser half evaluates them against the
 * clock. One declaration covers both, so a field the host drops is a field the
 * browser cannot read.
 */

/** One billing window: `"HH:mm"` in the schedule's own time zone, start inclusive, end exclusive. */
export interface RateWindow {
  start: string
  end: string
}

/**
 * A dated promotional window. Campaigns outrank the regular peak / off-peak
 * cycle, so a provider running one is neither of the two ordinary states.
 */
export interface RateOverride {
  /** Always `campaign`: an override that restates the regular cycle is dropped when the catalog is parsed. */
  period: 'campaign'
  /** The data source's own key for the override, kept for the periods lookup and for diagnosis. */
  periodName: string
  /** The rate the data source prints for this window (`0.5×`, `0× credits`, a plan name). */
  badge?: string
  /** The data source's own name for the window; the skin's copy does not print it. */
  name?: string
  detail?: string
  /** Inclusive `YYYY-MM-DD` bounds; an absent bound is unbounded. */
  startDate?: string
  endDate?: string
  /**
   * ISO 8601 instant bounds, as the document states them (`2026-08-13T09:00:00-07:00`):
   * the opening instant is covered, the closing instant is the first the
   * campaign is over. A campaign that expired must stay expired: without its
   * instant bound it would apply from the beginning of time.
   */
  startAt?: string
  endAt?: string
  /** Weekdays, 0 = Sunday; empty means every day. */
  days: number[]
  windows: RateWindow[]
}

/** One profile's billing clock, evaluated in its own IANA time zone. */
export interface RateSchedule {
  timeZone: string
  /** The weekdays, 0 = Sunday, whose windows bill at the peak rate; every other day is off-peak. */
  peakDays: number[]
  peakWindows: RateWindow[]
  offDayName?: string
  /** `YYYY-MM-DD` days billed off-peak in full, in {@link publicHolidayTimeZone} when it is named. */
  publicHolidayDates?: string[]
  publicHolidayName?: string
  publicHolidayTimeZone?: string
  overrides?: RateOverride[]
}

/** One provider × model billing profile. */
export interface RateProfile {
  id: string
  /** The data source's provider name; the alias table maps a host provider id onto it. */
  provider: string
  /** The models this profile covers, as the data source words it. */
  model: string
  schedule: RateSchedule
  peakBadge: string
  offPeakBadge: string
  campaignBadge?: string
  campaignName?: string
  source?: string
}

/** The catalog as the host half serves it. */
export interface PeakCatalog {
  schemaVersion: number
  updatedAt?: string
  profiles: RateProfile[]
}

/** The three states a profile can be in. */
export type RatePeriod = 'peak' | 'offPeak' | 'campaign'

/** One profile's state at one instant, with the switch that follows it. */
export interface RateState {
  period: RatePeriod
  /** The multiplier (or plan name) the data source prints for the state in force. */
  badge: string
  /** Whole minutes until the state changes; `Number.POSITIVE_INFINITY` when nothing changes within the search horizon. */
  minutesUntilSwitch: number
  nextPeriod?: RatePeriod
  nextBadge?: string
  /** The campaign window in force, when the state is one. */
  overrideName?: string
  /** The campaign window in force at the switch, when the switch lands inside one. */
  nextOverrideName?: string
}

/** `"HH:mm"` naming a real hour and minute. */
export function isClockValue(value: unknown): value is string {
  if (typeof value !== 'string') return false
  const match = /^(\d{1,2}):(\d{2})$/.exec(value)
  if (match === null) return false
  return Number(match[1]) <= 23 && Number(match[2]) <= 59
}

/** `"YYYY-MM-DD"` naming a real calendar day (a rolled-over date such as `2026-02-30` is not one). */
export function isIsoDate(value: unknown): value is string {
  if (typeof value !== 'string') return false
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (match === null) return false
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  if (month < 1 || month > 12 || day < 1 || day > 31) return false
  const at = new Date(Date.UTC(year, month - 1, day))
  return at.getUTCFullYear() === year && at.getUTCMonth() === month - 1 && at.getUTCDate() === day
}

/**
 * An ISO 8601 instant with its own offset (`2026-08-13T09:00:00-07:00`, `...Z`).
 *
 * The zone offset is required: a bare local date-time would be read in whichever
 * zone the host happens to run in, which is not the campaign's own boundary.
 */
export function isIsoInstant(value: unknown): value is string {
  if (typeof value !== 'string') return false
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})$/.test(value)) return false
  return !Number.isNaN(Date.parse(value))
}
