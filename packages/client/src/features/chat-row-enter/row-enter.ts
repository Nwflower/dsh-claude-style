import { batchAdditions, observeMatches, subscribeMutations } from '@dsh-claude-style/engine/bus'
import { motionEase, motionMs, motionValue } from '../../shared/motion'
import { baselineOnSessionSwitch } from '../../shared/session-baseline'
import { conversationColumn } from '@dsh-claude-style/engine/chat-dom'
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
  TURN_TAIL_SELECTOR,
  USER_ROW_KIND,
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
 * A flow row that holds nothing but its own content: the reader's message, an
 * answer, a tool call's card, a context injection's body, a settled turn's tail.
 * Content rewritten inside one of these belongs to that row, and no process row
 * can mount there — an answer's markdown re-rendered piece by piece is the
 * streaming case this keeps off the per-node walk.
 *
 * The list names the kinds known to hold nothing; a kind this build does not
 * know is walked, so a group the host adds later still brings its rows in.
 */
const LEAF_ROW_SELECTOR = [
  `[${FLOW_KIND_ATTRIBUTE}="${USER_ROW_KIND}"]`,
  `[${FLOW_KIND_ATTRIBUTE}="${ASSISTANT_STEP_KIND}"]`,
  `[${FLOW_KIND_ATTRIBUTE}="${TOOL_CALL_KIND}"]`,
  `[${FLOW_KIND_ATTRIBUTE}="${CONTEXT_ROW_KIND}"]`,
  TURN_TAIL_SELECTOR,
].join(', ')

/**
 * A process row taking its place in the live turn: the row is given its entrance
 * in the batch that brings it.
 *
 * The entrance is the engine's own animation, played on the compositor. A rule
 * gated by an attribute — the shape a stylesheet would need — costs a page-wide
 * style invalidation and an animation the style engine has to start for every
 * row, and during a streamed turn those land in the same frames as the host's
 * own writes (D9, D95).
 *
 * Only opacity, a translate and a scale move, so a row entering never changes
 * the column's height: the host's follow, the stream's slide and a capped
 * body's scroll position read the same layout with or without it (D95). The
 * entrance starts in the batch's own callback, before the paint that would show
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
  /** One row's entrance: how long it runs, the curve, and the rise it starts from. */
  const enterMs = motionMs('--dsh-claude-duration-row-enter')
  const ease = motionEase('--dsh-claude-ease-out')
  const rise = Number.parseFloat(motionValue('--dsh-claude-distance-nudge'))

  /** Every live turn's status row, kept current by the bus (D40). */
  const runningRows = observeMatches<HTMLElement>(CHAT_RUNNING_SELECTOR)

  /** Per row: the rows that have taken their place, played or not; replaced on a session switch (D91). */
  let arrived = new WeakSet<Element>()
  /** Per session: rows whose seat stands empty, waiting for the batch that fills them. */
  const waiting = new Set<Element>()
  /** The entrances playing now, so the teardown leaves every row as the host draws it. */
  const playing = new Set<Animation>()
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

  /** Play one row's entrance: it fades in, rises and grows from its leading edge, and ends as the host draws it. */
  const enter = (row: Element) => {
    // A row is as wide as the column, and one growing from its centre would
    // carry its icon sideways: the reading direction decides which edge it grows from.
    const origin = row.closest('[dir="rtl"]') === null ? 'left center' : 'right center'
    const animation = row.animate([
      { opacity: 0, translate: `0 ${rise}px`, scale: '0.98', transformOrigin: origin },
      { opacity: 1, translate: '0 0', scale: '1', transformOrigin: origin },
    ], { duration: enterMs, easing: ease })
    playing.add(animation)
    const forget = () => { playing.delete(animation) }
    animation.onfinish = forget
    animation.oncancel = forget
  }

  /**
   * Take the filled rows of one batch as arrived, and play the ones that enter.
   *
   * @param batch - rows not seen before, in any order.
   */
  const settle = (batch: Iterable<Element>) => {
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
      if (plays) enter(row)
    }
  }

  /** Take every row standing in the conversation as already arrived: the conversation as it was saved. */
  const baseline = () => {
    arrived = new WeakSet<Element>()
    waiting.clear()
    newestTurn = null
    baselining = true
    const column = conversationColumn()
    if (column !== null) settle(column.querySelectorAll(PROCESS_ROW_SELECTOR))
    baselining = false
  }

  const onRecords = (records: MutationRecord[]) => {
    if (stopped) return
    const batch = new Set<Element>(waiting)
    for (const node of batchAdditions(records).added) {
      if (node.matches(PROCESS_ROW_SELECTOR)) {
        batch.add(node)
        continue
      }
      // What was written into a leaf row is that row's own content, and no
      // process row can mount there.
      if (node.closest(LEAF_ROW_SELECTOR) !== null) continue
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
    runningRows.release()
    waiting.clear()
    // A row left mid-entrance would stay off its resting place: the animations
    // go with the engine, and the rows are the host's again.
    for (const animation of playing) animation.cancel()
    playing.clear()
  }
}
