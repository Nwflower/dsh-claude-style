import { CHAT_RUNNING_SELECTOR, TOOL_OUTPUT_ROW_SELECTOR } from '@dsh-claude-style/contracts/dom'
import { TOOL_LINE_ATTR, TOOL_LINE_DELAY_VAR } from '../../constants'
import { batchAdditions, observeMarker, subscribeMutations } from '@dsh-claude-style/engine/bus'
import { motionMs } from '../../shared/motion'
import { LINE_ROWS_PER_BATCH, lineDelays } from './tool-line-pacing'

/**
 * How long after the reader opens something the rows mounting count as that
 * opening: the host mounts a disclosure's body within the press's own task, and
 * a page that mounts a whole conversation mounts nothing a press asked for.
 */
const READER_OPEN_MS = 800

/** A batch's rows and the offset of its last arrival, waiting for the mark to come off. */
interface Arrival {
  rows: HTMLElement[]
  delay: number
}

/**
 * A tool body's output arriving: the rows a batch brought are marked, each with
 * the offset its place in that batch earns, and the stylesheet plays the
 * arrival off the mark (features/chat-tool-lines/tool-lines.css).
 *
 * A batch is the rows that appeared in one mutation batch under one parent: a
 * body mounting whole sweeps from its first row, the two sides of one diff hunk
 * sweep together, and the lines a running command appends arrive at once
 * because their batch starts at nothing. The offsets come from
 * tool-line-pacing.ts; the times they are built from are tokens (D9). The marks
 * are written in the batch's own callback, before the paint that would show the
 * rows whole, so no frame draws them at full strength and then hides them again.
 *
 * A batch plays when it is output arriving in front of the reader: a body the
 * reader just opened, or rows falling into a turn that is still running. Every
 * other batch is a page drawing a conversation that already ended — a session
 * opened or switched to, its bodies restored open — and those rows stand as the
 * host drew them (D91).
 *
 * The row mark is the skin's own and comes off once the batch has landed: an
 * arrival cannot start over on a row the host re-renders in place, and nothing
 * of the feature is left on the rows it touched.
 */
export function createToolLineReveal() {
  /** The wait between two chunks of one batch. */
  const chunkMs = motionMs('--dsh-claude-duration-line-chunk')
  /** The wait between two rows once the chunked rows are spent. */
  const rowMs = motionMs('--dsh-claude-duration-line-row')
  /** The longest a batch's arrivals may take together. */
  const settleMs = motionMs('--dsh-claude-duration-line-settle')
  /** One row's own fade: the arrival the stylesheet runs, and how long its mark stands. */
  const fadeMs = motionMs('--dsh-claude-duration-reveal')

  /** Rows already given their arrival, in this generation: a row element keeps its answer while it stands (按行). */
  const arrived = new WeakSet<Element>()
  /** Batches whose marks are still on the page, so the teardown can take them off. */
  const waiting = new Set<Arrival>()
  /** When the reader last pressed something: the rows mounting after it are that press's own. */
  let openedAt = -Infinity
  let stopped = false

  /** The live turn's own row: while it stands, rows mounting anywhere are output arriving. */
  const runningRows = observeMarker<HTMLElement>(CHAT_RUNNING_SELECTOR)

  /** Take one batch's marks off the page, or take them off before they ever drew. */
  const release = (arrival: Arrival) => {
    waiting.delete(arrival)
    for (const row of arrival.rows) {
      row.removeAttribute(TOOL_LINE_ATTR)
      row.style.removeProperty(TOOL_LINE_DELAY_VAR)
    }
  }

  /**
   * Give one batch its arrival: every row of it is marked with the offset its
   * place in the batch earns, and the marks come off once the last has landed.
   *
   * @param rows - the batch, in document order.
   * @param play - false takes the rows as a conversation already ended: no mark
   *        and no offset, so they stand exactly as the host drew them.
   */
  const reveal = (rows: HTMLElement[], play: boolean) => {
    for (const row of rows) arrived.add(row)
    if (!play) return
    const delays = lineDelays(rows.length, chunkMs, rowMs, settleMs)
    for (let index = 0; index < rows.length; index += 1) {
      const row = rows[index]
      const delay = delays[index]
      if (row === undefined || delay === undefined) continue
      row.setAttribute(TOOL_LINE_ATTR, '')
      row.style.setProperty(TOOL_LINE_DELAY_VAR, `${delay}ms`)
    }
    const arrival: Arrival = { rows, delay: delays[delays.length - 1] ?? 0 }
    waiting.add(arrival)
    setTimeout(() => release(arrival), arrival.delay + fadeMs)
  }

  /**
   * The rows of one parent that have not arrived yet: the tail a batch just
   * brought. A row is a box of the text; a control standing beside them (a
   * capped body's expand button) is not one.
   */
  const fresh = (parent: Element) => {
    const rows: HTMLElement[] = []
    for (const row of parent.children) {
      if (!(row instanceof HTMLElement) || row.tagName !== 'DIV' || arrived.has(row)) continue
      rows.push(row)
      if (rows.length === LINE_ROWS_PER_BATCH) break
    }
    return rows
  }

  /** Take every row standing on the page as already arrived: the conversation the page opened onto. */
  const baseline = () => {
    for (const row of document.querySelectorAll(TOOL_OUTPUT_ROW_SELECTOR)) arrived.add(row)
  }

  const onRecords = (records: MutationRecord[]) => {
    if (stopped) return
    const parents = new Set<Element>()
    for (const node of batchAdditions(records).added) {
      if (node.matches(TOOL_OUTPUT_ROW_SELECTOR)) {
        if (node.parentElement !== null) parents.add(node.parentElement)
        continue
      }
      // A body, or a subtree carrying one, mounts its rows in the same batch.
      for (const row of node.querySelectorAll(TOOL_OUTPUT_ROW_SELECTOR)) {
        if (row.parentElement !== null) parents.add(row.parentElement)
      }
    }
    if (parents.size === 0) return
    const play = performance.now() - openedAt <= READER_OPEN_MS || runningRows.all().length > 0
    for (const parent of parents) {
      const batch = fresh(parent)
      if (batch.length > 0) reveal(batch, play)
    }
  }

  /** The reader pressed something: what mounts within the window is what the press opened. */
  const noteReaderPress = () => { openedAt = performance.now() }

  baseline()
  const stopMutations = subscribeMutations(document.body, { childList: true, subtree: true }, onRecords)
  document.addEventListener('click', noteReaderPress, true)
  document.addEventListener('keydown', noteReaderPress, true)

  return () => {
    stopped = true
    stopMutations()
    runningRows.release()
    document.removeEventListener('click', noteReaderPress, true)
    document.removeEventListener('keydown', noteReaderPress, true)
    // The marks go with the feature: a row left under one would still be
    // waiting for an arrival nothing plays any more.
    for (const arrival of [...waiting]) release(arrival)
  }
}
