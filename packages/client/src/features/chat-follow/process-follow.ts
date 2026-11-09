import { observeMatches, observeSize, subscribeMutations } from '@dsh-claude-style/engine/bus'
import { PROCESS_BODY_SELECTOR, PROCESS_CONTENT_SELECTOR, PROCESS_EXPANDED_MODE_ATTRIBUTE } from '@dsh-claude-style/contracts/dom'
import { easeScrollToEndFor, joinScrollOwner, readerHolds, releaseReader, stopScrollFor } from '@dsh-claude-style/engine/scroll-owner'

/**
 * Keep a capped process body at its end while content streams. Beyond the
 * threshold the scroll owner eases past the host's slow smooth scroll (D40);
 * a reader-scrolled body stays held until they return to its end.
 */
/** Gap past which the catch-up replaces the host's smooth scroll. */
export const CATCH_UP_GAP_PX = 40

/** Watch every process body and catch up the ones that fall behind. */
export function createChatProcessFollow() {
  const leaveOwner = joinScrollOwner()
  /** Every body on the page; taken before the mutation watch below, so the bus delivers a batch to it first. */
  const bodies = observeMatches(PROCESS_BODY_SELECTOR)
  /** The bodies watched, each with the content layer it currently has and what stops watching the two. */
  const watched = new Map<Element, { content: Element | null, stopBody: () => void, stopContent: (() => void) | null }>()
  /** Set by the teardown, so an ease in flight stops with the feature. */
  let stopped = false

  /** Whether this body is ours to follow at all. */
  const followable = (body: Element) => {
    // Folded away, it is not visible.
    if (body.hasAttribute('hidden')) return false
    // Detailed and fully expanded do not cap the body: there is no inner scrollbar to follow.
    if (body.closest('[' + PROCESS_EXPANDED_MODE_ATTRIBUTE + ']') !== null) return false
    // With nothing to scroll there is nothing to do.
    return body.scrollHeight - body.clientHeight > 0
  }

  /** How far this body still is from its own end. */
  const gapOf = (body: Element) => body.scrollHeight - body.clientHeight - body.scrollTop

  /** Past the threshold, walk the body's position to its end on a curve. */
  const catchUp = (body: Element) => {
    if (readerHolds(body)) return
    if (!followable(body)) return
    if (gapOf(body) <= CATCH_UP_GAP_PX) return
    // Ease rather than jump; reduced motion writes the position directly.
    easeScrollToEndFor(body, 'process', () => !stopped && followable(body))
  }

  // Every content change is judged once. Watching the body itself matters
  // too: a window resize changes which cap applies.
  const onResize = (entries: ResizeObserverEntry[]) => {
    for (const entry of entries) {
      const target = entry.target
      if (!(target instanceof HTMLElement)) continue
      const body = target.closest(PROCESS_BODY_SELECTOR)
      if (body === null) continue
      catchUp(body)
    }
  }

  /**
   * Re-observe one body's content layer, whose size changes while the capped
   * body's does not; React remounts require a fresh observer.
   */
  const syncBody = (body: Element) => {
    const content = body.querySelector(PROCESS_CONTENT_SELECTOR)
    let entry = watched.get(body)
    if (entry === undefined) {
      entry = { content: null, stopBody: observeSize(body, onResize), stopContent: null }
      watched.set(body, entry)
    } else if (entry.content === content) {
      return
    }
    if (entry.stopContent !== null) entry.stopContent()
    entry.content = content
    entry.stopContent = content === null ? null : observeSize(content, onResize)
  }

  /**
   * Re-observe every body and drop the ones that left. A batch inside one body
   * asks for that body alone (syncBody): a streamed answer lives in one, and
   * re-reading every body on each of its batches is the transcript's size paid
   * per frame.
   */
  const sync = () => {
    const present = new Set(bodies.all())
    for (const body of present) syncBody(body)
    for (const [body, entry] of [...watched]) {
      if (present.has(body)) {
        // A body that was folded and is open again should not carry the last hold over.
        if (body.hasAttribute('hidden')) releaseReader(body)
        continue
      }
      watched.delete(body)
      releaseReader(body)
      entry.stopBody()
      if (entry.stopContent !== null) entry.stopContent()
      // A body leaving the page takes its ease with it; the loop would drop
      // it anyway (it is no longer connected), and this is the tidier exit.
      stopScrollFor(body, 'process')
    }
  }

  /** Re-sync when a batch adds, removes or touches a body; sizes have their own watchers (D40). */
  const stopWatch = subscribeMutations(document.body, { childList: true, subtree: true }, records => {
    for (const record of records) {
      const target = record.target instanceof Element ? record.target : record.target.parentElement
      if (target !== null) {
        const body = target.closest(PROCESS_BODY_SELECTOR)
        if (body !== null) {
          syncBody(body)
          return
        }
      }
      for (const node of record.addedNodes) {
        if (!(node instanceof Element)) continue
        if (node.matches(PROCESS_BODY_SELECTOR)) syncBody(node)
        for (const found of node.querySelectorAll(PROCESS_BODY_SELECTOR)) syncBody(found)
      }
      for (const node of record.removedNodes) {
        if (!(node instanceof Element)) continue
        for (const body of watched.keys()) {
          if (body === node || node.contains(body)) {
            sync()
            return
          }
        }
      }
    }
  })
  sync()

  return () => {
    stopped = true
    stopWatch()
    bodies.release()
    for (const [body, entry] of watched) {
      entry.stopBody()
      if (entry.stopContent !== null) entry.stopContent()
      stopScrollFor(body, 'process')
    }
    watched.clear()
    leaveOwner()
  }
}
