/**
 * The price snapshot the host holds: the copy shipped in the package, the copy
 * refreshed from the repository, and which of the two is newer.
 *
 * The repository owns the scraping (`scripts/data/fetch-prices.mjs`, run by
 * `.github/workflows/data.yml`); a host only downloads the validated result, once
 * a day, and keeps it on disk. The packaged copy is what a machine with no reach
 * judges by, so the meter works on a first run with no network at all.
 *
 * The refresh follows `peakrate.ts`: a timer that starts with the first reader,
 * stands down when nobody has asked for two days, and keeps the current document
 * whenever the fetch or the parse fails.
 */
import { PACKAGE_NAME } from '@dsh-claude-style/contracts/package'
import { statSync } from 'node:fs'
import { join } from 'node:path'
import type { DshContext } from '@dsh-claude-style/engine/node/dsh'
import type { PriceDocument } from '@dsh-claude-style/contracts/prices'
import { cachePath, readJsonDocument, writeJsonDocument } from './cache-file.js'
import { packageRoot } from './package-root.js'
import { parsePriceDocument } from './prices-document.js'

/** The snapshot's file name under packages/host/data/, and beside the bundle in lib/. */
export const PRICES_FILE = 'prices.json'

/** Where the snapshot is published: the CDN first, the repository's raw file second. */
export const PRICES_URLS = [
  'https://cdn.jsdelivr.net/gh/Nwflower/dsh-claude-style@master/packages/host/data/prices.json',
  'https://raw.githubusercontent.com/Nwflower/dsh-claude-style/master/packages/host/data/prices.json',
]

/** How long a fetched snapshot counts as current. */
export const PRICES_REFRESH_MS = 24 * 60 * 60 * 1000

/** How long after the last reader the timer stands down. */
export const PRICES_IDLE_MS = 48 * 60 * 60 * 1000

/** A source that accepts the connection and says nothing is not worth the wait. */
const FETCH_TIMEOUT_MS = 10_000

/** What the route answers. */
export interface PricesPayload {
  document: PriceDocument | null
  fetchedAt?: string
  origin: 'remote' | 'bundled'
}

/** What the store hands the session-cost fold. */
export interface PriceStore {
  ensure(): void
  refresh(): Promise<boolean>
  document(): PriceDocument | null
  /** Changes whenever the table is replaced, so priced state can be discarded. */
  version(): string
  payload(): PricesPayload
  onChange(listener: () => void): () => void
  dispose(): void
}

/** The cache document: the snapshot and when it was fetched. */
interface CacheDocument {
  fetchedAt?: unknown
  document?: unknown
}

export function createPrices(ctx: DshContext): PriceStore {
  const shippedFile = join(packageRoot(), 'lib', PRICES_FILE)
  const cacheFile = cachePath(ctx, 'prices.json')

  let document: PriceDocument | null = null
  let origin: 'remote' | 'bundled' = 'bundled'
  let fetchedAt = 0
  let loaded = false
  let timer: ReturnType<typeof setInterval> | undefined
  let inFlight: AbortController | null = null
  /** Set by dispose: a source answer that lands afterwards must not write the cache. */
  let disposed = false
  let lastAskedAt = 0
  const listeners = new Set<() => void>()
  const warn = (message: string) => ctx.logger?.warn?.(message)

  /** The copy shipped in the package, which a machine with no reach has to judge by. */
  function shipped(): PriceDocument | null {
    const parsed = parsePriceDocument(readJsonDocument(ctx, shippedFile, `lib/${PRICES_FILE}`))
    if (parsed === null) {
      // The shipped copy is produced from the repository at release time; one
      // that no longer parses means the build shipped the wrong document.
      warn(`${PACKAGE_NAME}: lib/${PRICES_FILE} is not a price snapshot this build understands`)
      return null
    }
    return parsed
  }

  /** The cached copy, when it is at least as new as the shipped one. */
  function cached(shippedDocument: PriceDocument | null): { document: PriceDocument, fetchedAt: number } | null {
    const value = readJsonDocument(ctx, cacheFile, 'price cache')
    if (value === null || typeof value !== 'object') return null
    const stored = value as CacheDocument
    const parsed = parsePriceDocument(stored.document)
    if (parsed === null) return null
    if (shippedDocument !== null && parsed.updatedAt < shippedDocument.updatedAt) return null
    return { document: parsed, fetchedAt: typeof stored.fetchedAt === 'number' ? stored.fetchedAt : 0 }
  }

  function load(): void {
    if (loaded) return
    loaded = true
    const shippedDocument = shipped()
    const held = cached(shippedDocument)
    if (held !== null) {
      document = held.document
      fetchedAt = held.fetchedAt
      return
    }
    document = shippedDocument
  }

  function announce() {
    for (const listener of listeners) listener()
  }

  async function fetchOne(url: string): Promise<PriceDocument | null> {
    const controller = new AbortController()
    inFlight = controller
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
    try {
      const response = await fetch(url, { signal: controller.signal, headers: { accept: 'application/json' } })
      if (!response.ok) {
        warn(`${PACKAGE_NAME}: ${url} answered ${response.status}`)
        return null
      }
      return parsePriceDocument(await response.json())
    } finally {
      clearTimeout(timeout)
      if (inFlight === controller) inFlight = null
    }
  }

  /** Fetch the snapshot from the repository, falling back to the raw file. */
  async function refresh(): Promise<boolean> {
    let next: PriceDocument | null = null
    for (const url of PRICES_URLS) {
      // Disposed while the previous source was being asked: nothing below runs
      // on behalf of a plugin that is gone.
      if (disposed) return false
      try {
        next = await fetchOne(url)
      } catch (error) {
        // An unreachable source is not a fault here: the meter keeps judging
        // by the document already held (D12's isolation).
        warn(`${PACKAGE_NAME}: ${url} unreachable: ${(error as { message?: string }).message}`)
      }
      if (next !== null) break
    }
    if (next === null) {
      warn(`${PACKAGE_NAME}: no price source answered a document this build understands; keeping the current one`)
      return false
    }
    // A disposal during the fetch must not leave this answer in the cache.
    if (disposed) return false
    document = next
    origin = 'remote'
    fetchedAt = Date.now()
    writeJsonDocument(ctx, cacheFile, 'price cache', { fetchedAt, document: next })
    announce()
    return true
  }

  function ensure(): void {
    load()
    lastAskedAt = Date.now()
    if (timer !== undefined) return
    timer = setInterval(() => {
      if (Date.now() - lastAskedAt > PRICES_IDLE_MS) {
        stopTimer()
        return
      }
      void refresh()
    }, PRICES_REFRESH_MS)
    timer.unref?.()
  }

  function stopTimer(): void {
    if (timer === undefined) return
    clearInterval(timer)
    timer = undefined
  }

  return {
    ensure,
    refresh,
    document() {
      return document
    },
    version() {
      return document === null ? '' : `${document.updatedAt}:${document.capturedAt ?? ''}`
    },
    payload() {
      return {
        document,
        ...(fetchedAt === 0 ? {} : { fetchedAt: new Date(fetchedAt).toISOString() }),
        origin,
      }
    },
    onChange(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    dispose() {
      disposed = true
      stopTimer()
      listeners.clear()
      if (inFlight !== null) {
        inFlight.abort()
        inFlight = null
      }
    },
  }
}
