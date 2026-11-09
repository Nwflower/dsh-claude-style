import { CHAT_FLOW_SELECTOR, CONVERSATION_SCROLL_SELECTOR, FLOW_KIND_ATTRIBUTE, MESSAGE_BUBBLE_SELECTOR, SUBMISSION_ECHO_SELECTOR, USER_ROW_KIND } from '@dsh-claude-style/contracts/dom'
import { resolveColour } from './colour'

/** Chat DOM helpers over host-owned literals (D3); skin-owned marks remain with their features. */
/** The keys that scroll the viewport; the same set the host reads. */
export const SCROLL_KEYS = new Set(['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '])

/** Cache the host scroller to avoid per-frame queries and forced style passes; detach on session replacement (D9). */
let scroller: HTMLElement | null = null

export function conversationScroller() {
  if (scroller === null || !scroller.isConnected) scroller = document.querySelector<HTMLElement>(CONVERSATION_SCROLL_SELECTOR)
  return scroller
}

/** Cache the column for stream frames; session replacement invalidates it through `isConnected`. */
let column: HTMLElement | null = null

export function conversationColumn() {
  if (column === null || !column.isConnected) column = document.querySelector<HTMLElement>(CHAT_FLOW_SELECTOR)
  return column
}

/**
 * Detect the classic scrollbar by event target and `clientWidth` geometry.
 * Overlay scrollbars occupy no strip and therefore return false.
 */
export function isScrollbarStrip(container: Element, event: PointerEvent, target: EventTarget | null) {
  if (target !== container) return false
  const box = container.getBoundingClientRect()
  return event.clientX >= box.left + container.clientWidth
}

/** Host follow-off button sits beside the column's grandparent frame; return null if that shape is absent. */
export function findFollowTailButton() {
  const root = (() => {
    const column = conversationColumn()
    if (column === null || column.parentElement === null) return null
    return column.parentElement.parentElement
  })()
  if (root === null || root.nextElementSibling === null) return null
  return root.nextElementSibling.querySelector('button')
}

/** Settled and optimistic echo rows carry marks at different depths and need separate selectors. */
export const CHAT_USER_ROW_SELECTOR = `${CHAT_FLOW_SELECTOR} [${FLOW_KIND_ATTRIBUTE}="${USER_ROW_KIND}"]`
export const SUBMISSION_ROW_SELECTOR = `[${FLOW_KIND_ATTRIBUTE}="${USER_ROW_KIND}"], ${SUBMISSION_ECHO_SELECTOR}`
/** Both faces inside the chat column, asked in one query. */
export const CHAT_ROW_SELECTOR = `${CHAT_USER_ROW_SELECTOR}, ${SUBMISSION_ECHO_SELECTOR}`

/** Parse ordinary `rgb()` directly; resolve other CSS colour forms through a painted pixel (D30). */
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
 * Prefer the host bubble mark. Without it, breadth-first descent finds the first painted element;
 * fixed depth is unsafe because echo and settled rows differ by a wrapper.
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
