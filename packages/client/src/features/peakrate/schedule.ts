import type { RateOverride, RatePeriod, RateProfile, RateSchedule, RateState, RateWindow } from '@dsh-claude-style/contracts/peakrate'

/**
 * Which rate is in force, judged against the clock (D54).
 *
 * Every judgement is made from real instants: the wall clock is read in the
 * schedule's own zone through `Intl`, a wall-clock time is converted back to a
 * real instant before it is compared with now, and day arithmetic runs on the
 * zone's own calendar. That is what makes a daylight-saving boundary and a
 * window crossing midnight come out right rather than approximately right —
 * "wall-clock minutes plus 1440" is off by an hour across a transition and by
 * a day at a window's edge.
 *
 * Precedence, highest first: a dated promotional window, a public holiday
 * (off-peak in full), then the weekday filter and the peak windows. A window
 * crossing midnight belongs to the day it starts, so the small hours are
 * judged against the previous day's weekday and holiday.
 */

/** How many days ahead the switch search looks; a weekday cycle fits twice. */
const SEARCH_DAYS = 9

const MINUTES_PER_DAY = 1440

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

/** One instant read in a schedule's zone. */
interface Moment {
  /** 0 = Sunday. */
  weekday: number
  /** Minutes since local midnight. */
  minutes: number
  /** `YYYY-MM-DD` in that zone. */
  date: string
}

/** One peak window, in minutes from its own day's midnight; an end above 1440 crosses midnight. */
interface Span {
  start: number
  end: number
}

/** `"HH:mm"` in minutes, or NaN. */
function parseMinutes(value: string): number {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value)
  if (match === null) return Number.NaN
  const hour = Number(match[1])
  const minute = Number(match[2])
  if (hour > 23 || minute > 59) return Number.NaN
  return hour * 60 + minute
}

/** `"YYYY-MM-DD"` shifted by whole days, on the UTC calendar so no local zone interferes. */
function addDays(date: string, days: number): string {
  const [year, month, day] = date.split('-').map(Number)
  const at = new Date(Date.UTC(year, month - 1, day))
  at.setUTCDate(at.getUTCDate() + days)
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${at.getUTCFullYear()}-${pad(at.getUTCMonth() + 1)}-${pad(at.getUTCDate())}`
}

/** The formatters, one per zone and shape: building one per judgement is the expensive part. */
const clockFormatters = new Map<string, Intl.DateTimeFormat>()

function formatter(timeZone: string, withWeekday: boolean): Intl.DateTimeFormat {
  const key = `${timeZone}|${withWeekday ? 'day' : 'time'}`
  let cached = clockFormatters.get(key)
  if (cached === undefined) {
    cached = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      hour12: false,
      ...(withWeekday ? { weekday: 'short', year: 'numeric', month: '2-digit', day: '2-digit' } : { year: 'numeric', month: '2-digit', day: '2-digit' }),
      hour: '2-digit',
      minute: '2-digit',
      ...(withWeekday ? {} : { second: '2-digit' }),
    })
    clockFormatters.set(key, cached)
  }
  return cached
}

/** The parts of one formatting, by type. */
function partMap(timeZone: string, at: Date, withWeekday: boolean): Record<string, string> {
  const out: Record<string, string> = {}
  for (const part of formatter(timeZone, withWeekday).formatToParts(at)) out[part.type] = part.value
  return out
}

/** The zone's wall clock at one instant. */
function momentAt(schedule: RateSchedule, at: Date): Moment {
  const parts = partMap(schedule.timeZone, at, true)
  const weekday = WEEKDAYS.indexOf(parts.weekday ?? '')
  return {
    weekday: weekday === -1 ? 0 : weekday,
    // Some engines render midnight as "24" under hour12: false.
    minutes: (Number(parts.hour) % 24) * 60 + Number(parts.minute),
    date: `${parts.year}-${parts.month}-${parts.day}`,
  }
}

/** One `"HH:mm"` window as minutes from its day's midnight; an end at or before the start crosses midnight. */
function spanOf(window: RateWindow): Span | undefined {
  const start = parseMinutes(window.start)
  const end = parseMinutes(window.end)
  if (Number.isNaN(start) || Number.isNaN(end)) return undefined
  return { start, end: end > start ? end : end + MINUTES_PER_DAY }
}

/** One list of windows, invalid entries dropped and the rest in start order. */
function spansOf(windows: readonly RateWindow[]): Span[] {
  const spans: Span[] = []
  for (const window of windows) {
    const span = spanOf(window)
    if (span !== undefined) spans.push(span)
  }
  return spans.sort((left, right) => left.start - right.start)
}

/** The zone's offset from UTC at one instant, measured rather than assumed. */
function zoneOffsetMs(timeZone: string, at: Date): number {
  const parts = partMap(timeZone, at, false)
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour) % 24,
    Number(parts.minute),
    Number(parts.second),
  )
  return asUtc - at.getTime()
}

/**
 * The real instant of one wall-clock time in a zone.
 *
 * The day is added on the zone's own calendar first and the offset is resolved
 * afterwards, so a 23- or 25-hour day cannot shift the answer by a day; one
 * correction step settles the offset the new instant actually has.
 *
 * @param timeZone - the schedule's zone.
 * @param baseDate - `YYYY-MM-DD` in that zone, the day the offset counts from.
 * @param dayOffset - whole days from `baseDate`.
 * @param minuteOfDay - minutes from that day's midnight.
 * @returns the instant in milliseconds, or NaN when the zone cannot be read.
 */
function instantOf(timeZone: string, baseDate: string, dayOffset: number, minuteOfDay: number): number {
  const date = addDays(baseDate, dayOffset)
  const [year, month, day] = date.split('-').map(Number)
  const guess = Date.UTC(year, month - 1, day, Math.floor(minuteOfDay / 60), minuteOfDay % 60)
  if (Number.isNaN(guess)) return Number.NaN
  const first = zoneOffsetMs(timeZone, new Date(guess))
  let instant = guess - first
  const second = zoneOffsetMs(timeZone, new Date(instant))
  if (second !== first) instant = guess - second
  return instant
}

/**
 * The calendar day a holiday calendar reads at one instant, in its own zone
 * when it names one. The parser drops a zone the platform cannot resolve, so
 * the profile's own zone needs no guard here.
 */
function holidayDateAt(schedule: RateSchedule, at: Date, fallback: string): string {
  const zone = schedule.publicHolidayTimeZone
  if (zone === undefined || schedule.publicHolidayDates === undefined) return fallback
  return momentAt({ ...schedule, timeZone: zone }, at).date
}

function isHoliday(schedule: RateSchedule, date: string): boolean {
  return schedule.publicHolidayDates?.includes(date) ?? false
}

/** Whether a dated window covers one day and weekday. */
function covers(override: RateOverride, date: string, weekday: number): boolean {
  if (override.startDate !== undefined && date < override.startDate) return false
  if (override.endDate !== undefined && date > override.endDate) return false
  return override.days.length === 0 || override.days.includes(weekday)
}

/**
 * Whether a promotional window is in force.
 *
 * The leg after midnight belongs to the day the window started, so the
 * previous day's weekday and date range decide it — the same rule the regular
 * peak windows follow.
 */
function overrideInForce(override: RateOverride, moment: Moment): boolean {
  const previousDate = addDays(moment.date, -1)
  const previousWeekday = (moment.weekday + 6) % 7
  if (covers(override, moment.date, moment.weekday)) {
    for (const window of override.windows) {
      const start = parseMinutes(window.start)
      const end = parseMinutes(window.end)
      if (Number.isNaN(start) || Number.isNaN(end)) continue
      if (end > start) {
        if (moment.minutes >= start && moment.minutes < end) return true
      } else if (moment.minutes >= start) {
        // Cross-midnight, or the whole day written as `00:00–00:00`.
        return true
      }
    }
  }
  if (!covers(override, previousDate, previousWeekday)) return false
  for (const window of override.windows) {
    const start = parseMinutes(window.start)
    const end = parseMinutes(window.end)
    if (Number.isNaN(start) || Number.isNaN(end)) continue
    if (end <= start && moment.minutes < end) return true
  }
  return false
}

/** The promotional window in force, the document's own order deciding between several. */
function activeOverride(schedule: RateSchedule, moment: Moment): RateOverride | undefined {
  for (const override of schedule.overrides ?? []) {
    if (overrideInForce(override, moment)) return override
  }
  return undefined
}

/**
 * Whether the regular cycle bills peak right now. A window crossing midnight
 * spills into the next day's small hours, and the previous day's holiday
 * suppresses that spill: a holiday evening's peak window must not make the
 * working day after it peak.
 */
function isPeak(schedule: RateSchedule, spans: readonly Span[], moment: Moment, previousDayHoliday: boolean): boolean {
  const previousWeekday = (moment.weekday + 6) % 7
  if (!previousDayHoliday && schedule.peakDays.includes(previousWeekday)) {
    for (const span of spans) {
      if (span.end > MINUTES_PER_DAY && moment.minutes < span.end - MINUTES_PER_DAY) return true
    }
  }
  if (schedule.peakDays.includes(moment.weekday)) {
    for (const span of spans) {
      if (moment.minutes >= span.start && moment.minutes < span.end) return true
    }
  }
  return false
}

/** One judgement: the state, and the promotional window that decided it when there is one. */
interface Judgement {
  period: RatePeriod
  override?: RateOverride
}

function judgeAt(schedule: RateSchedule, spans: readonly Span[], moment: Moment, holidayDate: string): Judgement {
  const override = activeOverride(schedule, moment)
  // A dated promotion is the more specific rule, so it outranks everything.
  if (override !== undefined) return { period: 'campaign', override }
  // A holiday is off-peak in full: neither the weekday filter nor a window
  // that started the evening before can make it peak.
  if (isHoliday(schedule, holidayDate)) return { period: 'offPeak' }
  const previousHoliday = isHoliday(schedule, addDays(holidayDate, -1))
  return { period: isPeak(schedule, spans, moment, previousHoliday) ? 'peak' : 'offPeak' }
}

/** The multiplier to show for one state, the active window's own badge winning. */
function badgeFor(profile: RateProfile, period: RatePeriod, override: RateOverride | undefined): string {
  if (period === 'campaign') {
    if (override?.badge !== undefined && override.badge !== '') return override.badge
    return profile.campaignBadge ?? profile.peakBadge
  }
  return period === 'peak' ? profile.peakBadge : profile.offPeakBadge
}

/** One instant's judgement together with the switch that follows it. */
interface Flip {
  minutes: number
  judgement: Judgement
}

/**
 * When the state next changes, and into what.
 *
 * A window boundary is not a switch: two peak windows meeting at noon change
 * nothing. So candidates are every midnight and every window edge for the next
 * days (both of a crossing window's legs), each resolved to a real instant and
 * judged with the same predicate as now — the first candidate whose judgement
 * differs is the switch.
 */
function nextFlip(schedule: RateSchedule, spans: readonly Span[], now: Date, moment: Moment, current: Judgement): Flip | undefined {
  const points: number[] = []
  /** Every edge of one window list, counted from the same day's midnight. */
  const edges = (list: readonly Span[], base: number) => {
    for (const span of list) {
      points.push(base + span.start)
      // A crossing window's end is normalised above 1440, and `end % 1440` is
      // the edge it has on the day the window starts; both are candidates,
      // because which one is the real edge depends on the day being scanned.
      points.push(base + (span.end % MINUTES_PER_DAY))
      points.push(base + span.end)
    }
  }
  for (let day = 0; day <= SEARCH_DAYS; day++) {
    const base = day * MINUTES_PER_DAY
    // Midnight can end a crossing window, start a holiday and open a promo.
    points.push(base)
    edges(spans, base)
    for (const override of schedule.overrides ?? []) edges(spansOf(override.windows), base)
  }
  const candidates = points.filter(value => value > moment.minutes).sort((left, right) => left - right)
  let previous = -1
  for (const point of candidates) {
    // The same edge is reached by two spellings; one judgement settles both.
    if (point === previous) continue
    previous = point
    const dayOffset = Math.floor(point / MINUTES_PER_DAY)
    const minuteOfDay = point % MINUTES_PER_DAY
    const instant = instantOf(schedule.timeZone, moment.date, dayOffset, minuteOfDay)
    if (Number.isNaN(instant) || instant <= now.getTime()) continue
    const at = new Date(instant)
    const wallAt = momentAt(schedule, at)
    const judgement = judgeAt(schedule, spans, wallAt, holidayDateAt(schedule, at, wallAt.date))
    if (judgement.period === current.period && (judgement.override?.periodName ?? '') === (current.override?.periodName ?? '')) continue
    return { minutes: Math.round((instant - now.getTime()) / 60000), judgement }
  }
  return undefined
}

/** The last judgement computed, per profile and minute: the search is the pricey part. */
const judged = new Map<string, { minute: number, state: RateState }>()

/**
 * The rate in force for one profile at one instant.
 *
 * @param profile - the matched profile.
 * @param now - the instant to judge.
 * @returns the state, its badge and the switch that follows it.
 */
export function currentRate(profile: RateProfile, now: Date): RateState {
  const minute = Math.floor(now.getTime() / 60000)
  const cached = judged.get(profile.id)
  if (cached !== undefined && cached.minute === minute) return cached.state

  const schedule = profile.schedule
  const spans = spansOf(schedule.peakWindows)
  const moment = momentAt(schedule, now)
  const judgement = judgeAt(schedule, spans, moment, holidayDateAt(schedule, now, moment.date))
  const flip = nextFlip(schedule, spans, now, moment, judgement)
  const state: RateState = {
    period: judgement.period,
    badge: badgeFor(profile, judgement.period, judgement.override),
    minutesUntilSwitch: flip === undefined ? Number.POSITIVE_INFINITY : flip.minutes,
    ...(flip === undefined ? {} : {
      nextPeriod: flip.judgement.period,
      nextBadge: badgeFor(profile, flip.judgement.period, flip.judgement.override),
    }),
    ...(judgement.override?.name === undefined ? {} : { overrideName: judgement.override.name }),
    ...(flip?.judgement.override?.name === undefined ? {} : { nextOverrideName: flip.judgement.override.name }),
  }
  judged.set(profile.id, { minute, state })
  return state
}

/** Drop the memo: a new catalog is a new set of clocks. */
export function forgetRates(): void {
  judged.clear()
}

/** Whole minutes as the badge's own short form (`2d 7h`, `1h 20m`, `45m`); no countdown has no text. */
export function formatCountdown(minutes: number): string {
  if (!Number.isFinite(minutes)) return ''
  const total = Math.max(0, Math.round(minutes))
  if (total < 60) return `${total}m`
  if (total < MINUTES_PER_DAY) {
    const hours = Math.floor(total / 60)
    const rest = total % 60
    return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`
  }
  const days = Math.floor(total / MINUTES_PER_DAY)
  const hours = Math.floor((total % MINUTES_PER_DAY) / 60)
  return hours === 0 ? `${days}d` : `${days}d ${hours}h`
}
