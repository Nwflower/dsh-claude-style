import { requestFrame } from '@dsh-claude-style/engine/frame'
import { CHAT_ROLLING_ATTR } from '../../constants'
import { CONVERSATION_SCROLL_SELECTOR, DISCLOSURE_HEADER_SELECTOR, DISCLOSURE_ROW_SELECTOR, FOLD_TOGGLE_SELECTOR, FOLLOW_THRESHOLD_PX, PROCESS_BODY_SELECTOR } from '@dsh-claude-style/contracts/dom'
import { handBackFollow, readerMovedSince } from '@dsh-claude-style/engine/scroll-owner'
import { motionMs } from '../../shared/motion'
import { inPagePixels } from '../../shared/page-zoom'

/** Movement token shared with the sliding highlight (D9). */
export const FOLD_ROLL_MS = motionMs('--dsh-claude-duration-move')
/** Reserve time for offscreen height so the visible and offscreen stretches meet without a jump. */
export const FOLD_VISIBLE_SHARE = 0.9
/** An intent older than this is no longer trustworthy (no layout change followed, or it came from elsewhere). */
export const FOLD_INTENT_TTL_MS = 500
export { FOLD_SKIPPED_CONTROL_SELECTOR, FOLD_TOGGLE_SELECTOR } from '@dsh-claude-style/contracts/dom'
/** Popup controls (menus, dialogs, lists): they open no folding body, so the whole module skips them. */
export const FOLD_POPUP_SELECTOR = '[aria-haspopup]'
/** How many frames to wait at most for React to take the collapse before the shutdown animation is withdrawn. */
export const FOLD_SHUT_CONFIRM_FRAMES = 3
/** After the door lands, "the position belongs to the animation" is counted this much longer, so the settle frame does not meet the follow guard. */
export const FOLD_BUSY_GRACE_MS = 50
/** A post-stall frame carries its pre-stall timestamp, so the gap appears on the following frame. */
export const FOLD_FRAME_GAP_LIMIT_MS = 25
/** Before this screen's own frame interval has been measured, one frame at 60 Hz. */
export const FOLD_NOMINAL_FRAME_MS = 16.7

/** Until when the position belongs to the animation. */
export let chatFoldBusyUntil = 0

/** Host follow waits while height animation owns the scroll position. */
export function isChatFoldBusy() {
  return performance.now() < chatFoldBusyUntil
}

/** Reserve a stretch in which the position belongs to the animation. */
export function markChatFoldBusy() {
  chatFoldBusyUntil = performance.now() + FOLD_ROLL_MS + FOLD_BUSY_GRACE_MS
}

/** Measure visible travel through every clipping ancestor so tall content does not animate at full-height speed. */
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
  return inPagePixels(Math.max(0, Math.min(rect.height, bottom - rect.top)))
}

/**
 * The fold control a press on `target` works: a DisclosureRow, or any other
 * button carrying aria-expanded (a process group's header among them).
 */
export function foldControlAt(target: Element) {
  const disclosure = target.closest<HTMLElement>(DISCLOSURE_ROW_SELECTOR)
  return disclosure !== null ? disclosure : target.closest<HTMLElement>(FOLD_TOGGLE_SELECTOR)
}

/* Prefer aria-controls; useId values can contain colons. Without it, support both the sibling-body
   and wrapped-header host shapes. Process headers are handled separately because they animate the root. */
export function foldExpandedBody(control: Element) {
  const controls = control.getAttribute('aria-controls')
  if (controls !== null) {
    const target = document.getElementById(controls)
    return target instanceof HTMLElement ? target : null
  }
  const wrapper = control.parentElement
  const header = wrapper !== null && control.matches(DISCLOSURE_ROW_SELECTOR) && wrapper.matches(DISCLOSURE_HEADER_SELECTOR) ? wrapper : control
  const family = header.parentElement
  const last = family === null ? null : family.lastElementChild
  if (!(last instanceof HTMLElement) || last === header) return null
  if (!last.contains(header)) return last
  const inner = last.lastElementChild
  return inner instanceof HTMLElement && inner !== control ? inner : null
}

/** Only ProcessGroupHeader uses aria-controls for the group body; member rows must not match via closest(). */
export function foldProcessBody(control: Element) {
  const controls = control.getAttribute('aria-controls')
  if (controls === null) return null
  const target = document.getElementById(controls)
  return target instanceof HTMLElement && target.matches(PROCESS_BODY_SELECTOR) ? target : null
}

/**
 * Whether the reader is at the session's end right now.
 */
export function foldControlAtBottom(control: Element) {
  const scroller = control.closest(CONVERSATION_SCROLL_SELECTOR)
  // No scroller in reach counts as "not at the bottom".
  if (scroller === null) return false
  return scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight <= FOLLOW_THRESHOLD_PX
}

/** Record reader scroll events during the fold; composer input events do not count as scrolling. */
export function foldWatchReader(atBottom: boolean) {
  const since = performance.now()
  return { atBottom, moved: () => readerMovedSince(since) }
}

/** One fold's settle credentials (foldWatchReader). */
export type FoldWatch = ReturnType<typeof foldWatchReader>

/** Hand follow back only when the reader started at the bottom and has not scrolled since. */
export function foldHandBackFollow(watch: FoldWatch) {
  if (!watch.atBottom) return
  // He took the scroll over himself in between: the hand-back is void.
  handBackFollow('fold', { stillWanted: () => !watch.moved() })
}

/** Wait for the actual animation when present because stalls extend it; otherwise use the duration. */
export function foldSettleAfter(watch: FoldWatch, roll?: Animation | null) {
  if (roll === null || roll === undefined) {
    const timer = window.setTimeout(() => {
      foldHandBackFollow(watch)
    }, FOLD_ROLL_MS)
    return () => { window.clearTimeout(timer) }
  }
  // A settle an ended generation should not make is dropped rather than left:
  // the hand-back walks the position and presses the host's own button.
  let stopped = false
  const settle = () => {
    if (stopped) return
    foldHandBackFollow(watch)
  }
  roll.finished.then(settle, settle)
  return () => { stopped = true }
}

/* WAAPI advances through main-thread stalls that paint nothing. Rewind long gaps by the measured
   frame interval and extend the busy window so animation and follow resume together. */
export function foldHoldThroughStalls(roll: Animation) {
  let lastFrameAt = 0
  let lastTime = 0
  let frameInterval = FOLD_NOMINAL_FRAME_MS
  /** Set by the returned stop: the look in flight does not book another. */
  let stopped = false
  /** Cancels the frame the next look waits on. */
  let cancelLook: (() => void) | null = null
  const timeOf = () => {
    const time = roll.currentTime
    return typeof time === 'number' ? time : 0
  }
  const look = (now: number) => {
    cancelLook = null
    if (stopped || roll.playState !== 'running') return
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
    cancelLook = requestFrame({ write: look })
  }
  cancelLook = requestFrame({ write: look })
  return () => {
    stopped = true
    if (cancelLook !== null) cancelLook()
    cancelLook = null
  }
}

/** fill:forwards pins the final height; wait for React's collapse before cancelling to avoid a full-height jump. */
export function foldConfirmCollapsed(settled: () => boolean, done: () => void) {
  /** Set by the returned stop: the frames in flight do not press on. */
  let stopped = false
  /** Cancels the frame the next look waits on. */
  let cancelLook: (() => void) | null = null
  let tries = 0
  const step = () => {
    cancelLook = null
    if (stopped) return
    if (settled() || tries >= FOLD_SHUT_CONFIRM_FRAMES) {
      done()
      return
    }
    tries += 1
    cancelLook = requestFrame({ write: step })
  }
  step()
  return () => {
    stopped = true
    if (cancelLook !== null) cancelLook()
    cancelLook = null
  }
}

/** Return prior inline styles and mark with the clip setup so either direction restores all of them. */
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
