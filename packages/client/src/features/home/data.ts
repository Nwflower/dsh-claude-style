import { HOME_HEAT_RAMP, USAGE_ROUTE } from '../../constants'
import { activeLocale } from '../../core/i18n'
import { pad2 } from '../../shared/format'
import { notifyAll } from '@dsh-claude-style/engine/notify'
import type { HostContext } from '@dsh-claude-style/engine/host'
import type { HostRemoteListAnswer, HostSessionRow } from '@dsh-claude-style/contracts/services'
import type { UsageAnswer, UsageDay, UsageModel, UsageReport, UsageTotals } from '@dsh-claude-style/contracts/usage'
import { copy } from './copy'
import type { CopyKey } from './copy'
import { homeRefreshDue } from './usage-refresh'
import type { HomeRefreshReason } from './usage-refresh'
import { hostRemoteSession } from '@dsh-claude-style/engine/host'

/**
 * The roll-up store's snapshot: the route's last answer (the host half's
 * usage fold, packages/host/src/usage-fold.ts), whether more is coming, and why not.
 */
export interface HomeUsageState {
  value: UsageReport | null
  computing: boolean
  error: string | null
  loading: boolean
  /** When this page last heard from the route, on the page's clock; null before the first answer. */
  answeredAt: number | null
}

/** One model's share in the session list's roll-up. */
export interface ListedModel {
  id: string
  tokens: number
  sessions: number
  lastAt: number
}

/** The session list's roll-up (summarizeSessionList). */
export interface ListSummary {
  tokens: number
  sessions: number
  activeDays: number
  model: string | null
  models: ListedModel[]
  days: { date: string, total: number }[]
  entries: { at: number, tokens: number, model: string | null }[]
}

/** One cell of the heat grid. */
export interface HeatCell {
  date: string
  tokens: number
  level: number
}

/**
 * The usage panel's data: the host half's roll-up route, the session list's
 * own projections, and the small vocabulary the two views share.
 *
 * The route (`USAGE_ROUTE`) is the panel's first source: it folds the local
 * session logs (or reads the cost-meter ledger) and answers immediately with
 * whatever it already knows. A cold answer carries `computing`, and the panel
 * keeps its skeleton up and polls until the value lands — so the first paint
 * never waits on the aggregation, and a value that has not arrived yet is
 * never drawn as a zero.
 *
 * The session list is the second source. Every listed session carries the
 * host's token-usage and model-selection projections, so it answers even when
 * the route cannot (an older host half, or a failed fold). It is coarser —
 * one total per session, bucketed onto that session's last-activity day — so
 * the panel names the source it drew from.
 *
 * `homePanelData` is the one derivation both views read: the range window and
 * the figures it sums, the heat grid's cells, the ranked model list, and the
 * per-day per-model totals the models chart stacks.
 */
/** Where the roll-up lands while the host half is still folding. */
export const HOME_POLL_MS = 800
/**
 * Polls in a row a cold fold may go unanswered before the panel settles on what
 * it has: the fold reads every changed session log, and a large history on a
 * slow disk takes minutes, so the panel stops waiting long after the first
 * numbers could have arrived. The next read starts over once they do.
 */
export const HOME_POLL_MAX = 180
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

/** A local calendar day, matching the host half's day keys. */
export function homeDayKey(date: Date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`
}

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
 * The roll-up store: the route's answer, the list's answer, and the reads that
 * keep the first one current.
 *
 * The route answers with the host half's last finished fold, so what the panel
 * draws is a snapshot. The store reads it when the page has no numbers yet, when
 * the panel asks again after the numbers aged on show, and while the host half
 * reports that it is still folding — a cold fold over a large history takes
 * minutes, and the panel fills in as soon as it lands.
 *
 * @returns accessors, the loads, and a stop that ends the reads and listeners.
 */
export function createHomeUsage(ctx: HostContext) {
  /** What the panel draws: the last answer, whether more is coming, and why not. */
  const usage: HomeUsageState = { value: null, computing: false, error: null, loading: false, answeredAt: null }
  let listSummary: ListSummary | null = null
  let listLoading = false
  const listeners: (() => void)[] = []
  let pollTimer: ReturnType<typeof setTimeout> | null = null
  /** Polls this read has made; reset by each ask (loadUsage). */
  let polls = 0
  let disposed = false

  function emit() {
    notifyAll(listeners)
  }

  function subscribe(listener: () => void) {
    listeners.push(listener)
    return () => {
      const index = listeners.indexOf(listener)
      if (index !== -1) listeners.splice(index, 1)
    }
  }

  function stopPolling() {
    if (pollTimer !== null) {
      clearTimeout(pollTimer)
      pollTimer = null
    }
  }

  /**
   * One read of the roll-up. The answer's `computing` schedules the next poll,
   * so the panel fills in as soon as the host half has the numbers; a read whose
   * polls run out leaves the panel on what it has, and the next ask starts the
   * count over.
   *
   * @param force - read even though numbers are on show and nothing is folding.
   */
  function loadUsage(force?: boolean) {
    if (disposed || usage.loading) return
    if (!force && usage.value !== null && !usage.computing) return
    // Each ask is its own count: a fold behind a cold start may take minutes,
    // and a limit carried across asks would spend the whole budget on the first.
    polls = 0
    read()
  }

  /** One request to the route, and the poll its answer asks for while the host half is folding. */
  function read() {
    usage.loading = true
    const request = fetch(USAGE_ROUTE, { credentials: 'same-origin', headers: { accept: 'application/json' } })
    request.then(response => response !== null && response.ok === true ? response.json() : null).then((body: UsageAnswer | null) => {
      usage.loading = false
      if (disposed) return
      // A route that refused still answered: the next ask waits out the same
      // period instead of retrying on every pass.
      usage.answeredAt = Date.now()
      if (body === null || body.ok !== true) {
        usage.error = 'unavailable'
        emit()
        return
      }
      usage.value = body.value === undefined ? null : body.value
      usage.computing = body.computing === true
      usage.error = body.error === undefined ? null : body.error
      emit()
      if (usage.computing) {
        if (polls >= HOME_POLL_MAX) return
        polls += 1
        stopPolling()
        pollTimer = setTimeout(() => {
          pollTimer = null
          read()
        }, HOME_POLL_MS)
      }
    // A failed usage fetch is the panel's "unavailable" state, not an exception: the panel renders without the numbers (D12).
    }).catch(() => {
      usage.loading = false
      if (disposed) return
      usage.answeredAt = Date.now()
      usage.error = 'unavailable'
      emit()
    })
  }

  /**
   * Read the roll-up again if the numbers on show have aged past the wake or
   * the period (usage-refresh.ts), and answer whether this page asked.
   *
   * A read of this page's own counts as in flight while it crosses or while it
   * has a poll pending: that poll is what carries the numbers in. A read whose
   * polls have run out leaves nothing pending, so the next period asks again
   * rather than the panel going quiet for good.
   *
   * @param reason - `'tick'` for a panel standing on the page, `'wake'` for one the reader came back to.
   */
  function refreshUsage(reason: HomeRefreshReason) {
    if (disposed) return false
    const due = homeRefreshDue(Date.now(), { answeredAt: usage.answeredAt, busy: usage.loading || pollTimer !== null }, reason)
    if (!due) return false
    loadUsage(true)
    return true
  }

  /**
   * The session list's roll-up.
   *
   * The host's list rows carry their own projection block
   * (`projections.values`): `tokenUsage` with its four disjoint buckets,
   * `modelSelection` with the route the session last used, and
   * `sessionListMetadata` with the blank flag and the last prompt time.
   * Summing them gives the panel a second, cheaper source — and the model
   * list's fallback when the roll-up route cannot answer.
   *
   * A session's whole total is bucketed onto its own last-activity day: the
   * list has no per-day split, so this is coarser than the host half's fold,
   * which is exactly why the panel names the source it drew from.
   */
  function summarizeSessionList(rows: HostSessionRow[]): ListSummary {
    let tokens = 0
    const dayCount: Record<string, boolean> = {}
    const byDay: Record<string, number> = {}
    const byModel: Record<string, { tokens: number, sessions: number, lastAt: number }> = {}
    const entries: ListSummary['entries'] = []
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const values = row !== null && row !== undefined && row.projections !== undefined && row.projections !== null
        ? row.projections.values
        : null
      if (values === null || values === undefined) continue
      const meta = values.sessionListMetadata
      if (meta !== null && meta !== undefined && meta.blank === true) continue
      const bucket = values.tokenUsage
      const total = bucket === null || bucket === undefined ? 0
        : (bucket.uncachedInputTokens || 0) + (bucket.outputTokens || 0)
          + (bucket.cacheReadTokens || 0) + (bucket.cacheWriteTokens || 0)
      tokens += total
      const at = meta !== null && meta !== undefined && typeof meta.lastPromptAt === 'number'
        ? meta.lastPromptAt
        : row.updatedAt
      const selection = values.modelSelection
      const picked = selection !== null && selection !== undefined ? (selection.next || selection.lastUsed) : null
      const id = picked !== null && picked !== undefined && typeof picked.model === 'string' ? picked.model : null
      entries.push({ at: typeof at === 'number' ? at : 0, tokens: total, model: id })
      if (typeof at === 'number') {
        const day = homeDayKey(new Date(at))
        dayCount[day] = true
        byDay[day] = (byDay[day] || 0) + total
      }
      if (id !== null) {
        let cell = byModel[id]
        if (cell === undefined) {
          cell = { tokens: 0, sessions: 0, lastAt: 0 }
          byModel[id] = cell
        }
        cell.tokens += total
        cell.sessions += 1
        if (typeof at === 'number' && at > cell.lastAt) cell.lastAt = at
      }
    }
    let favorite: string | null = null
    let best = 0
    const models: ListedModel[] = []
    for (const name in byModel) {
      models.push({ id: name, tokens: byModel[name].tokens, sessions: byModel[name].sessions, lastAt: byModel[name].lastAt })
      if (byModel[name].sessions > best) {
        best = byModel[name].sessions
        favorite = name
      }
    }
    models.sort((left, right) => right.tokens - left.tokens)
    const days: ListSummary['days'] = []
    for (const date in byDay) days.push({ date, total: byDay[date] })
    return { tokens, sessions: entries.length, activeDays: Object.keys(dayCount).length, model: favorite, models, days, entries }
  }

  /** Read the session list once; a host without the remote service keeps the route's answer. */
  function loadSessionSummary() {
    if (disposed || listLoading || listSummary !== null) return
    const sessions = hostRemoteSession(ctx)
    if (sessions === undefined || sessions === null || typeof sessions.list !== 'function') return
    listLoading = true
    sessions.list({}).then((result: HostRemoteListAnswer) => {
      listLoading = false
      if (disposed) return
      const items = result !== null && result !== undefined && result.ok === true
        && result.value !== null && result.value !== undefined && Array.isArray(result.value.items)
        ? result.value.items
        : null
      if (items === null) return
      listSummary = summarizeSessionList(items)
      emit()
    // The roll-up is a summary the panel can do without: a failed fetch just ends the loading mark (D12).
    }).catch(() => {
      listLoading = false
    })
  }

  return {
    state() { return usage },
    list() { return listSummary },
    listLoading() { return listLoading },
    subscribe,
    /** Ask every view to re-render; a state change outside the store uses it. */
    notify: emit,
    load: loadUsage,
    refresh: refreshUsage,
    loadList: loadSessionSummary,
    stop() {
      disposed = true
      stopPolling()
      listeners.length = 0
    },
  }
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
