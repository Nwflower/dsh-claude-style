import { ROW_ENTERING_ATTR } from '../../constants'
import { batchAdditions, observeMatches, subscribeMutations } from '@dsh-claude-style/engine/bus'
import { motionMs } from '../../shared/motion'
import { baselineOnSessionSwitch } from '../../shared/session-baseline'
import { rowPlays, rowTurn } from './row-enter-gate'
import {
  ASSISTANT_STEP_KIND,
  CHAT_GROUP_PART_ATTRIBUTE,
  CHAT_GROUP_PART_REASONING,
  CHAT_NODE_SELECTOR,
  CHAT_RUNNING_HOLDING_ATTRIBUTE,
  CHAT_RUNNING_SELECTOR,
  CHAT_TURN_ATTRIBUTE,
  CONTEXT_ROW_KIND,
  CONVERSATION_SCROLL_SELECTOR,
  FLOW_KIND_ATTRIBUTE,
  TOOL_CALL_KIND,
} from '@dsh-claude-style/contracts/dom'

/**
 * One row of a turn's process: a tool call, a thought, or a context injection.
 * The answer's own row is left out — its characters arrive by the reveal — and
 * so are the reader's messages, which the send feature brings in.
 */
export const PROCESS_ROW_SELECTOR = [
  `[${FLOW_KIND_ATTRIBUTE}="${TOOL_CALL_KIND}"]`,
  `[${FLOW_KIND_ATTRIBUTE}="${CONTEXT_ROW_KIND}"]`,
  `[${FLOW_KIND_ATTRIBUTE}="${ASSISTANT_STEP_KIND}"][${CHAT_GROUP_PART_ATTRIBUTE}="${CHAT_GROUP_PART_REASONING}"]`,
].join(', ')

/**
 * A process row taking its place in the live turn: the row is marked in the
 * batch that brings it, the stylesheet plays the entrance off the mark
 * (features/chat-row-enter/row-enter.css), and the mark comes off once it has
 * played.
 *
 * Only opacity, a translate and a scale move, so a row entering never changes
 * the column's height: the host's follow, the stream's slide and a capped
 * body's scroll position read the same layout with or without it (D95). The
 * mark is written in the batch's own callback, before the paint that would show
 * the row at full strength.
 *
 * The host mounts a row's seat before the node inside it has anything to draw,
 * and collapses a seat that stands empty. Such a row waits here and enters in
 * the batch that fills it. Whether a filled row plays is row-enter-gate.ts's
 * answer: the rows of the turn under way do, and the conversation as it was
 * saved does not (D91).
 *
 * A row's answer is kept by its element, which the host keeps for as long as
 * the row stands: a call going from running to done re-renders inside the same
 * row and enters once.
 */
export function createRowEnter() {
  /** One row's entrance: how long its mark stands. */
  const enterMs = motionMs('--dsh-claude-duration-row-enter')

  /** Every process row on the page, and every live turn's status row, kept current by the bus (D40); taken before the mutation watch, so a batch reaches them first. */
  const rows = observeMatches<HTMLElement>(PROCESS_ROW_SELECTOR)
  const runningRows = observeMatches<HTMLElement>(CHAT_RUNNING_SELECTOR)

  /** Per row: the rows that have taken their place, played or not; replaced on a session switch (D91). */
  let arrived = new WeakSet<Element>()
  /** Per session: rows whose seat stands empty, waiting for the batch that fills them. */
  const waiting = new Set<Element>()
  /** Per batch: rows carrying the mark, so the teardown can take it off. */
  const entering = new Set<Element>()
  /** Per session: the newest turn among the rows that have arrived. */
  let newestTurn: number | null = null
  /** Set from the install and from every session switch until that switch's frame has taken what it mounted. */
  let baselining = true
  let stopped = false

  /** Whether the host has drawn anything into the row: an empty seat has no box and nothing to bring in. */
  const filled = (row: Element) => {
    const seat = row.firstElementChild
    if (seat === null) return false
    return !seat.matches(CHAT_NODE_SELECTOR) || seat.childNodes.length > 0
  }

  /** Whether a turn is under way in the conversation this row stands in. */
  const live = (row: Element) => {
    const scope = row.closest(CONVERSATION_SCROLL_SELECTOR) ?? document.body
    return runningRows.all().some(running => !running.hasAttribute(CHAT_RUNNING_HOLDING_ATTRIBUTE) && scope.contains(running))
  }

  /** Take the mark off one batch of rows. */
  const release = (batch: readonly Element[]) => {
    for (const row of batch) {
      entering.delete(row)
      row.removeAttribute(ROW_ENTERING_ATTR)
    }
  }

  /**
   * Take the filled rows of one batch as arrived, and mark the ones that play.
   *
   * @param batch - rows not seen before, in any order.
   */
  const settle = (batch: Iterable<Element>) => {
    const played: Element[] = []
    /** The newest turn as it stood before this batch: two rows of one batch are judged alike. */
    const before = newestTurn
    for (const row of batch) {
      if (arrived.has(row)) continue
      if (!row.isConnected) {
        waiting.delete(row)
        continue
      }
      if (!filled(row)) {
        waiting.add(row)
        continue
      }
      waiting.delete(row)
      arrived.add(row)
      const turn = rowTurn(row.getAttribute(CHAT_TURN_ATTRIBUTE))
      // A row under a folded group or a folded turn has no box: it has arrived, and there is nothing to draw.
      const plays = row.closest('[hidden]') === null
        && rowPlays({ baselining, live: !baselining && live(row), turn, newestTurn: before })
      if (turn !== null && (newestTurn === null || turn > newestTurn)) newestTurn = turn
      if (!plays) continue
      row.setAttribute(ROW_ENTERING_ATTR, '')
      entering.add(row)
      played.push(row)
    }
    if (played.length > 0) setTimeout(() => release(played), enterMs)
  }

  /** Take every row standing on the page as already arrived: the conversation as it was saved. */
  const baseline = () => {
    arrived = new WeakSet<Element>()
    waiting.clear()
    newestTurn = null
    baselining = true
    settle(rows.all())
    baselining = false
  }

  const onRecords = (records: MutationRecord[]) => {
    if (stopped) return
    const batch = new Set<Element>(waiting)
    for (const node of batchAdditions(records).added) {
      if (node.matches(PROCESS_ROW_SELECTOR)) batch.add(node)
      // A process group, or a whole turn, mounts its rows in the same batch.
      for (const row of node.querySelectorAll(PROCESS_ROW_SELECTOR)) batch.add(row)
    }
    if (batch.size > 0) settle(batch)
  }

  baseline()
  const stopMutations = subscribeMutations(document.body, { childList: true, subtree: true }, onRecords)
  const stopSession = baselineOnSessionSwitch(() => { baselining = true }, baseline)

  return () => {
    stopped = true
    stopSession()
    stopMutations()
    rows.release()
    runningRows.release()
    waiting.clear()
    // The marks go with the feature: a row left under one would replay its
    // entrance the next time the stylesheet's gate comes back.
    release([...entering])
  }
}
