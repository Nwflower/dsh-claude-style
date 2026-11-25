import { ACCOUNT_HOST_ROW_ATTR, FOOTER_SEAT_ATTR } from '../../constants'

/**
 * The footer entries the skin keeps in the sidebar (constants.ts, FOOTER_SEATS):
 * the update control among them. The takeover hides a footer entry and rebuilds
 * it as a row of the account popover; an entry with a seat stays where the
 * plugin put it in the reader's eyes instead — the plugin's own node stays in
 * its slot and this module stands a copy of it inside the account row, so the
 * plugin keeps its own markup, icon, label, progress and click behaviour, and
 * the skin only gives it a place in the row.
 *
 * The copy is rebuilt when the plugin's markup changes and forwards every
 * press to the live entry: the plugin's handlers are bound to its own node, so
 * the copy never owns state of its own.
 */

/** The mark on the copy this module draws (stylesheets, surface.json). */
export const SEAT_COPY_ATTR = 'data-dsh-claude-footer-seat-copy'

/** The row a seated entry stands in: the skin's own button, or the host's row it repaints. */
const ENTRY_ROW_SELECTOR = `.dsh-claude-account-btn, [${ACCOUNT_HOST_ROW_ATTR}]`

/** The marks the copy must not carry: the seat and hidden marks belong to the live entry. */
const SKIN_MARKS = [
  'data-dsh-claude-footer-entry',
  'data-dsh-claude-footer-hidden',
  'data-dsh-claude-footer-overlay',
  FOOTER_SEAT_ATTR,
  SEAT_COPY_ATTR,
]

export function createFooterSeats() {
  /** One copy per seat, the node this module wrote and the entry it reads. */
  const copies = new Map<string, { node: HTMLElement, entry: Element, html: string }>()

  /** The row a seated entry stands in, or null while the row is not mounted. */
  function entryRow(footArea: Element) {
    const row = footArea.querySelector(ENTRY_ROW_SELECTOR)
    return row instanceof HTMLElement ? row : null
  }

  /** The live entries wearing a seat, by seat name. */
  function seatedEntries(footArea: Element) {
    const found = new Map<string, Element>()
    const seated = footArea.querySelectorAll(`[${FOOTER_SEAT_ATTR}]`)
    for (let i = 0; i < seated.length; i++) {
      const seat = seated[i].getAttribute(FOOTER_SEAT_ATTR)
      if (seat !== null && !found.has(seat)) found.set(seat, seated[i])
    }
    return found
  }

  /** A copy of one entry, standing in the row and pressing the entry behind it. */
  function buildCopy(seat: string) {
    const copy = document.createElement('span')
    copy.className = 'dsh-claude-footer-seat-copy'
    copy.setAttribute(SEAT_COPY_ATTR, seat)
    copy.addEventListener('click', (event) => {
      event.stopPropagation()
      const live = copies.get(seat)
      if (live === undefined) return
      // The plugin's handlers are bound to its own node, which sits hidden in
      // its slot; a programmatic press runs them exactly as a reader's would.
      if (live.entry instanceof HTMLElement) live.entry.click()
    })
    return copy
  }

  /**
   * Bring the copies in line with the entries behind them: stand a copy for a
   * new seat, refresh one whose plugin markup changed, and drop the copies of
   * seats that are gone or whose row left.
   */
  function sync(footArea: Element) {
    const row = entryRow(footArea)
    const seated = seatedEntries(footArea)
    for (const [seat, copy] of copies) {
      const entry = seated.get(seat)
      if (row === null || entry === undefined || !entry.isConnected) {
        copy.node.remove()
        copies.delete(seat)
      }
    }
    if (row === null) return
    for (const [seat, entry] of seated) {
      const html = entry.outerHTML
      const live = copies.get(seat)
      if (live === undefined) {
        const node = buildCopy(seat)
        row.appendChild(node)
        copies.set(seat, { node, entry, html: '' })
      }
      const copy = copies.get(seat)
      if (copy === undefined) continue
      copy.entry = entry
      if (copy.html === html) continue
      copy.html = html
      render(copy.node, entry)
    }
  }

  /** Draw the entry's own markup inside the copy, without the marks the takeover owns. */
  function render(node: HTMLElement, entry: Element) {
    while (node.firstChild) node.removeChild(node.firstChild)
    const drawn = entry.cloneNode(true)
    if (!(drawn instanceof HTMLElement)) return
    for (const mark of SKIN_MARKS) drawn.removeAttribute(mark)
    if (drawn.id !== '') drawn.removeAttribute('id')
    const inner = drawn.querySelectorAll('[id]')
    for (let i = 0; i < inner.length; i++) inner[i].removeAttribute('id')
    // The entry keeps its own look: the plugin's class names come with the
    // clone, and only the box it stands in is the skin's.
    node.appendChild(drawn)
  }

  /** Take every copy away, for a teardown or a switch to another footer. */
  function clear() {
    for (const [, copy] of copies) copy.node.remove()
    copies.clear()
  }

  return { sync, clear }
}
