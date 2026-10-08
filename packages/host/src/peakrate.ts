/**
 * The peak / off-peak catalog: which billing clock applies to which model, and
 * what the browser half needs to judge it (D54).
 *
 * The data source is a published catalog document (offpeakclock.com) rather
 * than an API: no provider exposes "is this peak right now" over HTTP, so the
 * schedules are published as JSON and judged against the clock on the client.
 * The host half keeps that document fresh and hands it to the browser over its
 * own route — the browser never talks to the third party itself, so there is
 * one fetch per host rather than one per page load, and a copy survives on
 * disk across restarts.
 *
 * Reading order: a disk cache that is not older than the copy shipped in the
 * package, else that shipped copy. The shipped copy is what makes the meter
 * work on a machine that has never reached the source, and a copy newer than
 * the cache (a plugin upgrade) wins over a stale download.
 */
import { existsSync, mkdirSync, readFileSync, renameSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import type { PeakCatalog, RateProfile } from '@dsh-claude-style/contracts/peakrate'
import type { DshContext } from './dsh.js'
import { harnessPath } from './harness-home.js'
import { packageRoot } from './package-root.js'
import { parseCatalog } from './peakrate-catalog.js'

/** The catalog document the build copies beside the bundle (scripts/build.mjs). */
export const PEAKRATE_CATALOG_FILE = 'peakrate-catalog.json'

/** Where the catalog is published. */
export const PEAKRATE_CATALOG_URL = 'https://offpeakclock.com/pricing.json'

/** How long a fetched catalog counts as current. */
export const PEAKRATE_REFRESH_MS = 24 * 60 * 60 * 1000

/** A source that accepts the connection and then says nothing is not worth the wait. */
const FETCH_TIMEOUT_MS = 10_000

/** What the route answers. */
export interface PeakRatePayload {
  profiles: RateProfile[]
  updatedAt?: string
  /** When this host last fetched the source, as an instant; absent when it never has. */
  fetchedAt?: string
  /** `remote` for a document this run fetched, `bundled` for the cache or the shipped copy. */
  origin: 'remote' | 'bundled'
}

/** What the store hands the route. */
export interface PeakRateStore {
  /** Load the shipped copy and the cache on first call, and start the refresh timer. */
  ensure(): void
  /** Fetch the source once; `true` when the answer replaced the current catalog. */
  refresh(): Promise<boolean>
  /** The catalog as the browser half reads it. */
  payload(): PeakRatePayload
  dispose(): void
}

/** The cache document: the catalog and when it was fetched, so a restart keeps the date. */
interface CacheDocument {
  fetchedAt?: unknown
  document?: unknown
}

/**
 * One stored document, or undefined when there is none or it does not parse.
 *
 * The store's two files only ever save a fetch: a copy that cannot be read is
 * reported and the other one stands (docs/decisions D54).
 *
 * @param path - the file to read.
 * @param label - what the file is, for the warning.
 * @param log - the host half's warning channel.
 */
function readDocument(path: string, label: string, log: (message: string) => void): unknown {
  if (!existsSync(path)) return undefined
  try {
    return JSON.parse(readFileSync(path, 'utf8'))
  } catch (error) {
    log(`dsh-claude-style: ${label} unreadable (${(error as { message?: string }).message})`)
    return undefined
  }
}

/**
 * The catalog store behind the plugin's route.
 *
 * @param ctx - host plugin context, for the warning a failed fetch leaves.
 * @returns the store; `ensure()` is the only entry point that touches the disk.
 */
export function createPeakRate(ctx: DshContext): PeakRateStore {
  const snapshotFile = join(packageRoot(), 'lib', PEAKRATE_CATALOG_FILE)
  const cacheFile = join(harnessPath(ctx, 'cache', 'dsh-claude-style'), 'peakrate.json')

  let catalog: PeakCatalog | undefined
  let origin: 'remote' | 'bundled' = 'bundled'
  let fetchedAt = 0
  let loaded = false
  let timer: ReturnType<typeof setInterval> | undefined
  const warn = (message: string) => ctx.logger?.warn?.(message)

  /** The copy shipped in the package, which is what a machine with no reach has to judge by. */
  function shippedCatalog(): PeakCatalog | undefined {
    const parsed = parseCatalog(readDocument(snapshotFile, `lib/${PEAKRATE_CATALOG_FILE}`, warn))
    if (parsed === null) {
      // The shipped copy is produced from the source at release time; one that
      // no longer parses means the build shipped the wrong document.
      warn(`dsh-claude-style: lib/${PEAKRATE_CATALOG_FILE} is not a catalog this build understands`)
      return undefined
    }
    return parsed
  }

  /**
   * The disk cache, when it is at least as new as the shipped copy.
   */
  function cachedCatalog(shipped: PeakCatalog | undefined): { catalog: PeakCatalog, fetchedAt: number } | undefined {
    const value = readDocument(cacheFile, 'peak rate cache', warn)
    if (value === null || typeof value !== 'object') return undefined
    const stored = value as CacheDocument
    const parsed = parseCatalog(stored.document)
    if (parsed === null) return undefined
    // A plugin upgrade carries a newer shipped copy; a cache older than it
    // would otherwise keep serving the schedules of the previous release.
    if (shipped !== undefined && isOlder(parsed, shipped)) return undefined
    return { catalog: parsed, fetchedAt: typeof stored.fetchedAt === 'number' ? stored.fetchedAt : 0 }
  }

  /**
   * Whether the cache is older than the shipped copy: by the documents' own
   * `updatedAt` when both carry one, else by the files' modification times.
   */
  function isOlder(cached: PeakCatalog, shipped: PeakCatalog): boolean {
    if (cached.updatedAt !== undefined && shipped.updatedAt !== undefined) return cached.updatedAt < shipped.updatedAt
    return statSync(cacheFile).mtimeMs < statSync(snapshotFile).mtimeMs
  }

  /** Load the shipped copy and the cache once. */
  function load(): void {
    if (loaded) return
    loaded = true
    const shipped = shippedCatalog()
    const cached = cachedCatalog(shipped)
    if (cached !== undefined) {
      catalog = cached.catalog
      fetchedAt = cached.fetchedAt
      return
    }
    catalog = shipped
  }

  /** Fetch the source once and adopt the answer. */
  async function refresh(): Promise<boolean> {
    let raw: unknown
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
      try {
        const response = await fetch(PEAKRATE_CATALOG_URL, { signal: controller.signal })
        if (!response.ok) {
          warn(`dsh-claude-style: peak rate source answered ${response.status}; keeping the current catalog`)
          return false
        }
        raw = await response.json()
      } finally {
        clearTimeout(timeout)
      }
    } catch (error) {
      // A source that cannot be reached is not a fault here: the meter keeps
      // judging by the catalog already held (docs/decisions D54).
      warn(`dsh-claude-style: peak rate source unreachable, keeping the current catalog: ${(error as { message?: string }).message}`)
      return false
    }
    const parsed = parseCatalog(raw)
    if (parsed === null) {
      warn('dsh-claude-style: peak rate source answered a document this build does not understand; keeping the current catalog')
      return false
    }
    catalog = parsed
    origin = 'remote'
    fetchedAt = Date.now()
    writeCache()
    return true
  }

  /** Store the fetched document, so a restart does not have to reach the source again. */
  function writeCache(): void {
    const stored: CacheDocument = { fetchedAt, document: catalog }
    const temporary = `${cacheFile}.${process.pid}.tmp`
    try {
      mkdirSync(dirname(cacheFile), { recursive: true })
      writeFileSync(temporary, JSON.stringify(stored), 'utf8')
      renameSync(temporary, cacheFile)
    } catch (error) {
      // The cache only saves a fetch: a write that fails is reported and the
      // catalog this run holds is still served (docs/decisions D54).
      warn(`dsh-claude-style: peak rate cache not written: ${(error as { message?: string }).message}`)
    }
  }

  /** Keep a long-running host current: the timer starts with the first request. */
  function ensure(): void {
    load()
    if (timer !== undefined) return
    timer = setInterval(() => { void refresh() }, PEAKRATE_REFRESH_MS)
    timer.unref?.()
  }

  function payload(): PeakRatePayload {
    const profiles = catalog?.profiles ?? []
    return {
      profiles,
      ...(catalog?.updatedAt === undefined ? {} : { updatedAt: catalog.updatedAt }),
      ...(fetchedAt === 0 ? {} : { fetchedAt: new Date(fetchedAt).toISOString() }),
      origin,
    }
  }

  return {
    ensure,
    refresh,
    payload,
    dispose() {
      if (timer !== undefined) {
        clearInterval(timer)
        timer = undefined
      }
    },
  }
}
