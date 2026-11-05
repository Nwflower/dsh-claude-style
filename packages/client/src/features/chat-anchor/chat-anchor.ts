import { FOLLOW_THRESHOLD_PX, STREAMING_ATTRIBUTE, STREAMING_SELECTOR, TURN_PROCESS_ANSWER_SELECTOR } from '@dsh-claude-style/contracts/dom'
import { subscribeMutations } from '@dsh-claude-style/engine/bus'
import { requestFrame } from '@dsh-claude-style/engine/frame'
import { conversationColumn, conversationScroller } from '@dsh-claude-style/engine/chat-dom'
import { holdReader, joinScrollOwner, writeScroll } from '@dsh-claude-style/engine/scroll-owner'
import type { HostContext } from '@dsh-claude-style/engine/host'
import type { FeatureUi } from '../../core/feature'
import type manifest from './chat-anchor.manifest'

/**
 * The formal answer's own start takes the reading position (D84).
 *
 * Turned on, a reader who is following the tail while thinking and tool steps
 * run is carried to the first line of the answer the moment that answer starts,
 * and the follow is handed over there: he reads the answer from its first line
 * instead of chasing its last one. The row is the answer its turn's process
 * closes on (TURN_PROCESS_ANSWER_SELECTOR), and the moment is the markdown
 * layer's streaming mark arriving inside that row — a restored conversation
 * carries no such mark, and a settled one is no moment to move anybody.
 *
 * The move is the owner's: a jump, the way the turn navigator's walk to a turn
 * the reader picked is, and a hold after it, so the following sources and the
 * stream slide leave the position where the answer begins (D40, D71). A reader
 * away from the tail is not moved at all. One anchor per answer row.
 */
export function install(_ctx: HostContext, _ui: FeatureUi<typeof manifest>) {
  const leaveOwner = joinScrollOwner()
  /** The answer row the position was last taken by. */
  let anchored: Element | null = null
  /** The frame the anchor is measured and written in. */
  let cancel: (() => void) | null = null
  /** The frame's own work: the row measured in its read phase, and where that puts it. */
  let plan: { row: HTMLElement, top: number } | null = null

  /** The live answer row an element belongs to, or null where it belongs to none. */
  const answerRowOf = (node: Element) => node.closest<HTMLElement>(TURN_PROCESS_ANSWER_SELECTOR)

  /** The answer the live turn closes on: the last row the turn's process does not hold. */
  const liveAnswer = () => {
    const column = conversationColumn()
    if (column === null) return null
    const rows = column.querySelectorAll<HTMLElement>(TURN_PROCESS_ANSWER_SELECTOR)
    return rows.length === 0 ? null : rows[rows.length - 1]!
  }

  /**
   * Measure the answer's first line, on the frame after the batch that carried
   * its streaming mark. The read phase settles it, the scroll phase writes it:
   * a row that is no longer the live answer, an answer already anchored, and a
   * reader away from the tail all leave the next frame nothing to do.
   */
  const frame = {
    read() {
      plan = null
      const row = liveAnswer()
      const scroller = conversationScroller()
      if (row === null || scroller === null || row === anchored) return
      if (row.querySelector(STREAMING_SELECTOR) === null) return
      // The reader's own place, read as the host reads its tail: one away from
      // it is reading somewhere he chose, and is not to be moved.
      if (scroller.scrollHeight - scroller.clientHeight - scroller.scrollTop > FOLLOW_THRESHOLD_PX) return
      plan = { row, top: scroller.scrollTop + row.getBoundingClientRect().top - scroller.getBoundingClientRect().top }
    },
    scroll() {
      cancel = null
      const intent = plan
      plan = null
      const scroller = conversationScroller()
      if (intent === null || scroller === null) return
      anchored = intent.row
      holdReader(scroller)
      writeScroll(scroller, intent.top, 'jump')
    },
  }

  const look = () => {
    if (cancel !== null) return
    cancel = requestFrame(frame)
  }

  /** Whether this batch brought the streaming mark into the live answer's row. */
  const carriesAnswerMark = (records: MutationRecord[]) => {
    const column = conversationColumn()
    if (column === null) return false
    for (const record of records) {
      if (!column.contains(record.target)) continue
      if (record.type === 'attributes') {
        if (record.attributeName !== STREAMING_ATTRIBUTE) continue
        if (record.target instanceof Element && record.target.hasAttribute(STREAMING_ATTRIBUTE) && answerRowOf(record.target) !== null) return true
        continue
      }
      for (const node of record.addedNodes) {
        if (!(node instanceof Element)) continue
        const mark = node.matches(STREAMING_SELECTOR) ? node : node.querySelector(STREAMING_SELECTOR)
        if (mark !== null && answerRowOf(mark) !== null) return true
      }
    }
    return false
  }

  const stop = subscribeMutations(document.body, {
    subtree: true,
    childList: true,
    attributeFilter: [STREAMING_ATTRIBUTE],
  }, (records) => {
    if (carriesAnswerMark(records)) look()
  })
  return () => {
    stop()
    if (cancel !== null) cancel()
    cancel = null
    anchored = null
    plan = null
    leaveOwner()
  }
}
