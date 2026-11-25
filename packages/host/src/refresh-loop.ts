/**
 * The reader-driven refresh loop the price and peak rate snapshots share: a
 * timer that starts with the first reader and stands down once nobody has asked
 * for the idle spell, one fetch every trigger shares (the timer, a route's POST
 * and a stale read never ask the source twice), and a read path that refreshes
 * a stale document on the spot. The document, its parsing and its disk cache
 * stay with the caller; this module owns the timing and the single flight.
 */
export interface RefreshLoop {
  /** Arm the timer after the caller's first load. */
  ensure(): void
  /** The read path: past the refresh age and no fetch running means fetch now. */
  refreshIfStale(): void
  /** One fetch at a time; every caller shares the promise. */
  refresh(): Promise<boolean>
  /** Stand the timer down; the caller's dispose aborts the fetch itself. */
  stop(): void
}

export function createRefreshLoop(options: {
  refreshMs: number
  idleMs: number
  fetch: () => Promise<boolean>
  /** When the caller's current document was fetched; a restored cache counts. */
  fetchedAt: () => number
  disposed: () => boolean
}): RefreshLoop {
  let lastAskedAt = 0
  let timer: ReturnType<typeof setInterval> | undefined
  let refreshing: Promise<boolean> | null = null

  function refresh(): Promise<boolean> {
    refreshing ??= options.fetch().finally(() => { refreshing = null })
    return refreshing
  }

  function refreshIfStale(): void {
    if (options.disposed() || refreshing !== null) return
    if (Date.now() - options.fetchedAt() <= options.refreshMs) return
    void refresh()
  }

  function stop(): void {
    if (timer === undefined) return
    clearInterval(timer)
    timer = undefined
  }

  return {
    ensure() {
      lastAskedAt = Date.now()
      refreshIfStale()
      if (timer !== undefined) return
      timer = setInterval(() => {
        // Nothing has asked for the idle spell: the meter is off or the page is
        // gone, and the source is no longer reached on its behalf. The next
        // request starts the timer again.
        if (Date.now() - lastAskedAt > options.idleMs) {
          stop()
          return
        }
        void refresh()
      }, options.refreshMs)
      timer.unref?.()
    },
    refreshIfStale,
    refresh,
    stop,
  }
}
