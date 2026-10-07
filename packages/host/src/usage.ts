/**
 * The usage aggregation service the `usage` route reads, and the pass that fills
 * it.
 *
 * The dashboard needs cross-session token totals bucketed by day, which no host
 * service publishes: the `tokenUsage` projection is per session and the session
 * list carries only that session's own totals. This module owns the pass and the
 * state; the four parts below own the sources and the shapes:
 *
 *   - `usage-ledger.ts` reads the cost-meter plugin's ledger, read-only, and
 *     declares the bucket shapes. It answers alone when it covers the newest
 *     session activity, except for the hour histograms it has no dimension for.
 *   - `usage-fold.ts` finds the session logs and folds the ones the ledger could
 *     not answer for.
 *   - `usage-cache.ts` keeps each session's fold between passes.
 *   - `usage-summary.ts` merges the folds and shapes the payload.
 */
import { join, resolve } from 'node:path'
import type { DshContext } from './dsh.js'
import { harnessPath } from './harness-home.js'
import { readCache, writeCache } from './usage-cache.js'
import type { CacheSession } from './usage-cache.js'
import { dayKey, foldSession, listSessionLogs, readEvents } from './usage-fold.js'
import type { SessionLog } from './usage-fold.js'
import { readLedger } from './usage-ledger.js'
import { mergeSessions, summarize } from './usage-summary.js'
import type { UsageSummary } from './usage-summary.js'

/** The service's state: the last summary, whether more is coming, and why not. */
interface UsageState {
  value: UsageSummary | null
  computing: boolean
  error?: string
}

/**
 * Build the usage service.
 *
 * @param ctx - the host plugin context, used for its home path and the
 *   `sessionQuery` service.
 * @returns the service: `snapshot()` reads the current state, `refresh()`
 *   recomputes in the background.
 */
export function createUsage(ctx: DshContext) {
  // The harness home, resolved per read through the one shared accessor.
  const home = () => harnessPath(ctx)

  let state: UsageState | null = null
  let pending: Promise<UsageSummary | null> | null = null
  let disposed = false

  /** Fold every session whose log changed since the cache was written. */
  async function computeLocal(logs: SessionLog[]) {
    const cache = readCache(ctx, home())
    const sessions = new Map<string, CacheSession>()
    let read = 0
    let failed = 0
    for (const log of logs) {
      const cached = cache.get(log.id)
      if (cached !== undefined && cached.size === log.size && cached.mtimeMs === log.mtimeMs) {
        sessions.set(log.id, cached)
        continue
      }
      const events = await readEvents(ctx, log.id)
      if (events === null) {
        // The reader refused (no `sessionQuery` service, or a log it cannot
        // parse). Leave the session out of the cache so the next pass retries it
        // instead of freezing an empty day map behind a fresh fingerprint.
        failed += 1
        if (cached !== undefined) sessions.set(log.id, cached)
        continue
      }
      const folded = foldSession(events)
      sessions.set(log.id, { size: log.size, mtimeMs: log.mtimeMs, days: folded.days, hours: folded.hours })
      read += 1
    }
    writeCache(ctx, home(), sessions)
    const merged = mergeSessions(sessions)
    const summary = summarize(merged.days, merged.sessionCount, 'local', merged.hours)
    if (sessions.size === 0 && failed > 0) {
      return { ...summary, unavailable: true, reason: 'session-query-unavailable' }
    }
    return { ...summary, read, failed, sessions: logs.length }
  }

  /**
   * @param publish - receives an answer that is already worth serving while the
   *   rest of the pass is still running.
   */
  async function compute(publish: (partial: UsageSummary) => void): Promise<UsageSummary> {
    const root = resolve(join(home(), 'sessions'))
    const logs = listSessionLogs(root)
    const ledgerDays = readLedger(home())

    if (ledgerDays !== null) {
      // The shared cache answers for every day it covers; our own fold runs only
      // when session activity reaches past its newest day.
      const ledgerLast = [...ledgerDays.keys()].sort().at(-1) ?? ''
      const activityLast = logs.reduce((newest, log) => {
        const day = dayKey(log.mtimeMs)
        return day !== null && day > newest ? day : newest
      }, '')
      if (activityLast === '' || activityLast <= ledgerLast) {
        const sessionIds = new Set<string>()
        for (const buckets of ledgerDays.values()) {
          for (const id of buckets.sessionIds ?? []) sessionIds.add(id)
        }
        const ledgerValue = { ...summarize(ledgerDays, sessionIds.size, 'cost-meter'), sessions: logs.length }
        if (logs.length === 0) return ledgerValue
        // The ledger has no hour dimension. It answers at once, and the fold
        // then supplies the hour histograms — whole and per day — from the
        // sessions whose logs remain; every other figure stays the ledger's.
        publish(ledgerValue)
        const local = await computeLocal(logs)
        if (local.unavailable === true) return ledgerValue
        const localHours = new Map(local.days.map((day) => [day.date, day.hours]))
        return {
          ...ledgerValue,
          hours: local.hours,
          days: ledgerValue.days.map((day) => (localHours.has(day.date) ? { ...day, hours: localHours.get(day.date) } : day)),
        }
      }
    }
    if (logs.length === 0) return summarize(new Map(), 0, 'local', new Array(24).fill(0))
    return await computeLocal(logs) as UsageSummary
  }

  function refresh(): Promise<UsageSummary | null> {
    if (disposed) return Promise.resolve(null)
    if (pending !== null) return pending
    state = state === null ? { value: null, computing: true } : { ...state, computing: true }
    pending = compute((partial: UsageSummary) => {
      if (!disposed) state = { value: partial, computing: true }
    }).then(
      (value): UsageSummary | null => {
        pending = null
        if (disposed) return value
        state = { value, computing: false }
        return value
      },
      (error): UsageSummary | null => {
        pending = null
        if (!disposed) state = { value: state?.value ?? null, computing: false, error: String((error as { message?: string } | null)?.message ?? error) }
        return null
      },
    )
    return pending ?? Promise.resolve(null)
  }

  return {
    /** The current state: a value, a computing flag, and the last error if any. */
    snapshot() {
      return state === null
        ? { ok: true, value: null, computing: false }
        : { ok: true, value: state.value, computing: state.computing === true, error: state.error }
    },
    refresh,
    dispose() {
      disposed = true
    },
  }
}
