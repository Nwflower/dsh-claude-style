/**
 * Claude's More menu opens beside its launcher, top edges level; the host's Menu
 * only places a card under its anchor, start-aligned, and the sidebar passes no
 * side. The host keeps writing that place as `left`/`top` on the card, so the
 * skin leaves both alone and carries the card the rest of the way with
 * `translate`, read from the shift properties below (sidebar-entries.css).
 */

/** The More launcher while its menu is open: the one panel row that opens a menu. */
const OPEN_LAUNCHER_SELECTOR = 'nav[data-dsh-claude-part~="panel-list"] button[data-dsh-claude-part~="panel-row"][aria-haspopup="menu"][aria-expanded="true"]'
const SHIFT_X = '--dsh-claude-more-shift-x'
const SHIFT_Y = '--dsh-claude-more-shift-y'
/** The air between launcher and card, and the card's distance from the window edge: the host Menu's own gap and margin. */
const GAP_PX = 4
const MARGIN_PX = 12

/** Keep an open More card beside its launcher until the card leaves; returns the release. */
export function placeBesideLauncher(card: HTMLElement) {
  const view = card.ownerDocument.defaultView!
  let shiftX = ''
  let shiftY = ''

  function write(x: string, y: string) {
    if (x === shiftX && y === shiftY) return
    shiftX = x
    shiftY = y
    card.style.setProperty(SHIFT_X, x)
    card.style.setProperty(SHIFT_Y, y)
  }

  /** The shift from where the host put the card to where Claude's would stand, inside the window's margin. */
  function place() {
    const launcher = card.ownerDocument.querySelector(OPEN_LAUNCHER_SELECTOR)
    const hostLeft = parseFloat(card.style.left)
    const hostTop = parseFloat(card.style.top)
    // Before the host's first measure the card carries no place, and it is not painted yet.
    if (launcher === null || Number.isNaN(hostLeft) || Number.isNaN(hostTop)) {
      write('0px', '0px')
      return
    }
    const anchor = launcher.getBoundingClientRect()
    const root = card.ownerDocument.documentElement
    const left = Math.max(MARGIN_PX, Math.min(anchor.right + GAP_PX, root.clientWidth - MARGIN_PX - card.offsetWidth))
    const top = Math.max(MARGIN_PX, Math.min(anchor.top, root.clientHeight - MARGIN_PX - card.offsetHeight))
    write(`${left - hostLeft}px`, `${top - hostTop}px`)
  }

  // The host re-places the card on scroll, resize and anchor motion by rewriting
  // its style, and the card's own size moves the clamp; the shift follows both.
  // The shift is written on that same style, so `write` skips an unchanged value
  // and the observer settles after one round.
  const styleWatch = new MutationObserver(place)
  styleWatch.observe(card, { attributes: true, attributeFilter: ['style'] })
  const sizeWatch = new ResizeObserver(place)
  sizeWatch.observe(card)
  view.addEventListener('resize', place)
  place()

  return () => {
    styleWatch.disconnect()
    sizeWatch.disconnect()
    view.removeEventListener('resize', place)
    card.style.removeProperty(SHIFT_X)
    card.style.removeProperty(SHIFT_Y)
  }
}
