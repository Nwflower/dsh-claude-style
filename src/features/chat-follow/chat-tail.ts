import { motionReduced } from '../../core/prefs'
import { CHAT_FLOW_SELECTOR, CONVERSATION_SCROLL_SELECTOR, FOLLOWING_TAIL_SELECTOR, FOLLOW_THRESHOLD_PX } from '../../shared/chat-dom'
import { easeScrollToEnd, isScrollEasing, stopScrollEase } from '../../shared/scroll-ease'

/**
 * Hand the chat area's scroll position back to the host's own follow.
 *
 * The host's follow is switched off by a scroll that looks like the reader
 * moving and does not reach the end: that scroll enters its 500 ms sampling
 * window, in which a resize follows nothing, and the settlement compares
 * position rather than intent — so the host's own focus(), a browser clamp
 * and any programmatic write all read as the reader having moved. The
 * structural moments are exactly where that happens: a thinking row folds,
 * a tool row arrives, a process group opens, and each one both moves the
 * position and delivers a burst of content inside that window.
 *
 * The host leaves one way back in: the "back to the end" button it renders
 * only while the follow is off, whose click clears the sampling window,
 * lights the follow up again and reaches the end at once. Both ways are
 * used here, in this order:
 *
 *   pin     the position is walked to the end on a curve (shared/scroll-ease.ts),
 *           so the text above the last line is pushed up smoothly rather
 *           than snapping. Any displacement at all makes the host's own
 *           onScroll take the "reader reached the end" branch — which does
 *           not ask whether the follow is on — so it lights the follow up
 *           and clears the window. With the position already at the end
 *           nothing changes.
 *   click   no displacement means no scroll event, so the pin is a no-op.
 *           That is the start of an execution, when the content has not
 *           grown a scrollbar yet: the end is 0 and the position is 0, and
 *           writing either one is still 0. Only the button works there,
 *           because its own followTail() needs no displacement.
 *
 * The looks in between are needed: the host often turns the follow off a
 * beat late, once its sampling window settles, and five looks cover that
 * window.
 */
/** How many times to look after a hand-back; the host may turn the follow off a beat later. */
export const FOLLOW_LOOK_ROUNDS = 5
/** The gap between two looks; five of them cover the host's 500 ms sampling window. */
export const FOLLOW_LOOK_INTERVAL_MS = 100

/** How long the looks after a hand-back take, for a caller computing its own listener's lifetime (fold-glide-parts.ts). */
export const FOLLOW_LOOK_TOTAL_MS = FOLLOW_LOOK_ROUNDS * FOLLOW_LOOK_INTERVAL_MS

/** The session's scroll container: the host hangs its follow and its fold animation on it. */
export function conversationScroller() {
  return document.querySelector<HTMLElement>(CONVERSATION_SCROLL_SELECTOR)
}

/**
 * Whether the reader is at the session's end right now, by the host's own line.
 * @param scroller - the session's scroll container.
 * @returns true within the host's own threshold of the end.
 */
export function isAtBottom(scroller: Element) {
  return scroller.scrollHeight - scroller.clientHeight - scroller.scrollTop <= FOLLOW_THRESHOLD_PX
}

/**
 * The host's own "back to the end" button, the one it renders only while its
 * follow is off.
 *
 * With the follow off, data-chat-following-tail is gone, so the frame that
 * holds the button is found by walking back out of the column: column to
 * scroll frame to frame, and the button sits beside the frame. The stream
 * glide (chat-follow.ts) needs the same button to keep it out of sight while
 * it follows.
 * @returns the button, or null when the frame or the button is not there.
 */
export function findFollowTailButton() {
  const column = document.querySelector(CHAT_FLOW_SELECTOR)
  const root = column === null || column.parentElement === null ? null : column.parentElement.parentElement
  if (root === null || root.nextElementSibling === null) return null
  return root.nextElementSibling.querySelector('button')
}

/**
 * Make the session follow its end again, lighting the host's own follow
 * back up when it has been switched off.
 *
 * @param ensure - { stillWanted, onSettled }. stillWanted is asked before
 *     every look: a hand-back lands hundreds of milliseconds after the
 *     event that asked for it, and the reader can take the scroll over in
 *     between. onSettled runs once the round is over.
 */
export function ensureFollowTail(ensure?: { stillWanted?: () => boolean, onSettled?: () => void }) {
  const stillWanted = typeof ensure?.stillWanted === 'function' ? ensure.stillWanted : () => true
  const onSettled = typeof ensure?.onSettled === 'function' ? ensure.onSettled : null
  const scroller = conversationScroller()
  if (scroller === null) {
    if (onSettled !== null) onSettled()
    return
  }
  // Put the position where the reader should be first. This also covers the
  // "follow is on, it just fell behind" case: the host reads the move as the
  // reader reaching the end, lights the follow up and clears its window.
  // Walked in on a curve rather than written outright, so the text above the
  // last line is pushed up smoothly instead of snapping (shared/scroll-ease.ts);
  // the reader's animation choice still means "no animation".
  if (scroller.scrollHeight - scroller.clientHeight - scroller.scrollTop > 0.5) {
    if (motionReduced()) scroller.scrollTop = scroller.scrollHeight
    else easeScrollToEnd(scroller, stillWanted)
  }
  let rounds = 0
  const look = () => {
    if (!stillWanted() || rounds >= FOLLOW_LOOK_ROUNDS) {
      if (onSettled !== null) onSettled()
      return
    }
    rounds += 1
    // The walk comes first and the button only after it: clicking mid-walk
    // would drop the eased position for the host's own instant jump, which
    // is the jump this hand-back exists to avoid.
    if (isScrollEasing(scroller)) {
      window.setTimeout(look, FOLLOW_LOOK_INTERVAL_MS)
      return
    }
    // A pinned position does not mean the follow is back: the settlement may
    // switch it off a beat later, and after that only the button brings it back.
    if (document.querySelector(FOLLOWING_TAIL_SELECTOR) === null) {
      const button = findFollowTailButton()
      if (button !== null) {
        // The button's own followTail() reaches the end without a scroll
        // event, so the ease in flight is handed back rather than left to
        // fight it for the position.
        stopScrollEase(scroller)
        button.click()
        if (onSettled !== null) onSettled()
        return
      }
    }
    window.setTimeout(look, FOLLOW_LOOK_INTERVAL_MS)
  }
  window.setTimeout(look, FOLLOW_LOOK_INTERVAL_MS)
}
