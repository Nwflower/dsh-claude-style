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
 *     declares the bucket shapes. Its days are the whole history the cost meter
 *     saw, every provider included.
 *   - `usage-fold.ts` finds the session logs and folds them, which is what covers
 *     the dates past the ledger's newest day.
 *   - `usage-cache.ts` keeps each session's fold between passes.
 *   - `usage-summary.ts` merges the two accounts by date, and shapes the payload.
 *
 * The two accounts are combined, never added: a day the ledger knows stays the
 * ledger's, and the fold answers for the days it does not cover (D53).
 */
import { join, resolve } from 'node:path'
import type { DshContext } from './dsh.js'
import { harnessPath } from './harness-home.js'
import { readCache, writeCache } from './usage-cache.js'
import type { CacheSession } from './usage-cache.js'
import { readEvents } from './session-events.js'
import { foldSession, listSessionLogs } from './usage-fold.js'
import type { SessionLog, UsageEvent } from './usage-fold.js'
import { readLedger } from './usage-ledger.js'
import type { DayBuckets } from './usage-ledger.js'
import { mergeLedgerFold, summarize } from './usage-summary.js'
import type { UsageSummary } from './usage-summary.js'

/** The `source` field of an answer that came from the cost meter's ledger. */
const LEDGER_SOURCE = 'cost-meter'
/** The `source` field of an answer our own fold over the session logs produced. */
const LOCAL_SOURCE = 'local'
/** An empty hour histogram, for a session list with nothing to fold. */
const NO_HOURS = new Array(24).fill(0) as number[]

/** The hour histogram of a merged day map: its days' histograms, slot by slot. */
function hoursOf(days: ReadonlyMap<string, DayBuckets>): number[] {
  const hours = new Array(24).fill(0) as number[]
  for (const buckets of days.values()) {
    if (buckets.hours === undefined) continue
    for (let hour = 0; hour < 24; hour += 1) hours[hour] += Number(buckets.hours[hour]) || 0
  }
  return hours
}

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
  async function computeLocal(logs: SessionLog[], ledgerDays: ReadonlyMap<string, DayBuckets>) {
    const cache = readCache(ctx)
    const sessions = new Map<string, CacheSession>()
    let read = 0
    let failed = 0
    for (const log of logs) {
      const cached = cache.get(log.id)
      if (cached !== undefined && cached.size === log.size && cached.mtimeMs === log.mtimeMs) {
        sessions.set(log.id, cached)
        continue
      }
      const events = await readEvents<UsageEvent>(ctx, log.id, 'the usage roll-up')
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
    writeCache(ctx, sessions)
    const merge = mergeLedgerFold(ledgerDays, sessions, logs)
    const summary = summarize(
      merge.days,
      merge.sessionIds.size,
      merge.folded ? `${LEDGER_SOURCE}+${LOCAL_SOURCE}` : LEDGER_SOURCE,
      merge.days.size === 0 ? undefined : hoursOf(merge.days),
      { sessionIds: merge.sessionIds },
    )
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

    if (logs.length === 0) return summarize(new Map(), 0, LOCAL_SOURCE, NO_HOURS)
    if (ledgerDays !== null && ledgerDays.size > 0) {
      // The ledger is the wider account: it saw every provider and it outlives
      // the logs. Hand its own answer over before the fold runs, so a stale
      // ledger shows the whole history at once and the uncovered days land a
      // moment later.
      const sessionIds = new Set<string>()
      for (const buckets of ledgerDays.values()) {
        for (const id of buckets.sessionIds ?? []) sessionIds.add(id)
      }
      publish({ ...summarize(ledgerDays, sessionIds.size, LEDGER_SOURCE), sessions: logs.length })
    }
    return await computeLocal(logs, ledgerDays ?? new Map()) as UsageSummary
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
