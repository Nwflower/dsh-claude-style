import { buildElement, setAttributeIfChanged } from '@dsh-claude-style/engine/dom'
import { inPageBox, pageViewport } from './page-zoom'

/** Features register closers and close siblings before opening; nested levels share one registration.
 * Replacement by name drops stale reload closures, and teardown must unregister.
 */

export const POPOVER_MARGIN = 8

/** Where an anchored popover goes (resolveAnchoredPosition). */
export interface AnchorOptions {
  side?: 'right' | 'above' | 'above-left'
  /** Distance kept from the viewport's edges; POPOVER_MARGIN when unset. */
  margin?: number
  /** Distance between the trigger and the card. */
  gap?: number
  /** Write the position with `!important` (positionAnchoredPopover). */
  important?: boolean
  /**
   * The window's size in the space the box and the card's laid-out size are
   * given in (anchorSpace). Absent reads the window's own.
   */
  viewport?: { width: number, height: number }
}

/** The trigger's box and the window's size, both in the pixels a card's `left` and `top` are read in. */
export interface AnchorSpace {
  rect: DOMRect
  viewport: { width: number, height: number }
}

/** DOMRects and written card coordinates use different spaces under page zoom. */
export function anchorSpace(trigger: Element): AnchorSpace {
  return { rect: inPageBox(trigger.getBoundingClientRect()), viewport: pageViewport() }
}

/**
 * The viewport coordinates of a popover anchored to a trigger's box:
 * `'right'` bottom-aligns to the trigger's right (the account popover),
 * `'above'` right-aligns and opens over it, `'above-left'` matches left edges
 * (the permission menu). The hero menu resolves through this too but writes
 * the answer into custom properties, because the host re-places that card
 * from its own geometry every frame.
 *
 * @param rect - the trigger's bounding box.
 * @param width - the popover's laid-out width.
 * @param height - the popover's laid-out height.
 */
export function resolveAnchoredPosition(rect: DOMRect, width: number, height: number, opts: AnchorOptions = {}) {
  const margin = opts.margin || POPOVER_MARGIN
  const viewport = opts.viewport === undefined ? { width: window.innerWidth, height: window.innerHeight } : opts.viewport
  if (opts.side === 'right') {
    let x = rect.right + margin
    if (x + width > viewport.width - margin) {
      x = Math.max(margin, rect.left - margin - width)
    }
    const y = Math.min(Math.max(margin, rect.bottom - height), Math.max(margin, viewport.height - height - margin))
    return { x, y }
  }
  const y = topOverTrigger(rect, height, opts.gap || 0, margin, viewport.height)
  if (opts.side === 'above-left') return { x: Math.max(margin, Math.min(rect.left, viewport.width - width - margin)), y }
  return { x: Math.max(margin, Math.min(rect.right - width, viewport.width - width - margin)), y }
}

/**
 * A resolved position held inside the window, in the space the position is
 * written in: a card laid out taller than the room beside its trigger still
 * starts at the top of the window instead of running off its bottom edge.
 * `anchorSpace`'s viewport is the window in the page's pixels, which is the
 * space a card's `left` and `top` are read in (shared/page-zoom.ts).
 */
export function clampToViewport(
  position: { x: number, y: number },
  width: number,
  height: number,
  viewport: { width: number, height: number } = pageViewport(),
  margin = POPOVER_MARGIN,
) {
  return {
    x: Math.max(margin, Math.min(position.x, viewport.width - width - margin)),
    y: Math.max(margin, Math.min(position.y, viewport.height - height - margin)),
  }
}

/**
 * The top of a card that opens over its trigger: above it while it fits there,
 * below it while it fits there instead, and otherwise held against the window's
 * edge on the side with more room. A card that fits neither way covers the
 * trigger by the least it can; flipping it below a trigger at the window's
 * bottom would pin it to that edge, straight over the row it opened from.
 */
function topOverTrigger(rect: DOMRect, height: number, gap: number, margin: number, viewportHeight: number) {
  const above = rect.top - gap - height
  if (above >= margin) return above
  const below = rect.bottom + gap
  if (below + height <= viewportHeight - margin) return below
  const roomAbove = rect.top - gap - margin
  const roomBelow = viewportHeight - margin - below
  return roomAbove >= roomBelow ? margin : Math.max(margin, viewportHeight - height - margin)
}

/**
 * Position a fixed-position popover relative to its trigger. `important`
 * switches to `style.setProperty(..., 'important')`, as the account popover
 * requires; the same-value guard skips a write that would only dirty layout.
 */
export function positionAnchoredPopover(trigger: Element, pop: HTMLElement, opts: AnchorOptions = {}) {
  const space = anchorSpace(trigger)
  const anchored = resolveAnchoredPosition(space.rect, pop.offsetWidth, pop.offsetHeight, { ...opts, viewport: space.viewport })
  const { x, y } = clampToViewport(anchored, pop.offsetWidth, pop.offsetHeight, space.viewport, opts.margin || POPOVER_MARGIN)
  const leftValue = `${Math.round(x)}px`
  const topValue = `${Math.round(y)}px`
  if (opts.important) {
    if (pop.style.left !== leftValue) pop.style.setProperty('left', leftValue, 'important')
    if (pop.style.top !== topValue) pop.style.setProperty('top', topValue, 'important')
  } else {
    if (pop.style.left !== leftValue) pop.style.left = leftValue
    if (pop.style.top !== topValue) pop.style.top = topValue
  }
  return { x, y }
}

/** The check mark a chosen row draws: one string, since every picker shares the slot. */
export const POPOVER_CHECK_SVG = '<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8.5l3.2 3.2L13 5"/></svg>'

/**
 * Hover dwell before a popover unfolds, and grace before it closes: 100ms is
 * what a pointer crossing a 28px trigger at an ordinary pace needs to clear
 * it, while a parked pointer opens at once; the grace lets the pointer travel
 * the gap between a trigger and its card.
 */
export const POPOVER_OPEN_DELAY = 100
export const POPOVER_CLOSE_DELAY = 100

/**
 * Whether a press on a popover's trigger leaves it open.
 *
 * Under a hover preference the trigger unfolded its card on the dwell, and the
 * pointer is on the trigger that just opened it: the press is the reader's hand
 * already there, not a second decision, so it does not fold the card — leaving
 * the trigger and the card is what closes it. With hover off the press is the
 * only way in and therefore the only way out, and the answer is false.
 *
 * The caller owns `hovered` because the preference's scope is its own: the
 * account row answers to the `account` scope and every other picker to `all`.
 * It is read at press time, so a preference changed while the card is up
 * reaches the next press.
 */
export function pressKeepsPopoverOpen(hovered: boolean, open: boolean) {
  return hovered && open
}

/**
 * A press this skin makes itself, on a trigger whose press a guard would
 * otherwise hold back (pressKeepsPopoverOpen).
 *
 * Closing a HOST-owned menu means pressing its trigger, and that press is
 * indistinguishable from the reader's at the trigger. Depth, not a boolean:
 * one close can fold a sibling, and the inner press must not clear the outer
 * one's mark.
 */
let programmaticPressDepth = 0

/** True while this skin is the one pressing a trigger. */
export function isProgrammaticPress() {
  return programmaticPressDepth > 0
}

/** Press a host trigger on this skin's own behalf (a close), marked as such. */
export function programmaticPress(trigger: HTMLElement) {
  programmaticPressDepth += 1
  try {
    trigger.click()
  } finally {
    programmaticPressDepth -= 1
  }
}

/**
 * Hover-intent helper shared by every skin popover. BOTH sides are scheduled:
 * `scheduleOpen` waits out the dwell, `scheduleClose` the grace, and `cancel`
 * clears whichever is pending (a leave needs only the one call, since
 * `scheduleClose` drops a pending open as well).
 */
export function createHoverIntent(open: () => void, close: () => void, openDelay: number, closeDelay: number) {
  let openTimer: ReturnType<typeof setTimeout> | null = null
  let closeTimer: ReturnType<typeof setTimeout> | null = null
  return {
    cancel() {
      if (openTimer) {
        clearTimeout(openTimer)
        openTimer = null
      }
      if (closeTimer) {
        clearTimeout(closeTimer)
        closeTimer = null
      }
    },
    scheduleOpen() {
      if (closeTimer) {
        clearTimeout(closeTimer)
        closeTimer = null
      }
      if (openTimer) clearTimeout(openTimer)
      openTimer = setTimeout(() => {
        openTimer = null
        open()
      }, openDelay)
    },
    scheduleClose() {
      if (openTimer) {
        clearTimeout(openTimer)
        openTimer = null
      }
      if (closeTimer) clearTimeout(closeTimer)
      closeTimer = setTimeout(() => {
        closeTimer = null
        close()
      }, closeDelay)
    },
  }
}

/**
 * The skin's popovers, one entry per popover. A picker whose second level is
 * its own card registers once, so opening that level does not fold the first.
 * An entry carries only the close path, and every closer is a no-op while its
 * popover is down, so the registry never holds "who is open".
 */
const popoverRegistry: { name: string, close: () => void }[] = []

/**
 * Register (or replace) one popover's closer. Replacing by name is what makes
 * a client reload safe: the previous generation's closer points at a scope
 * that is gone.
 */
export function registerPopover(name: string, close: () => void) {
  for (let i = 0; i < popoverRegistry.length; i++) {
    if (popoverRegistry[i].name === name) {
      popoverRegistry[i].close = close
      return
    }
  }
  popoverRegistry.push({ name, close })
}

/** Drop one popover's entry when its feature is torn down. */
export function unregisterPopover(name: string) {
  for (let i = 0; i < popoverRegistry.length; i++) {
    if (popoverRegistry[i].name === name) {
      popoverRegistry.splice(i, 1)
      return
    }
  }
}

/** Close every registered popover except the one named, so two cards never share the screen. */
export function closeOtherPopovers(name: string) {
  for (let i = 0; i < popoverRegistry.length; i++) {
    if (popoverRegistry[i].name === name) continue
    popoverRegistry[i].close()
  }
}

/**
 * Write one menu card's open state together with the role that says the same
 * thing to the host: the host's keyboard arbitration reads every present
 * `[role="menu"]` as owning the foreground, and a card kept mounted for
 * measurement answers that query while merely hidden — so the role rides the
 * open state. Only a card that IS a menu goes through here.
 *
 * The trigger's own `aria-expanded` is written here too where the caller names
 * one: the card and the control that opens it have to report the same state,
 * and a card toggled without it leaves the reader told "collapsed" while the
 * menu is up.
 */
export function setMenuPopoverOpen(card: Element, open: boolean, trigger: Element | null = null) {
  if (open) {
    card.setAttribute('data-open', 'true')
    card.setAttribute('role', 'menu')
  } else {
    card.setAttribute('data-open', 'false')
    card.removeAttribute('role')
  }
  if (trigger !== null) setAttributeIfChanged(trigger, 'aria-expanded', open ? 'true' : 'false')
}

/** The slots and classes one popover row asks for (buildPopoverItem). */
export interface PopoverItemOptions {
  className?: string
  role?: string
  icon?: boolean
  lines?: 1 | 2
  textClass?: string
  badge?: boolean
  check?: boolean
}

/**
 * One row of a popover card: an optional icon, the text block that takes the
 * slack, an optional badge and an optional trailing mark; the look belongs to
 * shared/popover.css. `lines: 2` splits the text block into a title and a
 * quieter second line; `textClass` replaces the shared text class.
 *
 * @returns `{ row, icon, text, desc, badge, check }`; a slot the options did
 *   not ask for is null.
 */
export function buildPopoverItem(opts: PopoverItemOptions = {}) {
  const row = buildElement('button', opts.className ? `dsh-claude-popover-item ${opts.className}` : 'dsh-claude-popover-item')
  row.type = 'button'
  if (opts.role) row.setAttribute('role', opts.role)
  const icon = opts.icon ? buildElement('span', 'dsh-claude-popover-item-icon') : null
  if (icon !== null) row.appendChild(icon)
  let text: HTMLSpanElement
  let desc: HTMLSpanElement | null = null
  if (opts.lines === 2) {
    const col = buildElement('div', 'dsh-claude-popover-item-col')
    text = buildElement('span', 'dsh-claude-popover-item-text')
    desc = buildElement('span', 'dsh-claude-popover-item-desc')
    col.appendChild(text)
    col.appendChild(desc)
    row.appendChild(col)
  } else {
    text = buildElement('span', opts.textClass || 'dsh-claude-popover-item-text')
    row.appendChild(text)
  }
  const badge = opts.badge ? buildElement('span', 'dsh-claude-popover-item-badge') : null
  if (badge !== null) row.appendChild(badge)
  const check = opts.check ? buildElement('span', 'dsh-claude-popover-check') : null
  if (check !== null) row.appendChild(check)
  return { row, icon, text, desc, badge, check }
}

/**
 * Remove the skin's own nodes that no live reference holds: client HMR drops
 * the previous generation's disposals instead of running them, and a host
 * re-render can strand a copy in a container React replaced. Every node
 * matching `selector` under `scope` goes except the ones in `keep`.
 */
export function removeStrayNodes(scope: ParentNode, selector: string, keep: (Element | null)[]) {
  const nodes = scope.querySelectorAll(selector)
  for (let i = 0; i < nodes.length; i++) {
    if (keep.includes(nodes[i])) continue
    nodes[i].parentElement?.removeChild(nodes[i])
  }
}
