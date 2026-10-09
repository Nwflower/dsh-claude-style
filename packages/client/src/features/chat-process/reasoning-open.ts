import { EXPANDED_ATTRIBUTE, RUNNING_STATE, THINK_ROW_SELECTOR } from '@dsh-claude-style/contracts/dom'
import { requestFrame } from '../../core/frame'

/**
 * Keep a running thinking row open (D56): dsh-better-display's reader shows the
 * reasoning as it is written, at a preview height with its own glide, and folds
 * it back once the thinking stops.
 *
 * The host renders every thinking row folded, and no preference exposes it, so
 * the row's own disclosure control is the lever — the same one the enhanced
 * tier's reasoning fold pulls. The row still belongs to the reader: a press or a
 * key inside it this phase leaves it alone for that phase, and a press that
 * changed nothing is not repeated.
 */

/** The phase a row was in when the reader last touched it. */
const touchedIn = new WeakMap<Element, string>()
/** The phase a row was in when the lane last pressed it, so a useless press is not retried. */
const attemptedIn = new WeakMap<Element, string>()
/** Set while the lane is pressing, so the reader's own press is told apart. */
let pressing = false

/** The control of one expandable row: the whole row when it is the button, else its chevron. */
function controlOf(row: Element): HTMLElement | null {
  const control = row.querySelector('[role="button"], button')
  return control instanceof HTMLElement ? control : null
}

/** Bring one row to what its phase asks for: open while reasoning, folded once it stops. */
function settleRow(row: Element) {
  if (!row.isConnected) return
  const phase = row.getAttribute('data-state') ?? ''
  if (phase === '') return
  // The reader decided this row's state in this phase: leave it alone.
  if (touchedIn.get(row) === phase) return
  const wantsOpen = phase === RUNNING_STATE
  if (row.hasAttribute(EXPANDED_ATTRIBUTE) === wantsOpen) return
  if (attemptedIn.get(row) === phase) return
  attemptedIn.set(row, phase)
  const control = controlOf(row)
  if (control === null) return
  const scroller = control.closest<HTMLElement>('[data-conversation-scroll]')
  const scrollTop = scroller === null ? null : scroller.scrollTop
  const atEnd = scroller !== null
    && scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight <= 25
  const previousFocus = document.activeElement
  pressing = true
  try {
    control.click()
  } finally {
    pressing = false
  }
  if (scroller !== null && scrollTop !== null && scroller.scrollTop !== scrollTop) {
    scroller.scrollTop = atEnd ? scroller.scrollHeight : scrollTop
  }
  if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus({ preventScroll: true })
  if (document.activeElement === control) control.blur()
}

/**
 * One pass: bring every thinking row on the page to what its phase asks for.
 *
 * A row whose phase changed since the last pass is settled on the next frame,
 * so a row the host has just mounted is measured after it stands.
 */
export function syncReasoningOpen() {
  const rows = [...document.querySelectorAll(THINK_ROW_SELECTOR)]
  if (rows.length === 0) return
  requestFrame({
    write() {
      for (const row of rows) settleRow(row)
    },
  })
}

/** Record that the reader, and not the lane, decided a row's state. */
function rememberReaderPress(event: Event) {
  if (pressing) return
  const target = event.target
  if (!(target instanceof Element)) return
  const row = target.closest(THINK_ROW_SELECTOR)
  if (row === null) return
  touchedIn.set(row, row.getAttribute('data-state') ?? '')
}

/** Watch the reader's own presses on a thinking row. */
export function startReasoningOpen() {
  document.addEventListener('click', rememberReaderPress, true)
  document.addEventListener('keydown', rememberReaderPress, true)
  return () => {
    document.removeEventListener('click', rememberReaderPress, true)
    document.removeEventListener('keydown', rememberReaderPress, true)
  }
}
