import { requestFrame } from '../../core/frame'
import { CHAT_ROLLING_ATTR } from '../../constants'
import { CONVERSATION_SCROLL_SELECTOR, FOLLOW_THRESHOLD_PX, PROCESS_BODY_SELECTOR } from '../../contracts/dom'
import { handBackFollow, readerMovedSince } from '../../shared/scroll-owner'

/**
 * The measuring and bookkeeping half of the fold glide (fold-glide.ts): what
 * a folding body is, how far a door has to travel to be seen, the viewer's
 * own intent, the height animation's scaffolding, and the clock that says
 * "the position belongs to the animation right now".
 *
 * The glide itself — the click it takes over, the intent it remembers, the
 * two directions it rolls — lives in fold-glide.ts.
 */
/** The door's duration, the same tier as the sidebar's AnimatedRows. */
export const FOLD_ROLL_MS = 200
/**
 * The share of that duration the visible stretch gets; the rest is left for
 * the height outside the viewport.
 *
 * Something has to be left: the door's two stretches meet at "the part the
 * reader can see", and a final step that jumped would drag the content below
 * along with it.
 */
export const FOLD_VISIBLE_SHARE = 0.9
/** An intent older than this is no longer trustworthy (no layout change followed, or it came from elsewhere). */
export const FOLD_INTENT_TTL_MS = 500
/** A DisclosureRow row. Its expanded body is its next sibling. */
export const FOLD_DISCLOSURE_SELECTOR = '[data-disclosure-row]'
/** Every other control that opens and closes something (a process group's header). */
export const FOLD_TOGGLE_SELECTOR = '[aria-expanded]'
/** Popup controls (menus, dialogs, lists): they open no folding body, so the whole module skips them. */
export const FOLD_POPUP_SELECTOR = '[aria-haspopup]'
/**
 * Controls skipped whole: the turn's own header (the button reading "took X
 * seconds") and the turn's trigger notice — what they open is a whole turn's
 * content, which must not be pressed down.
 */
export const FOLD_SKIPPED_CONTROL_SELECTOR = '[data-turn-process], [data-turn-trigger]'
/** How many frames to wait at most for React to take the collapse before the shutdown animation is withdrawn. */
export const FOLD_SHUT_CONFIRM_FRAMES = 3
/** After the door lands, "the position belongs to the animation" is counted this much longer, so the settle frame does not meet the follow guard. */
export const FOLD_BUSY_GRACE_MS = 50
/**
 * Two frame timestamps further apart than this mean the main thread was held
 * up in between.
 *
 * Shorter than the stall itself: the first frame after a long task still
 * carries the timestamp queued before the stall and the jump lands on the one
 * after it — a measured 40 ms task leaves a 37 ms gap. 25 ms is about half a
 * frame at 60 Hz.
 */
export const FOLD_FRAME_GAP_LIMIT_MS = 25
/** Before this screen's own frame interval has been measured, one frame at 60 Hz. */
export const FOLD_NOMINAL_FRAME_MS = 16.7

/** Until when the position belongs to the animation. */
export let chatFoldBusyUntil = 0

/**
 * Whether a door is rolling right now.
 *
 * The position belongs to the animation while it does: were the follow guard
 * to pull the scroll to the end now, the height being pulled along would move
 * with it and read as a shake. It waits this stretch out.
 */
export function isChatFoldBusy() {
  return performance.now() < chatFoldBusyUntil
}

/** Reserve a stretch in which the position belongs to the animation. */
export function markChatFoldBusy() {
  chatFoldBusyUntil = performance.now() + FOLD_ROLL_MS + FOLD_BUSY_GRACE_MS
}

/**
 * How far down the part of this element the reader can see reaches.
 *
 * When the content is taller than the window the element occupies its whole
 * height and the reader only sees a stretch of it: a process group's body
 * (max-height: min(400px, 50vh)) is that window, and the viewport is the
 * outermost one. The door's travel is computed from that stretch, so it only
 * rolls where the reader can see; at full height, eight thousand pixels would
 * be covered in 200 ms and read as a pop.
 *
 * @param element - the element the door pulls.
 * @returns the offset to the visible end, in pixels; 0 when it is entirely outside the viewport.
 */
export function foldVisibleReach(element: Element) {
  const rect = element.getBoundingClientRect()
  let bottom = Math.min(rect.bottom, window.innerHeight)
  // Every clipping ancestor can narrow the visible range further, so the
  // whole chain is walked; an ancestor whose overflow is visible clips
  // nothing and is skipped. getComputedStyle is not wasted here — the element
  // has just been inserted, and its styles have to be resolved anyway.
  for (let ancestor = element.parentElement; ancestor !== null; ancestor = ancestor.parentElement) {
    const style = window.getComputedStyle(ancestor)
    if (style.overflowX === 'visible' && style.overflowY === 'visible') continue
    bottom = Math.min(bottom, ancestor.getBoundingClientRect().bottom)
  }
  return Math.max(0, Math.min(rect.height, bottom - rect.top))
}

/**
 * The body a control expands. When the control names one with aria-controls
 * that id is the answer (useId makes it carry colons, so getElementById is
 * the only way); otherwise the shape of the unmounting family decides it —
 * "the sibling after the control". Null means this control is collapsed right
 * now.
 *
 * A process group's header never arrives here: foldProcessBody claims it
 * first, and that path presses the group root rather than the body's own
 * height.
 */
export function foldExpandedBody(control: Element) {
  const controls = control.getAttribute('aria-controls')
  if (controls !== null) {
    const target = document.getElementById(controls)
    return target instanceof HTMLElement ? target : null
  }
  const parent = control.parentElement
  const last = parent === null ? null : parent.lastElementChild
  return last instanceof HTMLElement && last !== control ? last : null
}

/**
 * The process group body a control controls.
 *
 * Only a group's header points at its body with aria-controls (the host's
 * ProcessGroupHeader); the member rows inside a group do not carry that
 * attribute — their expanded body is their next sibling. So "the control
 * lives inside a process group" does not mean "the control is a group
 * header": every tool row and thinking row inside a body lives in one too.
 * Asking closest() alone would read a click on a tool row as opening the
 * whole group and press the group root in that row's place.
 *
 * @param control - the control that was pressed.
 * @returns the group body it controls, or null when it is not a header.
 */
export function foldProcessBody(control: Element) {
  const controls = control.getAttribute('aria-controls')
  if (controls === null) return null
  const target = document.getElementById(controls)
  return target instanceof HTMLElement && target.matches(PROCESS_BODY_SELECTOR) ? target : null
}

/**
 * Whether the reader is at the session's end right now.
 *
 * This one walks up from the pressed control; shared/chat-dom.ts's isAtBottom
 * answers the same question from the scroller. Same test, different entrance.
 */
export function foldControlAtBottom(control: Element) {
  const scroller = control.closest(CONVERSATION_SCROLL_SELECTOR)
  // No scroller in reach counts as "not at the bottom".
  if (scroller === null) return false
  return scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight <= FOLLOW_THRESHOLD_PX
}

/**
 * Start watching whether the reader takes the scroll over before this fold
 * settles.
 *
 * The settle hands the position back to the host's follow, and that only
 * holds for a reader who was at the bottom: the settle comes a couple of
 * hundred milliseconds after the press, and he can take over in between —
 * his intent is only visible in events, which the scroll owner reads
 * (readerMovedSince). A pointer or key inside the composer does not count:
 * he is typing, not scrolling.
 *
 * @param atBottom - whether the reader was at the bottom when the fold began.
 * @returns this fold's settle credentials.
 */
export function foldWatchReader(atBottom: boolean) {
  const since = performance.now()
  return { atBottom, moved: () => readerMovedSince(since) }
}

/** One fold's settle credentials (foldWatchReader). */
export type FoldWatch = ReturnType<typeof foldWatchReader>

/**
 * Fold settle: a reader who was at the bottom when the fold began gets the
 * position handed back to the host's follow.
 *
 * A fold is a large height change, and the host's follow is switched off by a
 * scroll that looks like the reader moving without reaching the end — its own
 * "back to the end" button is the only way in again. This decides whether the
 * hand-back still stands; how it is done (walk first, press the button only if
 * the attribute does not come back) is the scroll owner's handBackFollow, the
 * same road the follow guard takes.
 *
 * The test is "the reader was at the bottom when the fold began": if he was
 * reading higher up, the hand-back is none of his business.
 */
export function foldHandBackFollow(watch: FoldWatch) {
  if (!watch.atBottom) return
  // He took the scroll over himself in between: the hand-back is void.
  handBackFollow('fold', { stillWanted: () => !watch.moved() })
}

/**
 * The settle's entrance: look at the follow once the animation is over.
 *
 * The replay of a collapse and the cancellation of an expand both land at the
 * end of the animation, and the position only settles then. The expand passes
 * its own animation in and waits for it to really finish — a held-up main
 * thread stretches it (see foldHoldThroughStalls), and waiting a fixed
 * duration would pin the position while the door is still rolling. With no
 * animation to wait for (a collapse settling from onfinish, or a fold that
 * never started one) it waits FOLD_ROLL_MS.
 */
export function foldSettleAfter(watch: FoldWatch, roll?: Animation | null) {
  if (roll === null || roll === undefined) {
    window.setTimeout(() => {
      foldHandBackFollow(watch)
    }, FOLD_ROLL_MS)
    return
  }
  const settle = () => {
    foldHandBackFollow(watch)
  }
  roll.finished.then(settle, settle)
}

/**
 * Frames in which the main thread was held up do not count towards the door's
 * duration.
 *
 * The height animation runs on the main thread and paints nothing while it is
 * stuck, while WAAPI measures progress on the wall clock: the first frame
 * after the stall jumps straight to where it "should" be, which reads as the
 * door stopping and then leaping. So every frame the gap is read, and a long
 * one winds the animation's current time back to "one frame past the last
 * look" — the door pauses and then continues from where the reader last saw
 * it. "One frame" is this screen's most recent normal interval, so a
 * high-refresh display does not take an extra step. The wound-back stretch is
 * added to the busy window too, and the follow guard waits it out.
 *
 * Measured in an isolated page: winding currentTime back after a long task
 * works, and the next frame continues from there.
 */
export function foldHoldThroughStalls(roll: Animation) {
  let lastFrameAt = 0
  let lastTime = 0
  let frameInterval = FOLD_NOMINAL_FRAME_MS
  const timeOf = () => {
    const time = roll.currentTime
    return typeof time === 'number' ? time : 0
  }
  const look = (now: number) => {
    if (roll.playState !== 'running') return
    const gap = lastFrameAt === 0 ? 0 : now - lastFrameAt
    if (gap > FOLD_FRAME_GAP_LIMIT_MS) {
      const resumeAt = lastTime + frameInterval
      const skipped = timeOf() - resumeAt
      if (skipped > 0) {
        roll.currentTime = resumeAt
        chatFoldBusyUntil += skipped
      }
    } else if (gap > 0) {
      frameInterval = gap
    }
    lastFrameAt = now
    lastTime = timeOf()
    requestFrame({ write: look })
  }
  requestFrame({ write: look })
}

/**
 * Wait for React to land this collapse on the DOM, then withdraw the
 * animation and the inline styles.
 *
 * A collapse's height animation carries fill: 'forwards', which pins the
 * element at its final height. If React has not taken the click yet, cancel()
 * hands the whole height back to CSS — a jump from the end back to full
 * height, enough to throw the host's follow off. So the withdraw waits until
 * the DOM really collapsed; a few frames without that means the click did not
 * fold anything, and the element is put back as it was.
 */
export function foldConfirmCollapsed(settled: () => boolean, done: () => void, attempt?: number) {
  const tries = typeof attempt === 'number' ? attempt : 0
  if (settled() || tries >= FOLD_SHUT_CONFIRM_FRAMES) {
    done()
    return
  }
  requestFrame({
    write() {
      foldConfirmCollapsed(settled, done, tries + 1)
    },
  })
}

/**
 * The three pieces of bookkeeping a height animation starts with: clip the
 * overflow, make height mean border-box, and mark the door as rolling so the
 * children lay out at their natural height rather than being squeezed by flex
 * (fold-motion.css).
 *
 * Both directions do the same bookkeeping and both have to give it back, so
 * the old values and the restore travel together.
 *
 * @param target - the element the door presses.
 * @returns the restore: the inline styles and the mark, as they were.
 */
export function foldBeginHeightClip(target: HTMLElement) {
  const previousOverflow = target.style.overflow
  const previousBoxSizing = target.style.boxSizing
  target.style.overflow = 'hidden'
  target.style.boxSizing = 'border-box'
  target.setAttribute(CHAT_ROLLING_ATTR, '')
  return () => {
    target.style.overflow = previousOverflow
    target.style.boxSizing = previousBoxSizing
    target.removeAttribute(CHAT_ROLLING_ATTR)
  }
}
