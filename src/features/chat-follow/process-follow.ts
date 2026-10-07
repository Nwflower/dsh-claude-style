import { observeSize } from '../../core/bus'
import { motionReduced } from '../../core/prefs'
import { isReaderScrollIntent } from '../../shared/reader-intent'
import { PROCESS_BODY_SELECTOR, PROCESS_CONTENT_SELECTOR, PROCESS_EXPANDED_MODE_ATTRIBUTE } from '../../shared/chat-dom'
import { easeScrollToEnd, stopScrollEase } from '../../shared/scroll-ease'

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
 * CATCH_UP_GAP_PX the catch-up walks the body's scrollTop to its end on a
 * curve (shared/scroll-ease.ts, so the text above the last line is pushed up
 * smoothly rather than in a jump), and inside that threshold it leaves the
 * host's smooth scroll alone, which is the pleasant one while it keeps up.
 * The reader scrolling inside a body hands that body over until he comes
 * back to its end.
 *
 * The catch-up and the host's own follow do not fight: moving scrollTop
 * runs its onScroll, and it reads a position at the end as the reader
 * reaching the end — which lights its follow up again and drops the
 * animation target that was stuck.
 */
/** How close to a body's end the reader has to be for the hand-over to end. */
export const PROCESS_RELEASE_THRESHOLD_PX = 4
/**
 * Past this the catch-up takes over. Inside it the host's smooth scroll
 * gets to finish; measured while streaming, its steady-state lag runs
 * between 20 and 50 px, so 40 sits in the middle.
 */
export const CATCH_UP_GAP_PX = 40
/** How often the watched bodies are brought up to date; session switches and groups coming and going ride it. */
export const PROCESS_SYNC_INTERVAL_MS = 500
/**
 * The intent events read here: the wheel, a touch drag (touchmove as well),
 * the pointer and the scroll keys. One more than the host's own reading
 * intents (a drag inside a body counts) and one fewer (in-page find has
 * nothing to do with a body).
 */
export const PROCESS_INTENT_TYPES = ['wheel', 'touchstart', 'touchmove', 'pointerdown', 'keydown']

/**
 * Watch every process group's body on the page and catch up the ones that
 * fall behind.
 *
 * @returns teardown: the size subscriptions, the listeners and the timer go away.
 */
export function createChatProcessFollow() {
  /** A body the reader has really scrolled in, until he comes back to its end. */
  const takenOver = new WeakSet<Element>()
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
    if (takenOver.has(body)) return
    if (!followable(body)) return
    if (gapOf(body) <= CATCH_UP_GAP_PX) return
    // Written outright, the catch-up lands as a jump of forty-odd pixels
    // several times a second while text streams, which reads as the
    // paragraph above the last line snapping upward; the position is eased
    // there instead (shared/scroll-ease.ts). The reader's animation choice still
    // means "no animation", so reduced motion keeps the direct write.
    if (motionReduced()) {
      body.scrollTop = body.scrollHeight
      return
    }
    easeScrollToEnd(body, () => !stopped && !takenOver.has(body) && followable(body))
  }

  /**
   * Note that the reader took this body's scroll over.
   *
   * A pointer on the body's content does not count: that is opening a row,
   * not touching the scrollbar. The scrollbar is the body's own strip, and
   * an event aimed at it has the body as its target.
   */
  const noteIntent = (event: Event) => {
    const target = event.target
    if (!(target instanceof Element)) return
    const body = target.closest(PROCESS_BODY_SELECTOR)
    if (body === null) return
    if (event.type === 'pointerdown' && target !== body) return
    if (!isReaderScrollIntent(event)) return
    // A scroll key the host has already handled is not ours to read: it knows where it is going.
    if (event.type === 'keydown' && event.defaultPrevented) return
    takenOver.add(body)
  }

  /** The reader came back to this body's end: the hand-over ends. */
  const noteScroll = (event: Event) => {
    const target = event.target
    if (!(target instanceof HTMLElement)) return
    if (!target.matches(PROCESS_BODY_SELECTOR)) return
    if (gapOf(target) > PROCESS_RELEASE_THRESHOLD_PX) return
    takenOver.delete(target)
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
        // A body that was folded and is open again should not carry the last hand-over over.
        if (body.hasAttribute('hidden')) takenOver.delete(body)
        continue
      }
      watched.delete(body)
      takenOver.delete(body)
      entry.stopBody()
      if (entry.stopContent !== null) entry.stopContent()
      // A body leaving the page takes its ease with it; the loop would drop
      // it anyway (it is no longer connected), and this is the tidier exit.
      stopScrollEase(body)
    }
  }

  const timer = window.setInterval(sync, PROCESS_SYNC_INTERVAL_MS)
  window.addEventListener('scroll', noteScroll, { capture: true, passive: true })
  for (const type of PROCESS_INTENT_TYPES) window.addEventListener(type, noteIntent, { capture: true, passive: true })
  sync()

  return () => {
    stopped = true
    window.clearInterval(timer)
    window.removeEventListener('scroll', noteScroll, true)
    for (const type of PROCESS_INTENT_TYPES) window.removeEventListener(type, noteIntent, true)
    for (const [body, entry] of watched) {
      entry.stopBody()
      if (entry.stopContent !== null) entry.stopContent()
      stopScrollEase(body)
    }
    watched.clear()
  }
}
