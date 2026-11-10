/**
 * The peak / off-peak catalog: which billing clock applies to which model, and
 * what the browser half needs to judge it.
 *
 * The data source is a published JSON catalog rather than an API, because no
 * provider exposes "is this peak right now" over HTTP, so the schedules are
 * judged against the clock on the client. The host half keeps that document fresh
 * and hands it over its own route: the browser never talks to the third party
 * itself, so there is one fetch per host rather than one per page load, and a
 * copy survives on disk across restarts.
 *
 * Reading order: a disk cache that is not older than the copy shipped in the
 * package, else that shipped copy. The shipped copy is what makes the meter work
 * on a machine that has never reached the source, and a copy newer than the cache
 * (a plugin upgrade) wins over a stale download.
 */
import { PACKAGE_NAME } from '@dsh-claude-style/contracts/package'
import { statSync } from 'node:fs'
import { join } from 'node:path'
import type { PeakCatalog, RateProfile } from '@dsh-claude-style/contracts/peakrate'
import type { DshContext } from '@dsh-claude-style/engine/node/dsh'
import { cachePath, readJsonDocument, writeJsonDocument } from './cache-file.js'
import { packageRoot } from './package-root.js'
import { parseCatalog } from './peakrate-catalog.js'

/** The catalog document the build copies beside the bundle (scripts/build/build.mjs). */
export const PEAKRATE_CATALOG_FILE = 'peakrate-catalog.json'

/**
 * Where the catalog is published: the repository's copy first, the raw file
 * second. `.github/workflows/data.yml` refreshes that copy from the upstream source
 * once a day, so every install downloads a validated file.
 */
export const PEAKRATE_CATALOG_URLS = [
  'https://cdn.jsdelivr.net/gh/Nwflower/dsh-claude-style@master/packages/host/data/peakrate-catalog.json',
  'https://raw.githubusercontent.com/Nwflower/dsh-claude-style/master/packages/host/data/peakrate-catalog.json',
]

/** How long a fetched catalog counts as current. */
export const PEAKRATE_REFRESH_MS = 24 * 60 * 60 * 1000

/**
 * How long after the last request the timer stands down: the page that asked is
 * gone, and a host nobody is reading does not keep reaching the source. The
 * browser half asks at least once a day while the meter is on, so only a host
 * whose reader left goes idle.
 */
export const PEAKRATE_IDLE_MS = 48 * 60 * 60 * 1000

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
 * The catalog store behind the plugin's route.
 *
 * @param ctx - host plugin context, for the cache path and the warning a failed
 *              fetch leaves.
 * @returns the store; `ensure()` is the only entry point that touches the disk.
 */
export function createPeakRate(ctx: DshContext): PeakRateStore {
  const snapshotFile = join(packageRoot(), 'lib', PEAKRATE_CATALOG_FILE)
  const cacheFile = cachePath(ctx, 'peakrate.json')

  let catalog: PeakCatalog | undefined
  let origin: 'remote' | 'bundled' = 'bundled'
  let fetchedAt = 0
  let loaded = false
  let timer: ReturnType<typeof setInterval> | undefined
  /**
   * The source read in flight, so a disposal can stop it: the answer would
   * otherwise land after the routes are gone and write the cache file.
   */
  let inFlight: AbortController | null = null
  /** Set by dispose: a source answer that lands afterwards must not write the cache. */
  let disposed = false
  /** When the route last asked: what tells a reader-driven timer from an idle one. */
  let lastAskedAt = 0
  const warn = (message: string) => ctx.logger?.warn?.(message)

  /** The copy shipped in the package, which is what a machine with no reach has to judge by. */
  function shippedCatalog(): PeakCatalog | undefined {
    const parsed = parseCatalog(readJsonDocument(ctx, snapshotFile, `lib/${PEAKRATE_CATALOG_FILE}`))
    if (parsed === null) {
      // The shipped copy is produced from the source at release time; one that
      // no longer parses means the build shipped the wrong document.
      warn(`${PACKAGE_NAME}: lib/${PEAKRATE_CATALOG_FILE} is not a catalog this build understands`)
      return undefined
    }
    return parsed
  }

  /**
   * The disk cache, when it is at least as new as the shipped copy.
   */
  function cachedCatalog(shipped: PeakCatalog | undefined): { catalog: PeakCatalog, fetchedAt: number } | undefined {
    const value = readJsonDocument(ctx, cacheFile, 'peak rate cache')
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

  /** Fetch the repository's copy once and adopt the answer. */
  async function refresh(): Promise<boolean> {
    let raw: unknown
    for (const url of PEAKRATE_CATALOG_URLS) {
      // Disposed while the previous source was being asked: nothing below runs
      // on behalf of a plugin that is gone.
      if (disposed) return false
      try {
        const controller = new AbortController()
        inFlight = controller
        const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
        try {
          const response = await fetch(url, { signal: controller.signal })
          if (!response.ok) {
            warn(`${PACKAGE_NAME}: peak rate source ${url} answered ${response.status}`)
            raw = undefined
            continue
          }
          raw = await response.json()
        } finally {
          clearTimeout(timeout)
          if (inFlight === controller) inFlight = null
        }
        if (raw !== undefined) break
      } catch (error) {
        // A source that cannot be reached is not a fault here: the meter keeps
        // judging by the catalog already held, and the next URL gets its turn.
        warn(`${PACKAGE_NAME}: peak rate source ${url} unreachable: ${(error as { message?: string }).message}`)
      }
    }
    if (raw === undefined) {
      warn(`${PACKAGE_NAME}: no peak rate source answered; keeping the current catalog`)
      return false
    }
    const parsed = parseCatalog(raw)
    if (parsed === null) {
      warn(`${PACKAGE_NAME}: peak rate source answered a document this build does not understand; keeping the current catalog`)
      return false
    }
    // A disposal during the fetch must not leave this answer in the cache.
    if (disposed) return false
    catalog = parsed
    origin = 'remote'
    fetchedAt = Date.now()
    writeCache()
    return true
  }

  /** Store the fetched document, so a restart does not have to reach the source again. */
  function writeCache(): void {
    if (disposed) return
    const stored: CacheDocument = { fetchedAt, document: catalog }
    writeJsonDocument(ctx, cacheFile, 'peak rate cache', stored)
  }

  /** Keep a long-running host current: the timer starts with the first request. */
  function ensure(): void {
    load()
    lastAskedAt = Date.now()
    if (timer !== undefined) return
    timer = setInterval(() => {
      // Nothing has asked for two days: the meter is off or the page is gone,
      // and the source is no longer reached on its behalf The next
      // request starts the timer again.
      if (Date.now() - lastAskedAt > PEAKRATE_IDLE_MS) {
        stopTimer()
        return
      }
      void refresh()
    }, PEAKRATE_REFRESH_MS)
    timer.unref?.()
  }

  /** Stand the refresh timer down; a later request re-arms it. */
  function stopTimer(): void {
    if (timer === undefined) return
    clearInterval(timer)
    timer = undefined
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
      disposed = true
      stopTimer()
      // A read still in flight is stopped here: its answer would write the
      // cache file for a plugin that is no longer installed.
      if (inFlight !== null) {
        inFlight.abort()
        inFlight = null
      }
    },
  }
}
