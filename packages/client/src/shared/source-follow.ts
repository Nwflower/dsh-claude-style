/** A host source a pass reads; the ones that can announce a change carry `subscribe`. */
export interface AnnouncingSource {
  subscribe?(listener: () => void): () => void
}

/**
 * One subscription on each host source a feature's pass reads.
 *
 * Some host changes reach no page node — a session starting or stopping under
 * a closed workspace, the view menu writing its grouping into its store — so
 * the pass has to be asked for by the sources themselves. The host replaces a
 * service rather than mutating it, so the sources are compared by identity: a
 * source that is gone is let go, and a new one is subscribed.
 *
 * @param onChange - asks for the pass that reads the sources again.
 */
export function createSourceFollow(onChange: () => void) {
  /** The followed sources and how each one stops; null for a source that announces nothing. */
  const followed = new Map<AnnouncingSource, (() => void) | null>()

  function listen(source: AnnouncingSource): (() => void) | null {
    if (typeof source.subscribe !== 'function') return null
    try {
      return source.subscribe(onChange)
    } catch {
      // A source the host already tore down can still be handed out and throw
      // here. It stays unheard: the page's own changes still ask for passes,
      // and the source the host puts in its place is a new subscription (D12).
      return null
    }
  }

  return {
    /** Follow exactly these sources, the ones this pass read; an absent one is skipped. */
    follow(sources: readonly (AnnouncingSource | null | undefined)[]) {
      const wanted = new Set<AnnouncingSource>()
      for (const source of sources) if (source !== null && source !== undefined) wanted.add(source)
      for (const [source, stop] of followed) {
        if (wanted.has(source)) continue
        stop?.()
        followed.delete(source)
      }
      for (const source of wanted) {
        if (!followed.has(source)) followed.set(source, listen(source))
      }
    },
    release() {
      for (const stop of followed.values()) stop?.()
      followed.clear()
    },
  }
}
