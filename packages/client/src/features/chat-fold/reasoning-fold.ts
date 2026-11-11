import { subscribeMutations } from '@dsh-claude-style/engine/bus'
import { requestFrame } from '@dsh-claude-style/engine/frame'
import { beginChatFoldToggle, endChatFoldToggle, isChatFoldToggle, subscribeFoldReaderEvents } from './fold-toggle'
import type { FoldPressReading } from './fold-toggle'
import { composerComposing } from '../../shared/composer-caret'
import { foldControlAt, foldControlAtBottom, foldExpandedBody } from './fold-glide-parts'
import { inPagePixels } from '../../shared/page-zoom'
import { EXPANDED_ATTRIBUTE, ROW_PHASE_ATTRIBUTE, RUNNING_STATE, THINK_ROW_SELECTOR } from '@dsh-claude-style/contracts/dom'

/* Host ReasoningRow starts collapsed; data-state and data-expanded are its stable phase contract.
   Reader overrides last only for the current phase. onRows shares each scan with the reasoning
   window so both features observe the same batch. */
export function createReasoningFold(onRows?: (rows: readonly Element[]) => void) {
  /** The phase a row was in when the reader last touched it. */
  const touchedIn = new WeakMap<Element, string>()
  /** The phase a row was in when it was last toggled, so a press that changed nothing is not retried. */
  const attemptedIn = new WeakMap<Element, string>()
  /** Whether a scan is already queued. */
  let scanQueued = false
  /** The rows this batch of mutations touched. */
  const touchedRows = new Set<Element>()

  /** The phase a row has to be pressed for, or null when it stays as it is. */
  const phaseToPress = (row: Element) => {
    // A frame sits between collecting and settling, and the row may be
    // gone by then — clicking an element outside the document does nothing.
    if (!row.isConnected) return null
    const phase = row.getAttribute(ROW_PHASE_ATTRIBUTE) ?? ''
    if (phase === '') return null
    // The reader has decided this row's state in this phase: leave it.
    if (touchedIn.get(row) === phase) return null
    if (row.hasAttribute(EXPANDED_ATTRIBUTE) === (phase === RUNNING_STATE)) return null
    // A press that changed nothing will not change anything next time either.
    if (attemptedIn.get(row) === phase) return null
    return phase
  }

  const controlOf = (row: Element) => {
    const control = row.querySelector('[role="button"], button')
    return control instanceof HTMLElement ? control : null
  }

  /** Read before the write phase presses rows (D40). */
  const readPress = (rows: Iterable<Element>): FoldPressReading | null => {
    const heights = new Map<Element, number>()
    let atBottom: boolean | null = null
    for (const row of rows) {
      if (phaseToPress(row) === null) continue
      const pressed = controlOf(row)
      const control = pressed === null ? null : foldControlAt(pressed)
      if (control === null) continue
      if (atBottom === null) atBottom = foldControlAtBottom(control)
      const body = foldExpandedBody(control)
      if (body !== null) heights.set(body, inPagePixels(body.getBoundingClientRect().height))
    }
    return atBottom === null ? null : { atBottom, heights }
  }

  /** The host may make either the whole row or its chevron the control. */
  const syncRows = (rows: Iterable<Element>, reading: FoldPressReading | null = null) => {
    for (const row of rows) {
      const phase = phaseToPress(row)
      if (phase === null) continue
      // The reader is part-way through an input-method composition: the press
      // below runs the host's handler, which focuses the control, and a focus
      // moved under an uncommitted composition makes the browser drop the
      // letters typed so far. Left unrecorded, so the row is settled after the
      // composition has landed.
      if (composerComposing()) continue
      attemptedIn.set(row, phase)
      const control = controlOf(row)
      if (control === null) continue
      // The capture listener below sees this same click, so the press has to
      // be declared: it is not the reader asking. The token reveal's own fold
      // guard reads it in the same turn, or the automatic fold would silence
      // the text that just started streaming for 400 ms.
      beginChatFoldToggle(reading)
      try {
        control.click()
      } finally {
        endChatFoldToggle()
      }
    }
  }

  /** Settle every row already on the page once, right after install. */
  const syncEveryRow = () => {
    const rows = [...document.querySelectorAll(THINK_ROW_SELECTOR)]
    onRows?.(rows)
    syncRows(rows)
  }

  /** Record that the reader, and not this module, just decided a row's state. */
  const rememberReaderTouched = (event: Event) => {
    if (isChatFoldToggle()) return
    const target = event.target
    if (!(target instanceof Element)) return
    const row = target.closest(THINK_ROW_SELECTOR)
    if (row === null) return
    touchedIn.set(row, row.getAttribute(ROW_PHASE_ATTRIBUTE) ?? '')
  }

  // Streaming changes the DOM far faster than this needs to run, so one scan
  // a frame at most.
  const onRecords = (records: MutationRecord[]) => {
    const known = touchedRows.size
    for (const record of records) {
      // Both paths matter. record.target is the node the change happened on —
      // the row itself or something inside it for an attribute, the parent
      // container for a child list — and an ancestor walk finds the row from
      // either. addedNodes covers a row that just arrived, which brings
      // itself.
      const target = record.target
      if (target instanceof Element) {
        const row = target.closest(THINK_ROW_SELECTOR)
        if (row !== null) touchedRows.add(row)
      }
      for (const node of record.addedNodes) {
        if (!(node instanceof HTMLElement)) continue
        if (node.matches(THINK_ROW_SELECTOR)) touchedRows.add(node)
        for (const row of node.querySelectorAll(THINK_ROW_SELECTOR)) touchedRows.add(row)
      }
    }
    // A change with no thinking row in it (a tool row turning over, the plugin
    // page repainting) is not worth a frame.
    if (touchedRows.size === known) return
    if (scanQueued) return
    scanQueued = true
    // The scan folds each row open or shut in the write phase, with what the
    // glide reads on a press taken in the read phase (D40).
    let reading: FoldPressReading | null = null
    requestFrame({
      read() {
        reading = readPress(touchedRows)
      },
      write() {
        scanQueued = false
        const rows = [...touchedRows]
        touchedRows.clear()
        onRows?.(rows)
        syncRows(rows, reading)
      },
    })
  }
  /** Composition may have suppressed the final scan; settle again when it ends. */
  const onCompositionEnd = () => {
    requestFrame({ write() { syncEveryRow() } })
  }
  const stopMutations = subscribeMutations(document.body, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: [ROW_PHASE_ATTRIBUTE, EXPANDED_ATTRIBUTE],
  }, onRecords)
  const stopReaderEvents = subscribeFoldReaderEvents(rememberReaderTouched, onCompositionEnd)
  syncEveryRow()

  return () => {
    stopMutations()
    stopReaderEvents()
  }
}
