import { buildElement } from './dom'

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
  if (opts.side === 'right') {
    let x = rect.right + margin
    if (x + width > window.innerWidth - margin) {
      x = Math.max(margin, rect.left - margin - width)
    }
    const y = Math.min(Math.max(margin, rect.bottom - height), Math.max(margin, window.innerHeight - height - margin))
    return { x, y }
  }
  if (opts.side === 'above-left') {
    const left = Math.max(margin, Math.min(rect.left, window.innerWidth - width - margin))
    let top = rect.top - (opts.gap || 0) - height
    if (top < margin) top = Math.min(rect.bottom + (opts.gap || 0), Math.max(margin, window.innerHeight - height - margin))
    return { x: left, y: top }
  }
  const x = Math.max(margin, Math.min(rect.right - width, window.innerWidth - width - margin))
  let y = rect.top - (opts.gap || 0) - height
  if (y < margin) y = Math.min(rect.bottom + (opts.gap || 0), Math.max(margin, window.innerHeight - height - margin))
  return { x, y }
}

/**
 * Position a fixed-position popover relative to its trigger. `important`
 * switches to `style.setProperty(..., 'important')`, as the account popover
 * requires; the same-value guard skips a write that would only dirty layout.
 */
export function positionAnchoredPopover(trigger: Element, pop: HTMLElement, opts: AnchorOptions = {}) {
  const rect = trigger.getBoundingClientRect()
  const { x, y } = resolveAnchoredPosition(rect, pop.offsetWidth, pop.offsetHeight, opts)
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
export const popoverRegistry: { name: string, close: () => void }[] = []

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
 */
export function setMenuPopoverOpen(card: Element, open: boolean) {
  if (open) {
    card.setAttribute('data-open', 'true')
    card.setAttribute('role', 'menu')
  } else {
    card.setAttribute('data-open', 'false')
    card.removeAttribute('role')
  }
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
