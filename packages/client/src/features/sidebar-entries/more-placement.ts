/**
 * Claude's More menu opens beside its launcher, top edges level; the host's Menu
 * only places a card under its anchor, start-aligned, and the sidebar passes no
 * side. The host keeps writing that place as `left`/`top` on the card, so the
 * skin leaves both alone and carries the card the rest of the way with
 * `translate`, read from the shift properties below (sidebar-entries.css).
 */

import { subscribeMutations } from '@dsh-claude-style/engine/bus'
import { cacheFirstMatch } from '@dsh-claude-style/engine/host'
import { createPhasedPlacement } from '../../shared/popover'
import type { PhasedPlacement } from '../../shared/popover'

/** The More launcher while its menu is open: the one panel row that opens a menu. */
const OPEN_LAUNCHER_SELECTOR = 'nav[data-dsh-claude-part~="panel-list"] button[data-dsh-claude-part~="panel-row"][aria-haspopup="menu"][aria-expanded="true"]'
const SHIFT_X = '--dsh-claude-more-shift-x'
const SHIFT_Y = '--dsh-claude-more-shift-y'
/** The air between launcher and card, and the card's distance from the window edge: the host Menu's own gap and margin. */
const GAP_PX = 4
const MARGIN_PX = 12

/** Keep an open More card beside its launcher until the card leaves; the release takes both shift properties off it. */
export function placeBesideLauncher(card: HTMLElement, requestPass: () => void): PhasedPlacement {
  // The seat belongs to this one card, which is the only reader of the open
  // launcher: the shared body watch invalidates it between batches, and a new
  // card opens its own seat rather than inheriting a stale answer.
  const openLauncher = cacheFirstMatch<HTMLElement>(OPEN_LAUNCHER_SELECTOR)
  let shiftX = ''
  let shiftY = ''

  /** The shift from where the host put the card to where Claude's would stand, inside the window's margin. */
  function read(): { x: string, y: string } {
    const launcher = openLauncher()
    const hostLeft = parseFloat(card.style.left)
    const hostTop = parseFloat(card.style.top)
    // Before the host's first measure the card carries no place, and it is not painted yet.
    if (launcher === null || Number.isNaN(hostLeft) || Number.isNaN(hostTop)) return { x: '0px', y: '0px' }
    const anchor = launcher.getBoundingClientRect()
    const root = card.ownerDocument.documentElement
    const left = Math.max(MARGIN_PX, Math.min(anchor.right + GAP_PX, root.clientWidth - MARGIN_PX - card.offsetWidth))
    const top = Math.max(MARGIN_PX, Math.min(anchor.top, root.clientHeight - MARGIN_PX - card.offsetHeight))
    return { x: `${left - hostLeft}px`, y: `${top - hostTop}px` }
  }

  function write(shift: { x: string, y: string }) {
    if (shift.x === shiftX && shift.y === shiftY) return
    shiftX = shift.x
    shiftY = shift.y
    card.style.setProperty(SHIFT_X, shift.x)
    card.style.setProperty(SHIFT_Y, shift.y)
  }

  // The host re-places the card on scroll, resize and anchor motion by rewriting
  // its style, and the card's own size moves the clamp. Neither callback writes
  // here: each asks for a scheduler pass, whose read phase measures and whose
  // write phase places (D40). The shift is written on that same style, so
  // `write` skips an unchanged value and the style watch settles after one round.
  const stopStyle = subscribeMutations(card, { attributes: true, attributeFilter: ['style'] }, requestPass)
  const placement = createPhasedPlacement(card, { read, write, requestPass })

  return {
    measure: placement.measure,
    place: placement.place,
    release() {
      stopStyle()
      placement.release()
      shiftX = ''
      shiftY = ''
      card.style.removeProperty(SHIFT_X)
      card.style.removeProperty(SHIFT_Y)
    },
  }
}
