import { subscribeMutations } from '../../core/bus'
import { requestFrame } from '../../core/frame'
import { beginChatFoldToggle, endChatFoldToggle, isChatFoldToggle } from './fold-toggle'
import { EXPANDED_ATTRIBUTE, ROW_PHASE_ATTRIBUTE, RUNNING_STATE, THINK_ROW_SELECTOR } from '@dsh-claude-style/contracts/dom'

/**
 * Keep a thinking row open while the model is still reasoning, and fold it
 * back once the reasoning stops.
 *
 * Every thinking row the host renders arrives collapsed: its ReasoningRow
 * pins it with a plain useState(false), and no setting exposes it. The row's
 * own expand control is the one lever this feature can pull, and at least
 * that lever is stable — the row carries data-variant="think", data-state
 * (running while the model reasons, ok once it stops) and data-expanded,
 * all semantic attributes rather than the hashed class names around them.
 *
 * The row still belongs to the reader. A press or a key inside it records
 * the phase it happened in, and this module leaves the row alone for that
 * phase: folded mid-reasoning it stays folded, and a stopped row opened by
 * hand stays open. The hand-over is deliberately per phase rather than per
 * row — folding and unfolding while the model reasons is not a request to
 * keep it open once the reasoning stops, so the ok phase still folds it.
 */
/**
 * Watch every thinking row on the page and bring each to what its phase asks
 * for.
 *
 * @returns teardown: the observer and the two listeners go away.
 */
export function createReasoningFold() {
  /** The phase a row was in when the reader last touched it. */
  const touchedIn = new WeakMap<Element, string>()
  /** The phase a row was in when it was last toggled, so a press that changed nothing is not retried. */
  const attemptedIn = new WeakMap<Element, string>()
  /** Whether a scan is already queued. */
  let scanQueued = false
  /** The rows this batch of mutations touched. */
  const touchedRows = new Set<Element>()

  /**
   * Bring these rows to what their current phase asks for.
   *
   * Which node is the control depends on how the host configures the
   * expandable area: with expandOnRowClick the whole row is the button,
   * otherwise it is the chevron on its leading edge. "The first descendant
   * that looks like a button" covers both without betting on which one this
   * build chose.
   *
   * @param rows - this batch of rows; some may already be unattached.
   */
  const syncRows = (rows: Iterable<Element>) => {
    for (const row of rows) {
      // A frame sits between collecting and settling, and the row may be
      // gone by then — clicking an element outside the document does nothing.
      if (!row.isConnected) continue
      const phase = row.getAttribute(ROW_PHASE_ATTRIBUTE) ?? ''
      if (phase === '') continue
      // The reader has decided this row's state in this phase: leave it.
      if (touchedIn.get(row) === phase) continue
      if (row.hasAttribute(EXPANDED_ATTRIBUTE) === (phase === RUNNING_STATE)) continue
      // A press that changed nothing will not change anything next time either.
      if (attemptedIn.get(row) === phase) continue
      attemptedIn.set(row, phase)
      const control = row.querySelector('[role="button"], button')
      if (!(control instanceof HTMLElement)) continue
      // The capture listener below sees this same click, so the press has to
      // be declared: it is not the reader asking. The token reveal's own fold
      // guard reads it in the same turn, or the automatic fold would silence
      // the text that just started streaming for 400 ms.
      beginChatFoldToggle()
      try {
        control.click()
      } finally {
        endChatFoldToggle()
      }
    }
  }

  /** Settle every row already on the page once, right after install. */
  const syncEveryRow = () => {
    syncRows(document.querySelectorAll(THINK_ROW_SELECTOR))
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
    // The scan reads each one's state and folds it open or shut: write phase (D40).
    requestFrame({
      write() {
        scanQueued = false
        const rows = [...touchedRows]
        touchedRows.clear()
        syncRows(rows)
      },
    })
  }
  const stopMutations = subscribeMutations(document.body, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: [ROW_PHASE_ATTRIBUTE, EXPANDED_ATTRIBUTE],
  }, onRecords)
  document.addEventListener('click', rememberReaderTouched, true)
  document.addEventListener('keydown', rememberReaderTouched, true)
  syncEveryRow()

  return () => {
    stopMutations()
    document.removeEventListener('click', rememberReaderTouched, true)
    document.removeEventListener('keydown', rememberReaderTouched, true)
  }
}
