/**
 * The usage aggregation service the `usage` route reads, and the pass that fills
 * it. The dashboard needs cross-session token totals bucketed by day, which no
 * host service publishes: the `tokenUsage` projection is per session and the
 * session list carries only that session's own totals.
 *
 *   - `usage-ledger.ts` reads the cost-meter plugin's ledger, read-only.
 *   - `usage-fold.ts` finds the session logs and folds them.
 *   - `usage-record.ts` keeps each session's fold, so a deleted session keeps
 *     its days.
 *   - `usage-summary.ts` merges the two accounts by date and shapes the payload.
 *
 * The two accounts are combined, never added: both describe the same days, so a
 * day keeps the account that recorded more of it. The ledger keeps no hour of a
 * day, so that histogram is the fold's on every day. A ledger answer is published
 * before the fold starts, so a ledger the cost meter stopped updating still
 * shows its days at once.
 *
 * A host that publishes cross-session usage totals, or keeps the usage of deleted
 * sessions, retires the matching path here.
 */
import { PACKAGE_NAME } from '@dsh-claude-style/contracts/package'
import { HOME_SESSION_SCOPE_ALL, HOME_SESSION_SCOPE_WORKSPACE } from '@dsh-claude-style/contracts/prefs'
import type { HomeSessionScope } from '@dsh-claude-style/contracts/prefs'
import { join, resolve } from 'node:path'
import type { DshContext } from '@dsh-claude-style/engine/node/dsh'
import { harnessPath } from '@dsh-claude-style/engine/node/harness-home'
import { readRecord, writeRecord } from './usage-record.js'
import type { RecordSession } from './usage-record.js'
import { readEvents } from '@dsh-claude-style/engine/node/session-events'
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
/**
 * How long a finished pass is good for: the panel draws the numbers it reads
 * here, so a reader who has just sent a message should not wait out a cache
 * window to see it.
 */
const USAGE_TTL_MS = 30 * 1000
/** How much longer than its own length a slow pass keeps the next one off. */
const SLOW_PASS_FACTOR = 2

/**
 * The least stretch a pass that took `durationMs` leaves before the next one
 * may start. A pass that outlasts `USAGE_TTL_MS` would otherwise be stale the
 * moment it ended and every request would start the next one, pegging a core on
 * a large history; its own length is the cheapest measure of what the next one
 * costs.
 */
function recheckDelay(durationMs: number): number {
  return Math.max(USAGE_TTL_MS, durationMs * SLOW_PASS_FACTOR)
}

/** One failure's message, for the warning a pass leaves. */
function messageOf(error: unknown): string {
  return String((error as { message?: string } | null)?.message ?? error)
}

/** The hour histogram of a merged day map: its days' histograms, slot by slot. */
function hoursOf(days: ReadonlyMap<string, DayBuckets>): number[] {
  const hours = new Array(24).fill(0) as number[]
  for (const buckets of days.values()) {
    if (buckets.hours === undefined) continue
    for (let hour = 0; hour < 24; hour += 1) hours[hour] += Number(buckets.hours[hour]) || 0
  }
  return hours
}

/**
 * Whether this pass's entries differ from the ones the document holds, which is
 * the whole reason to write it again: a session folded afresh, one the record did
 * not know, one it no longer holds, or one whose log went away.
 */
function recordChanged(stored: ReadonlyMap<string, RecordSession>, sessions: ReadonlyMap<string, RecordSession>, read: number): boolean {
  if (read > 0 || stored.size !== sessions.size) return true
  for (const [id, entry] of sessions) {
    const held = stored.get(id)
    if (held === undefined || held.days.size !== entry.days.size) return true
    if ((held.fingerprint !== undefined) !== (entry.fingerprint !== undefined)) return true
  }
  return false
}

/** The service's state: the last summary, whether more is coming, and why not. */
interface UsageState {
  value: UsageSummary | null
  computing: boolean
  error?: string
}

/** One scope's cache and pass; changing the dashboard's filter never invalidates another scope's answer. */
interface UsageSlot {
  state: UsageState | null
  pending: Promise<UsageSummary | null> | null
  nextAt: number
}

interface SessionPersistence {
  list(): Promise<{ header: { id: string, origin?: string } }[]>
}

interface WorkspaceRegistry {
  readonly archivedSessionIds: readonly string[]
  list(): { id: string, sessionIds: readonly string[] }[]
}

/**
 * Build the usage service.
 *
 * @param ctx - the host plugin context, used for its home path.
 * @returns the service: `snapshot()` reads the current state, `refresh()`
 *   recomputes in the background.
 */
export function createUsage(ctx: DshContext) {
  // The harness home, resolved per read through the one shared accessor.
  const home = () => harnessPath(ctx)

  const slots = new Map<string, UsageSlot>()
  let disposed = false

  function slotFor(scope: HomeSessionScope, workspaceId: string) {
    const key = scope === HOME_SESSION_SCOPE_WORKSPACE ? `${scope}:${workspaceId}` : scope
    let slot = slots.get(key)
    if (slot === undefined) {
      slot = { state: null, pending: null, nextAt: 0 }
      slots.set(key, slot)
    }
    return slot
  }

  /** Fold every session whose log changed since the record was written. */
  async function computeLocal(logs: SessionLog[], ledgerDays: ReadonlyMap<string, DayBuckets> | null, allowed: ReadonlySet<string> | null, scope: HomeSessionScope) {
    const record = readRecord(ctx)
    const sessions = new Map<string, RecordSession>()
    let read = 0
    let failed = 0
    let firstFailure: string | null = null
    for (const log of logs) {
      // The record is keyed by the stored name: it outlives the log, and the
      // name is what the disk still holds once the session is deleted.
      const stored = record.sessions.get(log.storedName)
      const fingerprint = stored?.fingerprint
      if (stored !== undefined && fingerprint !== undefined
        && fingerprint.size === log.size && fingerprint.mtimeMs === log.mtimeMs) {
        sessions.set(log.storedName, stored)
        continue
      }
      // Each changed log is read by its logical id: the host resolves a session
      // through the listing-free observation, and the id is what it knows.
      let events: UsageEvent[] | null
      try {
        events = await readEvents<UsageEvent>(ctx, PACKAGE_NAME, log.id, 'the usage roll-up')
      } catch (error) {
        // One log the host cannot read must not void the pass: the fingerprints
        // landed for every other session make the next pass cheap, and an abort
        // here would fold the whole corpus on every request (D12).
        failed += 1
        firstFailure = firstFailure ?? `${log.id}: ${messageOf(error)}`
        if (stored !== undefined) sessions.set(log.storedName, stored)
        continue
      }
      if (events === null) {
        // The reader refused (no `sessionQuery` service, or a log it cannot
        // parse). Leave the entry as it stands, so the next pass retries this log
        // instead of freezing an empty day map behind a fresh fingerprint.
        failed += 1
        if (stored !== undefined) sessions.set(log.storedName, stored)
        continue
      }
      sessions.set(log.storedName, { fingerprint: { size: log.size, mtimeMs: log.mtimeMs }, days: foldSession(events).days })
      read += 1
    }
    if (firstFailure !== null) {
      ctx.logger?.warn?.(`${PACKAGE_NAME}: ${failed} session log(s) left out of the usage roll-up; the rest are recorded (first: ${firstFailure})`)
    }
    // A session whose log is gone keeps the days the record holds for it: they
    // are the only account of those days left. An entry with no day goes, since
    // nothing compares against it and it holds nothing to keep.
    for (const [id, stored] of record.sessions) {
      if (!sessions.has(id) && stored.days.size > 0) sessions.set(id, { days: stored.days })
    }
    // A pass that outlives its routes writes nothing: the file would belong to
    // a plugin no longer installed.
    const recorded = !disposed && record.writable && (record.mustWrite || recordChanged(record.sessions, sessions, read))
      ? writeRecord(ctx, sessions, new Set(logs.map((log) => log.storedName)))
      : sessions
    // Filtering happens after the full record has been updated, so switching
    // scopes never deletes another session's fingerprint or retained history.
    const account = allowed === null ? recorded : new Map([...recorded].filter(([id]) => allowed.has(id)))
    const scopedLedger = scope === HOME_SESSION_SCOPE_ALL ? ledgerDays : null
    const merge = mergeLedgerFold(scopedLedger, account)
    // The source names what answered: with no ledger at all the fold is the
    // whole account, and saying `cost-meter+local` there would credit a plugin
    // that is not installed.
    const source = scopedLedger === null
      ? LOCAL_SOURCE
      : merge.folded ? `${LEDGER_SOURCE}+${LOCAL_SOURCE}` : LEDGER_SOURCE
    const summary = summarize(
      merge.days,
      merge.sessionIds.size,
      source,
      merge.days.size === 0 ? undefined : hoursOf(merge.days),
      { sessionIds: merge.sessionIds },
    )
    // Active scopes count every main session whose log exists, including one
    // that has not settled usage yet; a date range still unions its own days.
    const shaped = allowed === null ? summary : { ...summary, totals: { ...summary.totals, sessions: allowed.size } }
    const allIds = new Set<string>()
    for (const [id, entry] of recorded) if (entry.days.size > 0) allIds.add(id)
    for (const buckets of ledgerDays?.values() ?? []) for (const id of buckets.sessionIds ?? []) allIds.add(id)
    if (sessions.size === 0 && failed > 0) {
      return { ...shaped, scope, totalSessions: allIds.size, unavailable: true, reason: 'session-query-unavailable' }
    }
    return { ...shaped, scope, totalSessions: allIds.size, read, failed, sessions: logs.length }
  }

  /**
   * @param publish - receives an answer that is already worth serving while the
   *   rest of the pass is still running.
   */
  async function compute(publish: (partial: UsageSummary) => void, scope: HomeSessionScope, workspaceId: string): Promise<UsageSummary> {
    const root = resolve(join(home(), 'sessions'))
    // The walk is the store's own readdir/stat, awaited: listing a large
    // history must not hold the event loop.
    const logs = await listSessionLogs(root)
    const ledgerDays = readLedger(home(), ctx.logger)
    let allowed: Set<string> | null = null
    if (scope !== HOME_SESSION_SCOPE_ALL) {
      const persistence = ctx.get('sessionPersistence') as SessionPersistence | null | undefined
      const stored = persistence === null || persistence === undefined ? [] : await persistence.list()
      const originById = new Map(stored.map((entry) => [entry.header.id, entry.header.origin]))
      const registry = ctx.get('workspaceRegistry') as WorkspaceRegistry | null | undefined
      const archived = new Set(registry?.archivedSessionIds ?? [])
      let selected = logs.filter((log) => log.storedName !== '' && originById.get(log.id) !== 'subagent' && !archived.has(log.id))
      if (scope === HOME_SESSION_SCOPE_WORKSPACE) {
        const workspace = registry?.list().find((entry) => entry.id === workspaceId)
        const members = new Set(workspace?.sessionIds ?? [])
        selected = selected.filter((log) => members.has(log.id))
      }
      allowed = new Set(selected.map((log) => log.storedName))
    }

    if (scope === HOME_SESSION_SCOPE_ALL && ledgerDays !== null && ledgerDays.size > 0) {
      // Only the unfiltered scope may publish the ledger as a partial answer.
      const sessionIds = new Set<string>()
      for (const buckets of ledgerDays.values()) {
        for (const id of buckets.sessionIds ?? []) sessionIds.add(id)
      }
      publish({ ...summarize(ledgerDays, sessionIds.size, LEDGER_SOURCE), scope, totalSessions: sessionIds.size, sessions: logs.length })
    }
    return await computeLocal(logs, ledgerDays, allowed, scope) as UsageSummary
  }

  /**
   * Start a pass unless one is running or the finished one is still inside its
   * stretch, which is the pass's own length when that outlasts the base period
   * (recheckDelay), so a large history cannot fold back to back.
   */
  function refresh(scope: HomeSessionScope = HOME_SESSION_SCOPE_ALL, workspaceId = ''): Promise<UsageSummary | null> {
    const slot = slotFor(scope, workspaceId)
    if (disposed) return Promise.resolve(null)
    if (slot.pending !== null) return slot.pending
    if (slot.state !== null && Date.now() < slot.nextAt) return Promise.resolve(slot.state.value)
    slot.state = slot.state === null ? { value: null, computing: true } : { ...slot.state, computing: true }
    const startedAt = Date.now()
    /** End the pass, and hold the next one off by what this one cost. */
    const finish = () => {
      slot.pending = null
      const finishedAt = Date.now()
      slot.nextAt = finishedAt + recheckDelay(finishedAt - startedAt)
    }
    slot.pending = compute((partial: UsageSummary) => {
      if (!disposed) slot.state = { value: partial, computing: true }
    }, scope, workspaceId).then(
      (value): UsageSummary | null => {
        finish()
        if (disposed) return value
        slot.state = { value, computing: false }
        return value
      },
      (error): UsageSummary | null => {
        finish()
        if (!disposed) slot.state = { value: slot.state?.value ?? null, computing: false, error: messageOf(error) }
        return null
      },
    )
    return slot.pending ?? Promise.resolve(null)
  }

  return {
    /** The current state for one scope: a value, a computing flag, and the last error if any. */
    snapshot(scope: HomeSessionScope = HOME_SESSION_SCOPE_ALL, workspaceId = '') {
      const state = slotFor(scope, workspaceId).state
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
