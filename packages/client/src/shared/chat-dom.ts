import { CHAT_FLOW_SELECTOR, CONVERSATION_SCROLL_SELECTOR, FOLLOW_THRESHOLD_PX } from '@dsh-claude-style/contracts/dom'

/**
 * The chat area's DOM helpers: the three reads the ported chat interactions and
 * the conversation navigator make on the column itself. The literals they use
 * are the host contract's (packages/contracts/src/dom.ts, D44); everything the skin
 * writes stays with the feature that writes it.
 */
/** The keys that scroll the viewport; the same set the host reads. */
export const SCROLL_KEYS = new Set(['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '])

/**
 * The session's scroll container: the host hangs its follow and its fold
 * animation on it.
 *
 * Kept once it is read: every feature that writes a scroll position asks for it
 * on each frame of a stream, and a document query made after the host's own
 * write forces a style pass over the whole page (D9). A session switch replaces
 * the element, which detaches the one held here.
 */
let scroller: HTMLElement | null = null

export function conversationScroller() {
  if (scroller === null || !scroller.isConnected) scroller = document.querySelector<HTMLElement>(CONVERSATION_SCROLL_SELECTOR)
  return scroller
}

/**
 * The conversation's message column, kept the way the scroller is: the stream
 * glide asks for it on every frame it holds the position. A session switch
 * replaces the element, which detaches the one held here.
 */
let column: HTMLElement | null = null

export function conversationColumn() {
  if (column === null || !column.isConnected) column = document.querySelector<HTMLElement>(CHAT_FLOW_SELECTOR)
  return column
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
 * Whether a pointer event landed on a container's own scrollbar strip.
 *
 * The one intent with no event of its own: a drag of the bar is a pointer
 * event, so the scroll owner (shared/scroll-owner.ts) tells the strip from the
 * content by the node the event was addressed to and the geometry the browser
 * leaves beside `clientWidth`. False on an overlay scrollbar, which takes no
 * room: there the pointer is over the content, and the content is not the bar.
 *
 * @param container - the scrolling element whose strip is asked about.
 * @param event - the pointer event.
 * @param target - the node the event was addressed to (`event.target`).
 * @returns true when the pointer sits in the strip and not on the content.
 */
export function isScrollbarStrip(container: Element, event: PointerEvent, target: EventTarget | null) {
  if (target !== container) return false
  const box = container.getBoundingClientRect()
  return event.clientX >= box.left + container.clientWidth
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
  const root = (() => {
    const column = conversationColumn()
    if (column === null || column.parentElement === null) return null
    return column.parentElement.parentElement
  })()
  if (root === null || root.nextElementSibling === null) return null
  return root.nextElementSibling.querySelector('button')
}
