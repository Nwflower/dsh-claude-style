/**
 * Merging the per-session folds into one day map, and shaping the payload the
 * `usage` route answers with.
 *
 * The merge keeps the ids behind each day, because the dashboard unions session
 * ids over an arbitrary range window instead of summing per-day counts (a session
 * spanning two days is one session). The payload's `hours` arrays are the one
 * figure the fold alone can supply; the ledger has no hour dimension.
 */
import { BUCKET_KEYS, addBuckets, emptyBuckets } from './usage-ledger.js'
import type { Buckets, DayBuckets } from './usage-ledger.js'
import type { CacheSession } from './usage-cache.js'

/** What the service reads out: the summarized days, models and totals, or null before the first read. */
export interface UsageSummary {
  source: string
  /** Set when the figures could not be read at all this pass. */
  unavailable?: boolean
  /** Set when only part of the sessions could be folded. */
  read?: boolean
  computedAt: number
  days: Record<string, unknown>[]
  models: Record<string, unknown>[]
  firstDay: string | null
  lastDay: string | null
  hours?: number[]
  totals: Record<string, unknown>
}

/** The four disjoint buckets of one day or one model, summed. */
function bucketTotal(buckets: Partial<Buckets> | null | undefined): number {
  let total = 0
  for (const key of BUCKET_KEYS) total += Number(buckets?.[key]) || 0
  return total
}

/** Sum the per-session day maps into one, tracking distinct sessions per day. */
export function mergeSessions(sessions: Map<string, CacheSession>): { days: Map<string, DayBuckets>, sessionCount: number, hours: number[] } {
  const days = new Map<string, DayBuckets>()
  const hours = new Array(24).fill(0) as number[]
  const seen = new Set<string>()
  for (const [id, entry] of sessions) {
    seen.add(id)
    if (Array.isArray(entry.hours)) {
      for (let hour = 0; hour < 24; hour += 1) hours[hour] += Number(entry.hours[hour]) || 0
    }
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
  return { days, sessionCount: seen.size, hours }
}

export function summarize(days: Map<string, DayBuckets>, sessionCount: number, source: string, hours?: number[]): UsageSummary {
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
  for (const buckets of days.values()) {
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
      sessions: sessionCount,
      activeDays: list.length,
    },
  }
}
