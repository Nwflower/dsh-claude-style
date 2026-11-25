/**
 * Claude's More menu opens beside its launcher, top edges level; the host's Menu
 * only places a card under its anchor, start-aligned, and the sidebar passes no
 * side. The host keeps writing that place as `left`/`top` on the card, so the
 * skin leaves both alone and carries the card the rest of the way with
 * `translate`, read from the shift properties below (sidebar-entries.css).
 */

import { observeSize, subscribeMutations } from '@dsh-claude-style/engine/bus'
import { cacheFirstMatch } from '@dsh-claude-style/engine/host'

/** The More launcher while its menu is open: the one panel row that opens a menu. */
const OPEN_LAUNCHER_SELECTOR = 'nav[data-dsh-claude-part~="panel-list"] button[data-dsh-claude-part~="panel-row"][aria-haspopup="menu"][aria-expanded="true"]'
const SHIFT_X = '--dsh-claude-more-shift-x'
const SHIFT_Y = '--dsh-claude-more-shift-y'
/** The air between launcher and card, and the card's distance from the window edge: the host Menu's own gap and margin. */
const GAP_PX = 4
const MARGIN_PX = 12

/** A card's placement beside the launcher, its two phases kept apart for the scheduler. */
export interface LauncherPlacement {
  /** The pass's read phase: the launcher's box, the card's size and the host's place. */
  measure(): void
  /** The pass's write phase: the two shift properties, written only on a change. */
  place(): void
  /** Stop following the card and take both shift properties off it. */
  release(): void
}

/** Keep an open More card beside its launcher until the card leaves; returns the release. */
export function placeBesideLauncher(card: HTMLElement, requestPass: () => void): LauncherPlacement {
  // The seat belongs to this one card, which is the only reader of the open
  // launcher: the shared body watch invalidates it between batches, and a new
  // card opens its own seat rather than inheriting a stale answer.
  const openLauncher = cacheFirstMatch<HTMLElement>(OPEN_LAUNCHER_SELECTOR)
  let shiftX = ''
  let shiftY = ''
  /** The shifts the last read resolved, or null while there is nothing to write. */
  let measured: { x: string, y: string } | null = null

  function write(x: string, y: string) {
    if (x === shiftX && y === shiftY) return
    shiftX = x
    shiftY = y
    card.style.setProperty(SHIFT_X, x)
    card.style.setProperty(SHIFT_Y, y)
  }

  /** The shift from where the host put the card to where Claude's would stand, inside the window's margin. */
  function measure() {
    const launcher = openLauncher()
    const hostLeft = parseFloat(card.style.left)
    const hostTop = parseFloat(card.style.top)
    // Before the host's first measure the card carries no place, and it is not painted yet.
    if (launcher === null || Number.isNaN(hostLeft) || Number.isNaN(hostTop)) {
      measured = { x: '0px', y: '0px' }
      return
    }
    const anchor = launcher.getBoundingClientRect()
    const root = card.ownerDocument.documentElement
    const left = Math.max(MARGIN_PX, Math.min(anchor.right + GAP_PX, root.clientWidth - MARGIN_PX - card.offsetWidth))
    const top = Math.max(MARGIN_PX, Math.min(anchor.top, root.clientHeight - MARGIN_PX - card.offsetHeight))
    measured = { x: `${left - hostLeft}px`, y: `${top - hostTop}px` }
  }

  function place() {
    if (measured === null) return
    write(measured.x, measured.y)
  }

  // The host re-places the card on scroll, resize and anchor motion by rewriting
  // its style, and the card's own size moves the clamp. Neither callback writes
  // here: each asks for a scheduler pass, whose read phase measures and whose
  // write phase places (D40). The shift is written on that same style, so
  // `write` skips an unchanged value and the style watch settles after one round.
  const stopStyle = subscribeMutations(card, { attributes: true, attributeFilter: ['style'] }, requestPass)
  const stopSize = observeSize(card, requestPass)

  // The card is mounted in a layout effect before its first paint, so the first
  // placement runs here rather than waiting a frame, which would paint the host's
  // own place for one frame (D40's read-then-write order, not a write-then-read).
  measure()
  place()

  return {
    measure,
    place,
    release() {
      stopStyle()
      stopSize()
      measured = null
      shiftX = ''
      shiftY = ''
      card.style.removeProperty(SHIFT_X)
      card.style.removeProperty(SHIFT_Y)
    },
  }
}
