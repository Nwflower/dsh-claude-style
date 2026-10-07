/**
 * The cost-meter plugin's ledger: the cheapest source of cross-session usage.
 *
 * `$DSH_HOME/storages/cost-meter/ledger.json` is another plugin's document and is
 * read ONLY. Its `days` map is already a per-day token roll-up, and each day's
 * `byProviderModel` splits it by `<provider>:<model>` — so when it exists and
 * covers the newest session activity there is nothing left to compute. It also
 * outlives the logs: a deleted session's tokens stay in it. It has no hour
 * dimension, so the fold still runs behind a ledger answer for the hour
 * histograms alone. The file is never written: its owner rebuilds the whole
 * document from a fixed field list and rewrites it under a cross-process lock, so
 * a foreign key would be dropped by their next flush, a write outside their lock
 * could lose theirs, and a version they do not recognise makes them quarantine
 * the file (`ledger.json.corrupt-<stamp>`) and start empty.
 *
 * The bucket shapes below are the ones the ledger, the cache and the fold all
 * speak: none of those documents ships types, so the members this reader touches
 * are declared here.
 */
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

/** The ledger's document version this reader understands; anything else is ignored. */
const LEDGER_VERSION = 1
/** Buckets are disjoint; reasoning tokens ride inside output. */
export const BUCKET_KEYS: (keyof Buckets)[] = ['input', 'output', 'cacheRead', 'cacheWrite']

/** The four disjoint buckets of one day, model or window, plus its settled calls. */
export interface Buckets {
  input: number
  output: number
  cacheRead: number
  cacheWrite: number
  calls: number
}

/** One day's buckets, with the sessions behind it and, when known, the hours and models. */
export interface DayBuckets extends Buckets {
  sessions?: Set<string> | number
  sessionIds?: string[]
  hours?: number[]
  models?: Map<string, Buckets>
}

/** The ledger document the cost meter writes. */
interface LedgerDocument {
  version?: number
  days?: Record<string, Buckets>
  models?: Record<string, Buckets>
  computedAt?: number
  source?: string
}

export function emptyBuckets(): Buckets {
  return { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, calls: 0 }
}

export function addBuckets(target: Buckets, buckets: Partial<Buckets> | null | undefined, sign: number) {
  if (buckets === null || buckets === undefined) return
  for (const key of BUCKET_KEYS) {
    const value = Number(buckets?.[key])
    if (Number.isFinite(value) && value !== 0) target[key] += sign * value
  }
  target.calls += sign * (Number.isFinite(Number(buckets?.calls)) ? Number(buckets.calls) : 0)
}

/**
 * The ledger's day map, or null when it cannot answer: the cost meter is not
 * installed, its file is mid-write, or its version is not the one read here.
 *
 * @param home - the harness home, resolved by the caller through the shared
 *   accessor.
 */
export function readLedger(home: string): Map<string, DayBuckets> | null {
  // The cost meter is another plugin: no ledger means it is not installed.
  const file = join(home, 'storages', 'cost-meter', 'ledger.json')
  if (!existsSync(file)) return null
  const raw = readFileSync(file, 'utf8')
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    // Another plugin's file, read without any coordination with its writer:
    // a write in progress reads as no ledger, and the local fold answers
    // (docs/decisions D12).
    return null
  }
  if (parsed === null || typeof parsed !== 'object') return null
  const ledger = parsed as { version?: unknown, days?: unknown }
  if (ledger.version !== LEDGER_VERSION) return null
  const rawDays = ledger.days
  if (rawDays === null || typeof rawDays !== 'object' || Array.isArray(rawDays)) return null
  const days = new Map<string, DayBuckets>()
  for (const [day, value] of Object.entries(rawDays as Record<string, unknown>)) {
    if (value === null || typeof value !== 'object') continue
    const bucket = value as Partial<Buckets> & { sessions?: unknown, byProviderModel?: unknown }
    const clean: DayBuckets = emptyBuckets()
    addBuckets(clean, {
      input: bucket.input,
      output: bucket.output,
      cacheRead: bucket.cacheRead,
      cacheWrite: bucket.cacheWrite,
      calls: bucket.calls,
    }, 1)
    // The ledger keeps one record per session per day; the ids are what make
    // the total session count a union rather than a sum.
    clean.sessionIds = Array.isArray(bucket.sessions)
      ? (bucket.sessions as unknown[])
        .map((entry) => (entry !== null && typeof entry === 'object' && typeof (entry as { id?: unknown }).id === 'string' ? (entry as { id: string }).id : null))
        .filter((id): id is string => id !== null)
      : []
    clean.sessions = clean.sessionIds.length
    // The day's split by `<provider>:<model>`, the owner's own key (it splits
    // at the first colon too). The dashboard ranks models, so one model served
    // by two providers is one cell.
    const byProviderModel = bucket.byProviderModel
    if (byProviderModel !== null && typeof byProviderModel === 'object' && !Array.isArray(byProviderModel)) {
      for (const [key, entry] of Object.entries(byProviderModel)) {
        if (entry === null || typeof entry !== 'object') continue
        const model = key.slice(key.indexOf(':') + 1)
        if (model === '') continue
        if (clean.models === undefined) clean.models = new Map()
        let cell = clean.models.get(model)
        if (cell === undefined) {
          cell = emptyBuckets()
          clean.models.set(model, cell)
        }
        addBuckets(cell, entry as Partial<Buckets>, 1)
      }
    }
    days.set(day, clean)
  }
  if (days.size === 0) return null
  return days
}
