import { SESSION_ONGOING_SELECTOR, SESSION_ROW_SELECTOR } from '@dsh-claude-style/contracts/dom'
import { observeMatches, subscribeMutations } from '@dsh-claude-style/engine/bus'
import { requestFrame } from '@dsh-claude-style/engine/frame'

/**
 * The rows whose session is running, kept at the head of the list they stand in.
 *
 * The sidebar orders a group by the host's own rules — the New Session
 * placeholder, the pinned rows, then the rest by their last answer — and the
 * view store has no word for "running": the row's status dot carries it, the
 * order does not. The order a reader sees is the DOM's, so the order is written
 * there: the running rows stand first and each partition keeps its own order.
 * A list already standing that way is left untouched, which is also what keeps
 * a move from feeding the observer that asked for it.
 *
 * The row is not the element that moves. The host draws every row inside a box
 * of its own — one child per box — so the box is the row's seat in the list:
 * moving the row moves it from one single-child box to another, which changes
 * nothing on screen. The boxes are the seats, and the boxes are what the list
 * reorders; a box speaks for its row's phase.
 *
 * The placeholder's seat is the one position this feature changes: a running
 * row ahead of it is the point, and the placeholder keeps its place in front of
 * the waiting rows.
 */

export function install() {
  /** The frame the moves wait for; the rows move before that frame paints. */
  let cancelFrame: (() => void) | null = null

  /**
   * Does this box hold a running session: the host draws the running phase's
   * dot inside the row (a profile risk: it may draw it on the box instead).
   */
  const runs = (box: Element) =>
    box.matches(SESSION_ONGOING_SELECTOR) || box.querySelector(SESSION_ONGOING_SELECTOR) !== null

  /**
   * Stand the running rows of one list at its head, the waiting rows behind them.
   * @param boxes - the seats of one list, in the order the reader sees them.
   */
  const lift = (boxes: HTMLElement[]) => {
    const running = boxes.filter(runs)
    if (running.length === 0 || running.length === boxes.length) return
    const rest = boxes.filter((box) => !running.includes(box))
    const anchor = rest[0]
    const parent = anchor.parentElement
    if (parent === null) return
    // A list already standing first: every running seat is ahead of the first waiting one.
    if (boxes.slice(0, running.length).every((box) => running.includes(box))) return
    for (const box of running) parent.insertBefore(box, anchor)
  }

  /**
   * One pass over every list the sidebar draws, each list moved on its own.
   * A list is the parent of the rows' seats, not the rows' direct parent: the
   * seats are the boxes, and the boxes share the list.
   */
  const reorder = () => {
    const lists = new Map<Element, HTMLElement[]>()
    for (const row of rows.all()) {
      const box = row.parentElement
      const list = box === null ? null : box.parentElement
      if (box === null || list === null) continue
      const seats = lists.get(list)
      if (seats === undefined) lists.set(list, [box])
      else if (!seats.includes(box)) seats.push(box)
    }
    for (const seats of lists.values()) lift(seats)
  }

  const schedule = () => {
    if (cancelFrame !== null) return
    cancelFrame = requestFrame({
      write() {
        cancelFrame = null
        reorder()
      },
    })
  }

  /** Every session row the sidebar has, whichever list it stands in. */
  const rows = observeMatches<HTMLElement>(SESSION_ROW_SELECTOR, schedule)

  /**
   * The host re-renders a row's dot without replacing the row, and puts rows in
   * place again as answers arrive: both are child-list changes, and the phase
   * change is the one attribute the dot carries.
   */
  const stopRows = subscribeMutations(
    document.body,
    { childList: true, subtree: true, attributes: true, attributeFilter: ['data-state'] },
    schedule,
  )

  reorder()

  return () => {
    stopRows()
    if (cancelFrame !== null) cancelFrame()
    rows.release()
  }
}
