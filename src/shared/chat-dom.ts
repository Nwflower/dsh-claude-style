import { CHAT_FLOW_SELECTOR, CONVERSATION_SCROLL_SELECTOR, FOLLOW_THRESHOLD_PX } from '../contracts/dom'

/**
 * The chat area's DOM helpers: the three reads the ported chat interactions and
 * the conversation navigator make on the column itself. The literals they use
 * are the host contract's (src/contracts/dom.ts, D44); everything the skin
 * writes stays with the feature that writes it.
 */
/** The keys that scroll the viewport; the same set the host reads. */
export const SCROLL_KEYS = new Set(['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '])

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
