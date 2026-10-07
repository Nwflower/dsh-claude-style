import { observeSize } from '../../core/bus'
import { PROCESS_BODY_SELECTOR, PROCESS_CONTENT_SELECTOR, PROCESS_EXPANDED_MODE_ATTRIBUTE } from '../../contracts/dom'
import { easeScrollToEndFor, joinScrollOwner, readerHolds, releaseReader, stopScrollFor } from '../../shared/scroll-owner'

/**
 * The capped process group's follow: inside it, thinking and tool output do
 * not fall behind.
 *
 * The standard and compact tiers cap one process group's body (a max
 * height with its own scrollbar), and the host follows that body with a
 * native smooth scroll. Two things make it miss while content streams:
 *
 *   travel  a native smooth scroll eases out as it nears its target, and
 *           the content grows at a steady rate instead — a thinking section
 *           followed by tool output grows no slower than the scroll.
 *   single  the host starts the next one only once the previous has landed,
 *           so anything the content grows meanwhile waits.
 *
 * Together they leave the position 20 to 50 px off the end — exactly the
 * last two lines. Nothing here changes the host's own state: past
 * CATCH_UP_GAP_PX the catch-up asks the scroll owner to walk the body's
 * position to its end (shared/scroll-owner.ts, D41), so the text above the
 * last line is pushed up smoothly rather than in a jump, and inside that
 * threshold it leaves the host's smooth scroll alone, which is the pleasant
 * one while it keeps up. The reader scrolling inside a body holds that body
 * until he comes back to its end (the owner's readerHolds).
 *
 * The catch-up and the host's own follow do not fight: moving scrollTop
 * runs its onScroll, and it reads a position at the end as the reader
 * reaching the end — which lights its follow up again and drops the
 * animation target that was stuck.
 */
/**
 * Past this the catch-up takes over. Inside it the host's smooth scroll
 * gets to finish; measured while streaming, its steady-state lag runs
 * between 20 and 50 px, so 40 sits in the middle.
 */
export const CATCH_UP_GAP_PX = 40
/** How often the watched bodies are brought up to date; session switches and groups coming and going ride it. */
export const PROCESS_SYNC_INTERVAL_MS = 500

/**
 * Watch every process group's body on the page and catch up the ones that
 * fall behind.
 *
 * @returns teardown: the size subscriptions and the timer go away.
 */
export function createChatProcessFollow() {
  const leaveOwner = joinScrollOwner()
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
    // Written outright, the catch-up lands as a jump of forty-odd pixels
    // several times a second while text streams, which reads as the
    // paragraph above the last line snapping upward; the owner eases it there
    // instead, and writes it outright under reduced motion.
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
   * Session switches, groups coming and going, and a content layer being
   * remounted all have to be followed.
   *
   * The content layer is resolved again on every sync rather than once:
   * the body is capped, so content growth does not change its own size —
   * the layer inside it is what changes size, and once React remounts that
   * layer the old element stops reporting.
   */
  const sync = () => {
    const present = new Set(document.querySelectorAll(PROCESS_BODY_SELECTOR))
    for (const body of present) {
      const content = body.querySelector(PROCESS_CONTENT_SELECTOR)
      let entry = watched.get(body)
      if (entry === undefined) {
        entry = { content: null, stopBody: observeSize(body, onResize), stopContent: null }
        watched.set(body, entry)
      } else if (entry.content === content) {
        continue
      }
      if (entry.stopContent !== null) entry.stopContent()
      entry.content = content
      entry.stopContent = content === null ? null : observeSize(content, onResize)
    }
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

  const timer = window.setInterval(sync, PROCESS_SYNC_INTERVAL_MS)
  sync()

  return () => {
    stopped = true
    window.clearInterval(timer)
    for (const [body, entry] of watched) {
      entry.stopBody()
      if (entry.stopContent !== null) entry.stopContent()
      stopScrollFor(body, 'process')
    }
    watched.clear()
    leaveOwner()
  }
}
