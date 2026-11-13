import { SESSION_ONGOING_SELECTOR, SESSION_ROW_SELECTOR } from '@dsh-claude-style/contracts/dom'
import { observeMatches, subscribeMutations } from '@dsh-claude-style/engine/bus'
import { requestFrame } from '@dsh-claude-style/engine/frame'
import { moveElementsIntoOrder, sessionSeatSegments } from '../../shared/element-order'

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
    const runningSet = new Set(running)
    const rest = boxes.filter((box) => !runningSet.has(box))
    moveElementsIntoOrder([...running, ...rest])
  }

  /**
   * One pass over every list the sidebar draws, each list moved on its own.
   * A list is the parent of the rows' seats, not the rows' direct parent: the
   * seats are the boxes, and the boxes share the list.
   *
   * The date grouping stands down here: it arranges the same seats by the day
   * they belong to, and a running row lifted to the very head of the list would
   * be put back under its own day section on the next pass — two features
   * rewriting one order, which the reader sees as the list twitching. What runs
   * right now is already said twice over: the bell's badge and its card, and the
   * 「优先级」block above the list.
   */
  const reorder = () => {
    if (document.body.hasAttribute('data-dsh-claude-date-groups')) return
    const seatsByList = new Map<Element, Map<Element, HTMLElement>>()
    for (const row of rows.all()) {
      const box = row.parentElement
      const list = box === null ? null : box.parentElement
      if (box === null || list === null) continue
      let known = seatsByList.get(list)
      if (known === undefined) {
        known = new Map()
        seatsByList.set(list, known)
      }
      known.set(box, box)
    }
    // A shared flat list is split at workspace headings, group headings and
    // dividers so a running session never crosses another section.
    for (const [list, known] of seatsByList) {
      for (const segment of sessionSeatSegments(list, known)) {
        if (segment.length > 1) lift(segment)
      }
    }
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
    (records) => {
      // Only a change inside a session row can move this order: a streamed
      // answer reaches the body on every frame, and re-reading every list for
      // it would put the whole sidebar on the conversation's clock. Rows the
      // host adds or removes are announced by the registry above.
      for (const record of records) {
        const target = record.target
        if (target instanceof Element && target.closest(SESSION_ROW_SELECTOR) !== null) {
          schedule()
          return
        }
      }
    },
  )

  reorder()

  return () => {
    stopRows()
    if (cancelFrame !== null) cancelFrame()
    rows.release()
  }
}
