/**
 * Our own fold cache, under `$DSH_HOME/cache/dsh-claude-style/usage.json`.
 *
 * One entry per session: the fingerprint of the log it was folded from, that
 * session's day map and its hour histogram. Keying by the log's size and
 * modification time makes a warm start one directory walk plus one stat per
 * session and re-reads only the logs that changed.
 *
 * The version below is the reader's whole contract: a document written by another
 * version is discarded and every session folded again. The cache only saves work,
 * so a file that does not parse and a write that fails are reported and the pass
 * still answers (docs/decisions D12).
 */
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import type { DshContext } from './dsh.js'
import { addBuckets, emptyBuckets } from './usage-ledger.js'
import type { Buckets, DayBuckets } from './usage-ledger.js'

/** Our own cache document version. */
const CACHE_VERSION = 4

/** One stored session in the cache document. */
export interface CacheSession {
  size: number
  mtimeMs: number
  days: Map<string, DayBuckets>
  hours: number[]
}

/** The cache document: the sessions it knows and the fingerprints it read them at. */
interface CacheDocument {
  version?: number
  sessions?: Record<string, { size?: number, mtimeMs?: number, days?: Record<string, Partial<Buckets> & { hours?: number[] }>, hours?: number[] }>
}

/** The cache document's path under the harness home. */
function cacheFile(home: string) {
  return join(home, 'cache', 'dsh-claude-style', 'usage.json')
}

/** A stored 24-slot hour histogram, or an empty one when the entry has none. */
function hoursFrom(raw: unknown): number[] {
  return Array.isArray(raw) && raw.length === 24
    ? raw.map((value) => (Number.isFinite(Number(value)) ? Number(value) : 0))
    : new Array(24).fill(0)
}

/** A bucket map as a plain object, for the cache document. */
function daysToObject(days: Map<string, DayBuckets>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [day, buckets] of days) {
    const entry: Record<string, unknown> = { ...buckets, models: undefined, sessions: undefined }
    const cells: Record<string, Buckets> = {}
    if (buckets.models !== undefined) {
      for (const [model, cell] of buckets.models) cells[model] = cell
      entry.models = cells
    }
    out[day] = entry
  }
  return out
}

function daysFromObject(raw: unknown): Map<string, DayBuckets> {
  const days = new Map<string, DayBuckets>()
  if (raw === null || typeof raw !== 'object') return days
  for (const [day, buckets] of Object.entries(raw)) {
    if (buckets === null || typeof buckets !== 'object') continue
    const stored = buckets as { hours?: unknown, models?: unknown } & Partial<Buckets>
    const clean: DayBuckets = emptyBuckets()
    addBuckets(clean, stored, 1)
    clean.hours = hoursFrom(stored.hours)
    if (stored.models !== null && typeof stored.models === 'object') {
      const models = new Map<string, Buckets>()
      for (const [model, cell] of Object.entries(stored.models as Record<string, unknown>)) {
        if (cell === null || typeof cell !== 'object') continue
        const into = emptyBuckets()
        addBuckets(into, cell as Partial<Buckets>, 1)
        models.set(model, into)
      }
      clean.models = models
    }
    days.set(day, clean)
  }
  return days
}

/**
 * The cached sessions by session id: empty when there is no cache, when the
 * document is not the version read here, or when it does not parse at all.
 *
 * @param ctx - host plugin context, for the warning an unreadable file leaves.
 * @param home - the harness home.
 */
export function readCache(ctx: DshContext, home: string): Map<string, CacheSession> {
  const file = cacheFile(home)
  if (!existsSync(file)) return new Map()
  let parsed: unknown
  try {
    parsed = JSON.parse(readFileSync(file, 'utf8'))
  } catch (error) {
    // The cache only saves work: a file that does not parse is reported, the
    // pass folds every session again and writes a whole new file over it
    // (docs/decisions D12).
    ctx.logger?.warn?.(`dsh-claude-style: usage cache unreadable, folding again: ${(error as { message?: string }).message}`)
    return new Map()
  }
  if (parsed === null || typeof parsed !== 'object') return new Map()
  const document = parsed as { version?: unknown, sessions?: unknown }
  if (document.version !== CACHE_VERSION) return new Map()
  const sessions = new Map<string, CacheSession>()
  const rawSessions = document.sessions
  if (rawSessions === null || typeof rawSessions !== 'object') return sessions
  for (const [id, value] of Object.entries(rawSessions as Record<string, unknown>)) {
    if (value === null || typeof value !== 'object') continue
    const entry = value as { size?: unknown, mtimeMs?: unknown, days?: unknown, hours?: unknown }
    if (!Number.isFinite(entry.size) || !Number.isFinite(entry.mtimeMs)) continue
    sessions.set(id, {
      size: Number(entry.size),
      mtimeMs: Number(entry.mtimeMs),
      days: daysFromObject(entry.days),
      hours: hoursFrom(entry.hours),
    })
  }
  return sessions
}

/**
 * Replace the whole cache document through a temporary file, so a reader never
 * sees half of it.
 *
 * @param ctx - host plugin context, for the warning a failed write leaves.
 * @param home - the harness home.
 * @param sessions - the sessions this pass ended up with.
 */
export function writeCache(ctx: DshContext, home: string, sessions: Map<string, CacheSession>) {
  const document: { version: number, computedAt: number, sessions: Record<string, unknown> } = { version: CACHE_VERSION, computedAt: Date.now(), sessions: {} }
  for (const [id, entry] of sessions) {
    document.sessions[id] = { size: entry.size, mtimeMs: entry.mtimeMs, days: daysToObject(entry.days), hours: entry.hours }
  }
  const path = cacheFile(home)
  const temp = `${path}.${process.pid}.tmp`
  try {
    mkdirSync(dirname(path), { recursive: true })
    writeFileSync(temp, JSON.stringify(document), 'utf8')
    renameSync(temp, path)
  } catch (error) {
    // The cache only saves work: a write that fails is reported, and the
    // roll-up this pass computed is still served (docs/decisions D12).
    ctx.logger?.warn?.(`dsh-claude-style: usage cache not written: ${(error as { message?: string }).message}`)
  }
}
