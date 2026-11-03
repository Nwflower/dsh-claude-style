import { CHAT_FLOW_SELECTOR, CONVERSATION_SCROLL_SELECTOR, FLOW_KIND_ATTRIBUTE, MESSAGE_BUBBLE_SELECTOR, SUBMISSION_ECHO_SELECTOR, USER_ROW_KIND } from '@dsh-claude-style/contracts/dom'
import { resolveColour } from './colour'

/**
 * The chat area's DOM helpers: the column and the session's scroll container, the
 * scrollbar strip, the host's own follow button, and the reads the chat's
 * features make on a submitted message — the row selectors, the bubble a row
 * paints, and the colours a fill is decided by. The literals they use are the
 * host contract's (packages/contracts/src/dom.ts, D3); everything the skin writes
 * stays with the feature that writes it.
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
 * Whether a pointer event landed on a container's own scrollbar strip.
 *
 * The one intent with no event of its own: a drag of the bar is a pointer
 * event, so the scroll owner (packages/engine/src/scroll-owner.ts) tells the
 * strip from the content by the node the event was addressed to and the
 * geometry the browser leaves beside `clientWidth`. False on an overlay
 * scrollbar, which takes no room: there the pointer is over the content, and
 * the content is not the bar.
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

/**
 * The two faces of one submitted message: the settled user row, and the echo
 * the host mounts in its place before that row arrives. Their marks sit a level
 * apart, so each is asked for on its own.
 */
export const CHAT_USER_ROW_SELECTOR = `${CHAT_FLOW_SELECTOR} [${FLOW_KIND_ATTRIBUTE}="${USER_ROW_KIND}"]`
export const SUBMISSION_ROW_SELECTOR = `[${FLOW_KIND_ATTRIBUTE}="${USER_ROW_KIND}"], ${SUBMISSION_ECHO_SELECTOR}`
/** Both faces inside the chat column, asked in one query. */
export const CHAT_ROW_SELECTOR = `${CHAT_USER_ROW_SELECTOR}, ${SUBMISSION_ECHO_SELECTOR}`

/**
 * A computed colour's channels, or null when the page paints nothing with it.
 *
 * The host's own rules state a fill as `rgb()`, while a card's token and a
 * reader's custom palette reach the page as a literal or as a relative colour
 * (D30), which no pattern over the written form reads: the painted pixel is the
 * one reading that covers them all. The `rgb()` fast path keeps the ordinary
 * case off the canvas.
 */
export function colorParts(color: string) {
  const match = /^rgba?\(([^)]+)\)$/.exec(color.trim())
  if (match !== null) {
    const raw = match[1]
    if (raw === undefined) return null
    const parts = raw.split(',').map(part => Number.parseFloat(part))
    if (parts.length < 3 || parts.some(part => !Number.isFinite(part))) return null
    return parts
  }
  const painted = resolveColour(color)
  return painted === null ? null : [painted.red, painted.green, painted.blue, painted.alpha]
}

/** How opaque a computed colour is. An unreadable one counts as 0: an unknown colour is never taken for a fill. */
export function colorAlpha(color: string) {
  const parts = colorParts(color)
  if (parts === null) return 0
  return parts[3] ?? 1
}

/**
 * The element inside a user row that really paints a fill, which is the bubble.
 *
 * The host marks the bubble itself, so the mark is what the walk starts from:
 * the host writes it on the bubble of a message the reader sent, and on no
 * other part of the row. A host build that writes no mark is read the way it
 * was read before: the depth cannot be assumed, since the echo row is the
 * bubble's own row (the echo mark sits on it) while the real row has a
 * flow-block wrapper around it, so the two differ by a level. The walk goes
 * down level by level and takes the first element that paints a fill;
 * attachment rows and quote summaries paint none and are skipped.
 *
 * @param row - a settled user row, or the echo row standing in for one.
 * @returns the bubble, or null where the row paints no fill of its own.
 */
export function userBubble(row: Element) {
  const marked = row.querySelector<HTMLElement>(MESSAGE_BUBBLE_SELECTOR)
  if (marked !== null) return marked
  const queue = Array.from(row.children)
  while (queue.length > 0) {
    const node = queue.shift()
    if (node === undefined) break
    if (node instanceof HTMLElement && colorAlpha(window.getComputedStyle(node).backgroundColor) > 0) return node
    for (const child of node.children) queue.push(child)
  }
  return null
}
