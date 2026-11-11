/**
 * Merging the per-session folds into one day map, and shaping the payload the
 * `usage` route answers with.
 *
 * The merge keeps the ids behind each day, because the dashboard unions session
 * ids over a range window instead of summing per-day counts: a session spanning
 * two days is one session. The payload's `hours` arrays are the one figure the
 * fold alone can supply.
 *
 * The ledger and our own fold are two accounts of the same days, so they combine
 * by date and never by addition: each day keeps the account that recorded more of
 * it, and the day's sessions come from both.
 */
import { BUCKET_KEYS, addBuckets, emptyBuckets } from './usage-ledger.js'
import type { Buckets, DayBuckets } from './usage-ledger.js'
import type { RecordSession } from './usage-record.js'

import type { HomeSessionScope } from '@dsh-claude-style/contracts/prefs'

/** What the service reads out: the summarized days, models and totals, or null before the first read. */
export interface UsageSummary {
  source: string
  /** Set when the figures could not be read at all this pass. */
  unavailable?: boolean
  /** How many session logs this pass folded afresh, against the ones the cache answered. */
  read?: number
  /** How many session logs this pass could not read: they keep no fingerprint and are retried next pass. */
  failed?: number
  computedAt: number
  days: Record<string, unknown>[]
  models: Record<string, unknown>[]
  firstDay: string | null
  lastDay: string | null
  hours?: number[]
  totals: Record<string, unknown>
  /** How many session logs the pass walked, against `totals.sessions` from the accounts behind them. */
  sessions?: number
  scope?: HomeSessionScope
  /** The unfiltered record's session count, for a scoped panel's denominator. */
  totalSessions?: number
}

/** The four disjoint buckets of one day or one model, summed. */
function bucketTotal(buckets: Partial<Buckets> | null | undefined): number {
  let total = 0
  for (const key of BUCKET_KEYS) total += Number(buckets?.[key]) || 0
  return total
}

/** Sum the per-session day maps into one, tracking distinct sessions per day. */
export function mergeSessions(sessions: ReadonlyMap<string, RecordSession>): Map<string, DayBuckets> {
  const days = new Map<string, DayBuckets>()
  for (const [id, entry] of sessions) {
    for (const [day, buckets] of entry.days) {
      let target = days.get(day)
      if (target === undefined) {
        target = emptyBuckets()
        target.sessions = new Set()
        target.hours = new Array(24).fill(0)
        days.set(day, target)
      }
      addBuckets(target, buckets, 1)
      if (target.sessions instanceof Set) target.sessions.add(id)
      const dayHours = target.hours ?? (target.hours = new Array(24).fill(0))
      for (let hour = 0; hour < 24; hour += 1) dayHours[hour] += (buckets.hours ?? [])[hour] ?? 0
      if (buckets.models === undefined) continue
      for (const [model, cell] of buckets.models) {
        if (target.models === undefined) target.models = new Map()
        let into = target.models.get(model)
        if (into === undefined) {
          into = emptyBuckets()
          target.models.set(model, into)
        }
        addBuckets(into, cell, 1)
      }
    }
  }
  for (const day of days.values()) {
    const behind = day.sessions instanceof Set ? [...day.sessions].sort() : []
    day.sessionIds = behind
    day.sessions = behind.length
  }
  return days
}

export function summarize(
  days: Map<string, DayBuckets>,
  sessionCount: number,
  source: string,
  hours?: number[],
  window?: { sessionIds?: ReadonlySet<string>, dates?: ReadonlySet<string> },
): UsageSummary {
  const inWindow = (date: string) => window?.dates === undefined || window.dates.has(date)
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
    sessionIds: buckets.sessionIds === undefined ? []
      : [...buckets.sessionIds].filter((id) => typeof id === 'string').sort(),
    // The day's tokens per model, for the models chart. Absent when nothing
    // on the day is attributed to a model.
    models: buckets.models === undefined ? undefined
      : Object.fromEntries([...buckets.models].map(([id, cell]) => [id, bucketTotal(cell)])),
    // The day's settlements per hour, so a range window can find its own peak
    // hour. Only the fold knows the hour of a settlement.
    ...(buckets.hours === undefined ? {} : { hours: buckets.hours }),
  })).sort((left, right) => (left.date < right.date ? -1 : 1))
  const totals = emptyBuckets()
  const byModel = new Map<string, Buckets>()
  for (const [date, buckets] of days) {
    // The window's own sums: over every day the summary carries, or over the
    // dates and sessions a caller names — the two accounts behind a merged map
    // cover different spans, so neither may answer for the whole map alone.
    if (!inWindow(date)) continue
    addBuckets(totals, buckets, 1)
    if (buckets.models === undefined) continue
    for (const [id, cell] of buckets.models) {
      let into = byModel.get(id)
      if (into === undefined) {
        into = emptyBuckets()
        byModel.set(id, into)
      }
      addBuckets(into, cell, 1)
    }
  }
  // Biggest spender first: the dashboard's ranked list and its colour ramp
  // both read this order.
  const models = [...byModel.entries()]
    .map(([id, cell]) => ({ id, ...cell, tokens: bucketTotal(cell) }))
    .sort((left, right) => right.tokens - left.tokens)
  const count = window?.sessionIds === undefined ? sessionCount : window.sessionIds.size
  return {
    source,
    computedAt: Date.now(),
    days: list,
    models,
    firstDay: list.length === 0 ? null : list[0].date,
    lastDay: list.length === 0 ? null : list[list.length - 1].date,
    // The fold knows the hour of every settlement; the cost-meter ledger has
    // no hour dimension, so its histogram arrives from the fold afterwards.
    ...(hours === undefined ? {} : { hours }),
    totals: {
      ...totals,
      sessions: count,
      activeDays: list.filter((day) => inWindow(day.date)).length,
    },
  }
}

/** What merging the two accounts produced: the days, the sessions behind them, and whether the fold supplied a day's figures. */
export interface LedgerMerge {
  days: Map<string, DayBuckets>
  sessionIds: Set<string>
  /** Whether the figures of any day came from the fold rather than the ledger. */
  folded: boolean
}

/**
 * Combine the cost meter's ledger with our own fold by date.
 *
 * Both describe the same settlements, so a day is never their sum: the ledger can
 * hold only part of a day and can leave out settlements it did not bill, while
 * the fold sees every stored log and can be short of the sessions whose logs are
 * gone, which the ledger still holds. A day therefore keeps whichever account
 * recorded more tokens on it, takes its session ids from both, and keeps the
 * model split of the account whose tokens it holds. The hour histogram is always
 * the fold's.
 *
 * @param ledgerDays - the ledger's day map, or null when there is no ledger at
 *     all: a null is what tells the caller the answer is the fold's alone. Its
 *     session ids are already spelled as the stored directory names the record
 *     keys a session by.
 * @param sessions - the per-session folds, keyed by the stored directory name.
 */
export function mergeLedgerFold(
  ledgerDays: ReadonlyMap<string, DayBuckets> | null,
  sessions: ReadonlyMap<string, RecordSession>,
): LedgerMerge {
  const foldedDays = mergeSessions(sessions)
  const dates = new Set<string>(ledgerDays?.keys() ?? [])
  for (const date of foldedDays.keys()) dates.add(date)
  const days = new Map<string, DayBuckets>()
  const sessionIds = new Set<string>()
  let folded = false
  for (const date of dates) {
    const ledger = ledgerDays?.get(date)
    const fold = foldedDays.get(date)
    // A day the ledger did not record is the fold's whole day, and so is one it
    // recorded less of: its model split, the sessions that settled on it and its
    // hour histogram, as the fold alone would answer.
    const fromFold = ledger === undefined || (fold !== undefined && bucketTotal(fold) > bucketTotal(ledger))
    const source = fromFold ? fold : ledger
    if (source === undefined) continue
    if (fromFold) folded = true
    // The day's own figures come from one account, so its buckets and their
    // model split stay one coherent account rather than a mix of the two.
    const held: DayBuckets = emptyBuckets()
    addBuckets(held, source, 1)
    if (source.models !== undefined) held.models = source.models
    // The sessions come from both: the ledger's ids are read as the directory
    // names the record holds, so the two accounts name one session once.
    const ids = new Set<string>(ledger?.sessionIds ?? [])
    for (const id of fold?.sessionIds ?? []) ids.add(id)
    const behind = [...ids].sort()
    held.sessionIds = behind
    held.sessions = behind.length
    for (const id of behind) sessionIds.add(id)
    // The ledger keeps no hour of a day, so the histogram is the fold's whether
    // or not the day's tokens came from the ledger.
    const hours = fold?.hours ?? source.hours
    if (hours !== undefined) held.hours = hours
    days.set(date, held)
  }
  return { days, sessionIds, folded }
}
