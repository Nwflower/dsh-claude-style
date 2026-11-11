import { HOME_HEAT_RAMP } from '../../constants'
import { activeLocale } from '../../core/i18n'
import { homeDayKey } from './home-store'
import type { HomeUsageState, ListSummary } from './home-store'
import type { UsageDay, UsageModel, UsageReport, UsageTotals } from '@dsh-claude-style/contracts/usage'
import { copy } from './copy'
import type { CopyKey } from './copy'

/** One cell of the heat grid. */
export interface HeatCell {
  date: string
  tokens: number
  level: number
}

/** Heat-grid columns: twenty-six weeks of days, Sunday first — Claude Code's span. */
export const HOME_HEAT_WEEKS = 26
/** A day's heat is bucketed against the busiest day shown, one level per step of the ramp. */
export const HOME_HEAT_STEPS = HOME_HEAT_RAMP.length
/**
 * The yardstick line's books, shortest first: each title's copy key, its
 * English fallback, and its length in tokens. A public-domain classic is
 * measured by feeding its full Project Gutenberg / Wikisource text to the
 * o200k_base tokenizer (the English original or the standard English
 * translation; Faust is the German original); a title still under copyright
 * keeps a word-count estimate instead.
 */
export const HOME_BOOKS: { key: CopyKey, tokens: number }[] = [
  { key: 'homeBookTaoTeChing', tokens: 7607 },
  { key: 'homeBookYellowWallpaper', tokens: 7778 },
  { key: 'homeBookMetamorphosis', tokens: 27557 },
  { key: 'homeBookJekyllAndHyde', tokens: 34713 },
  { key: 'homeBookAlice', tokens: 37248 },
  { key: 'homeBookAnimalFarm', tokens: 39000 },
  { key: 'homeBookChristmasCarol', tokens: 40306 },
  { key: 'homeBookCallOfTheWild', tokens: 42383 },
  { key: 'homeBookTimeMachine', tokens: 42817 },
  { key: 'homeBookWizardOfOz', tokens: 51004 },
  { key: 'homeBookHeartOfDarkness', tokens: 52163 },
  { key: 'homeBookFaust', tokens: 53930 },
  { key: 'homeBookTurnOfTheScrew', tokens: 57484 },
  { key: 'homeBookAesopsFables', tokens: 60707 },
  { key: 'homeBookPeterPan', tokens: 63821 },
  { key: 'homeBookGatsby', tokens: 65763 },
  { key: 'homeBookPrince', tokens: 66670 },
  { key: 'homeBookInvisibleMan', tokens: 68163 },
  { key: 'homeBookAndersensFairyTales', tokens: 73931 },
  { key: 'homeBookWarOfTheWorlds', tokens: 80168 },
  { key: 'homeBookBeyondGoodAndEvil', tokens: 89836 },
  { key: 'homeBookWhiteFang', tokens: 96418 },
  { key: 'homeBookMeditations', tokens: 96973 },
  { key: 'homeBookFrankenstein', tokens: 97886 },
  { key: 'homeBookPhilosophersStone', tokens: 100000 },
  { key: 'homeBookDorianGray', tokens: 106339 },
  { key: 'homeBookToLive', tokens: 115000 },
  { key: 'homeBookHobbit', tokens: 123000 },
  { key: 'homeBookGrimmsFairyTales', tokens: 132467 },
  { key: 'homeBook1984', tokens: 136278 },
  { key: 'homeBookSherlockHolmes', tokens: 138725 },
  { key: 'homeBookGulliversTravels', tokens: 138958 },
  { key: 'homeBookWalden', tokens: 152659 },
  { key: 'homeBookRobinsonCrusoe', tokens: 153596 },
  { key: 'homeBookHuckleberryFinn', tokens: 154263 },
  { key: 'homeBookDivineComedy', tokens: 157765 },
  { key: 'homeBookMadameBovary', tokens: 159575 },
  { key: 'homeBookZarathustra', tokens: 161488 },
  { key: 'homeBookPride', tokens: 171701 },
  { key: 'homeBookOdyssey', tokens: 173150 },
  { key: 'homeBookTaleOfTwoCities', tokens: 187333 },
  { key: 'homeBookThreeBody', tokens: 202000 },
  { key: 'homeBookDracula', tokens: 213648 },
  { key: 'homeBookGreatExpectations', tokens: 252176 },
  { key: 'homeBookJaneEyre', tokens: 256179 },
  { key: 'homeBookRepublic', tokens: 279539 },
  { key: 'homeBookCrimeAndPunishment', tokens: 285009 },
  { key: 'homeBookLeviathan', tokens: 304696 },
  { key: 'homeBookMobyDick', tokens: 306522 },
  { key: 'homeBookDarkForest', tokens: 307000 },
  { key: 'homeBookDeathsEnd', tokens: 336000 },
  { key: 'homeBookAnnaKarenina', tokens: 481659 },
  { key: 'homeBookBrothersKaramazov', tokens: 487590 },
  { key: 'homeBookDonQuixote', tokens: 574243 },
  { key: 'homeBookLordOfTheRings', tokens: 625000 },
  { key: 'homeBookThreeKingdoms', tokens: 638009 },
  { key: 'homeBookCountOfMonteCristo', tokens: 651128 },
  { key: 'homeBookWarAndPeace', tokens: 769001 },
  { key: 'homeBookJourneyWest', tokens: 783200 },
  { key: 'homeBookLesMiserables', tokens: 801791 },
  { key: 'homeBookRedChamber', tokens: 903956 },
  { key: 'homeBookWaterMargin', tokens: 958242 },
  { key: 'homeBookOrdinaryWorld', tokens: 998000 },
  { key: 'homeBookHarryPotter', tokens: 1409000 },
  { key: 'homeBookLostTime', tokens: 1647000 },
]
/** The models chart's own window, in days: Claude Code's chart spans a month. */
export const HOME_CHART_DAYS = 30
/** Models the ranked list shows before its "show more" row. */
export const HOME_MODEL_ROWS = 6
/** The range pills: all time, or the last 30/7 calendar days including today. */
export const HOME_RANGES: { id: string, labelKey: CopyKey, days: number }[] = [
  { id: 'all', labelKey: 'homeRangeAll', days: 0 },
  { id: '30d', labelKey: 'homeRange30d', days: 30 },
  { id: '7d', labelKey: 'homeRange7d', days: 7 },
]

/** The short day-label formatter, in the shell's language: "Aug 26", "8月26日". */
export function homeShortDateFormat() {
  return new Intl.DateTimeFormat(activeLocale(), { month: 'short', day: 'numeric' })
}

/** One day key as a short label, through `homeShortDateFormat()`'s formatter. */
export function homeShortDate(format: Intl.DateTimeFormat, day: string) {
  const parts = day.split('-')
  return format.format(new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])))
}

/** The first day key of a range window; all time has none. */
export function homeRangeStart(windowDays: number) {
  if (!windowDays) return null
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  start.setDate(start.getDate() - (windowDays - 1))
  return homeDayKey(start)
}

export function formatHomeCount(count: unknown) {
  const value = Math.round(Number(count) || 0)
  return String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

/** A settlement hour as Claude Code writes it: "5 AM" / "下午 3 点". */
export function formatHomeHour(hour: number) {
  const h12 = hour % 12 === 0 ? 12 : hour % 12
  return copy(hour < 12 ? 'homeHourAm' : 'homeHourPm', { hour: h12 })
}

/**
 * The tokens one day entry stands for. The host half's fold carries the four
 * buckets; the session list's roll-up can only carry one total per day, so it
 * is read when present.
 */
export function homeDayTokens(day: UsageDay | UsageTotals): number {
  if (day === null || day === undefined) return 0
  if (day.total !== undefined) return Number(day.total) || 0
  return (day.input || 0) + (day.output || 0) + (day.cacheRead || 0) + (day.cacheWrite || 0)
}

/** One model's bucket sum, for the ranked list's input and output columns. */
export function homeModelTokens(entry: UsageModel): number {
  if (entry.tokens !== undefined) return Number(entry.tokens) || 0
  return (entry.input || 0) + (entry.output || 0) + (entry.cacheRead || 0) + (entry.cacheWrite || 0)
}

/**
 * The heat grid: one cell per day, weeks as columns, Sunday first, running
 * back HOME_HEAT_WEEKS weeks from today. Days the roll-up does not cover are
 * cells with no heat, which is exactly what an empty cell means.
 */
export function homeHeatGrid(days: UsageDay[] | null | undefined) {
  const byDate: Record<string, number> = {}
  const list = days === null || days === undefined ? [] : days
  for (let i = 0; i < list.length; i++) {
    byDate[list[i].date] = homeDayTokens(list[i])
  }
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const start = new Date(today)
  start.setDate(start.getDate() - (HOME_HEAT_WEEKS * 7 - 1))
  start.setDate(start.getDate() - start.getDay())
  const cells: HeatCell[] = []
  let peak = 0
  for (const cursor = new Date(start); cursor <= today; cursor.setDate(cursor.getDate() + 1)) {
    const key = homeDayKey(cursor)
    const tokens = byDate[key] || 0
    if (tokens > peak) peak = tokens
    cells.push({ date: key, tokens, level: 0 })
  }
  for (let c = 0; c < cells.length; c++) {
    if (cells[c].tokens === 0 || peak === 0) continue
    cells[c].level = Math.max(1, Math.min(HOME_HEAT_STEPS, Math.ceil(cells[c].tokens / peak * HOME_HEAT_STEPS)))
  }
  return { cells, peak }
}

/** One row of the ranked model list; the buckets are there when the host half's fold answered. */
export interface HomeModel {
  id: string
  input?: number
  output?: number
  cacheRead?: number
  cacheWrite?: number
  tokens: number
  /** The list's own count of sessions on this model; the fold's answer carries no such count. */
  sessions?: number
  lastAt?: number
}

/**
 * The ranked model list, from whichever source can answer.
 *
 * The host half's fold attributes every usage sample it can to its route, so
 * its answer carries each model's four buckets; the session list carries one
 * total per model and no split. Both are sorted by tokens.
 */
export function homeModelList(value: UsageReport | null, listed: ListSummary | null): HomeModel[] | null {
  if (value !== null && Array.isArray(value.models) && value.models.length > 0) {
    return value.models.map((entry: UsageModel) => ({
      id: entry.id,
      input: entry.input || 0,
      output: entry.output || 0,
      cacheRead: entry.cacheRead || 0,
      cacheWrite: entry.cacheWrite || 0,
      tokens: homeModelTokens(entry),
      sessions: entry.sessions,
      lastAt: entry.lastAt
    }))
  }
  if (listed === null) return null
  return listed.models.map(entry => ({
    id: entry.id,
    tokens: entry.tokens,
    sessions: entry.sessions,
    lastAt: entry.lastAt
  }))
}

/**
 * The models chart's columns: the last HOME_CHART_DAYS days of the roll-up's
 * own per-day per-model totals, in calendar order.
 *
 * The fold attributes a sample only when the event names its route, so a day
 * whose samples are all unattributed carries no models and draws no stack —
 * its share of the day simply stays out of the chart.
 */
export function homeModelDays(value: UsageReport | null, windowDays: number) {
  if (value === null || !Array.isArray(value.days)) return null
  const span = windowDays > 0 && windowDays < HOME_CHART_DAYS ? windowDays : HOME_CHART_DAYS
  // The span is at least a day, so the window has a first day.
  const start = homeRangeStart(span)!
  const columns: { date: string, models: Record<string, number> }[] = []
  for (let i = 0; i < value.days.length; i++) {
    const day = value.days[i]
    if (day.date < start || day.models === undefined || day.models === null) continue
    columns.push({ date: day.date, models: day.models })
  }
  if (columns.length === 0) return null
  columns.sort((left, right) => left.date < right.date ? -1 : 1)
  return columns
}

/**
 * Every figure the panel draws, from the two sources and the picked range.
 *
 * @param state - the roll-up store's snapshot.
 * @param listed - the session list's roll-up, or null.
 * @param range - the picked range id ('all' / '30d' / '7d').
 * @param bookPick - the panel's draw in [0, 1), which picks the yardstick book.
 * @returns the figures both views read.
 */
export function homePanelData(state: HomeUsageState, listed: ListSummary | null, range: string, bookPick: number) {
  const value = state.value
  const ready = value !== null && value.totals !== undefined
  const totals = ready ? value.totals : null
  const known = ready || listed !== null
  let windowDays = 0
  for (let r = 0; r < HOME_RANGES.length; r++) {
    if (HOME_RANGES[r].id === range) windowDays = HOME_RANGES[r].days
  }
  const start = homeRangeStart(windowDays)
  const startMs = start === null ? null : new Date(`${start}T00:00:00`).getTime()
  const inRange = (date: string) => start === null || date >= start
  let tokens = 0
  let calls: number | null = null
  let sessions: number | null = null
  let activeDays: number | null = null
  if (ready && start === null && totals !== null) {
    // All time reads the fold's own totals; its session count is already the
    // distinct union over every day.
    tokens = homeDayTokens(totals)
    calls = totals.calls ?? null
    sessions = totals.sessions ?? null
    activeDays = totals.activeDays ?? null
  } else if (ready) {
    // A window sums the per-day buckets. Sessions union the per-day id lists
    // when the host half carries them on every day; an older host half has
    // none, and the per-day counts then sum to an upper bound rather than
    // reading zero.
    const ids: Record<string, boolean> = {}
    let everyDayHasIds = true
    let daySessions = 0
    calls = 0
    sessions = 0
    activeDays = 0
    for (let d = 0; d < value.days.length; d++) {
      const day = value.days[d]
      if (!inRange(day.date)) continue
      tokens += homeDayTokens(day)
      calls += day.calls || 0
      activeDays += 1
      if (Array.isArray(day.sessionIds)) {
        for (let s = 0; s < day.sessionIds.length; s++) ids[day.sessionIds[s]] = true
      } else {
        everyDayHasIds = false
      }
      daySessions += day.sessions || 0
    }
    sessions = everyDayHasIds ? Object.keys(ids).length : daySessions
  } else if (listed !== null) {
    // The list's fall-back: a session's whole total rides its last-activity
    // day, so the window keeps the sessions whose last prompt falls inside.
    sessions = 0
    activeDays = 0
    for (let e = 0; e < listed.entries.length; e++) {
      const item = listed.entries[e]
      if (startMs !== null && item.at < startMs) continue
      tokens += item.tokens
      sessions += 1
    }
    for (let ld = 0; ld < listed.days.length; ld++) {
      if (inRange(listed.days[ld].date)) activeDays += 1
    }
  }
  // The hour histogram is the fold's own (behind a cost-meter answer it
  // lands a moment later). All time reads the whole histogram; a window sums
  // its own days' histograms, so the peak hour follows the range pills.
  let hourCounts: number[] | null = null
  if (ready && start === null && Array.isArray(value.hours)) hourCounts = value.hours
  else if (ready && start !== null && Array.isArray(value.days)) {
    for (let hd = 0; hd < value.days.length; hd++) {
      const hourDay = value.days[hd]
      if (!inRange(hourDay.date) || !Array.isArray(hourDay.hours)) continue
      if (hourCounts === null) hourCounts = new Array(24).fill(0)
      for (let dh = 0; dh < 24; dh++) hourCounts[dh] += Number(hourDay.hours[dh]) || 0
    }
  }
  let peakHour: string | null = null
  if (hourCounts !== null) {
    let bestHour = 0
    let hourSum = 0
    for (let h = 0; h < 24; h++) {
      const hourCount = Number(hourCounts[h]) || 0
      hourSum += hourCount
      if (hourCount > (Number(hourCounts[bestHour]) || 0)) bestHour = h
    }
    if (hourSum > 0) peakHour = formatHomeHour(bestHour)
  }
  let model: string | null = null
  if (listed !== null) {
    if (startMs === null) model = listed.model
    else {
      let bestSessions = 0
      for (let m = 0; m < listed.models.length; m++) {
        const windowed = listed.models[m]
        if (windowed.lastAt < startMs || windowed.sessions <= bestSessions) continue
        bestSessions = windowed.sessions
        model = windowed.id
      }
    }
  }
  if (model === null && ready && typeof value.model === 'string') model = value.model
  // The yardstick line reads the window's own total, like the tiles above it.
  // The panel draws its book once; a window that has not passed that book
  // yet steps down to the longest book it has passed, so switching ranges
  // keeps the same book whenever the totals allow.
  let fun: string | null = null
  let bookIndex = Math.min(HOME_BOOKS.length - 1, Math.floor(bookPick * HOME_BOOKS.length))
  while (bookIndex >= 0 && tokens < HOME_BOOKS[bookIndex].tokens) bookIndex -= 1
  if (bookIndex >= 0) {
    const book = HOME_BOOKS[bookIndex]
    fun = copy('homeFunBook', {
      count: formatHomeCount(Math.round(tokens / book.tokens)),
      book: copy(book.key),
    })
  }
  const models = homeModelList(value, listed)
  // Only what the two views draw: the window's own bookkeeping (the range
  // start, its milliseconds, the day test) stays local to this file.
  return {
    listed,
    known,
    tokens,
    calls,
    sessions,
    // A date-window denominator would describe a different population; the
    // scoped denominator is shown on the all-time view alone.
    totalSessions: ready && start === null && value.scope !== undefined && value.scope !== 'all' && typeof value.totalSessions === 'number'
      ? value.totalSessions
      : null,
    activeDays,
    peakHour,
    model,
    grid: homeHeatGrid(ready ? value.days : (listed === null ? null : listed.days)),
    fun,
    models,
    modelDays: homeModelDays(value, windowDays),
  }
}

/** Every figure the panel draws (homePanelData). */
export type HomePanel = ReturnType<typeof homePanelData>
