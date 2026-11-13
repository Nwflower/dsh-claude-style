import { subscribeMutations } from '@dsh-claude-style/engine/bus'
import { createProcessTurnReader } from '@dsh-claude-style/engine/host'
import { writeScroll } from '@dsh-claude-style/engine/scroll-owner'
import { captureComposerCaret, focusKeepingComposerCaret } from '../../shared/composer-caret'
import { collectFoldRows, createFoldScheduler } from './fold-scheduler'
import { CHAT_FLOW_SELECTOR, CHAT_TURN_ATTRIBUTE, CONVERSATION_SCROLL_SELECTOR, FOLLOW_THRESHOLD_PX, PROCESS_ACTIVITY_SELECTOR, PROCESS_BODY_SELECTOR, PROCESS_EXPANDED_MODE_ATTRIBUTE, PROCESS_GROUP_SELECTOR, RUNNING_STATE, SHIMMER_ATTRIBUTE, SHIMMER_SELECTOR, STREAMING_ATTRIBUTE, TURN_PROCESS_ANSWER_SELECTOR, TURN_PROCESS_MEMBER_ATTRIBUTE } from '@dsh-claude-style/contracts/dom'

const PROCESS_CLOSED = 'closed'
const phaseOf = (group: Element) => group.querySelector(PROCESS_ACTIVITY_SELECTOR)?.querySelector(SHIMMER_SELECTOR) == null
  ? PROCESS_CLOSED : RUNNING_STATE

/* Reader decisions last for their phase; the final group of a stopped turn stays open (D3). */
export function createProcessFold() {
  // Per frame: discard flow indexes after the last press, and on stop (D40).
  let readTurn: ReturnType<typeof createProcessTurnReader> | null = null
  const scheduler = createFoldScheduler({
    selector: PROCESS_GROUP_SELECTOR,
    phase: phaseOf,
    rows: () => document.querySelectorAll(PROCESS_GROUP_SELECTOR),
    beginBatch() {
      readTurn = createProcessTurnReader()
    },
    endBatch() {
      readTurn = null
    },
    press(group, readerTouched) {
      // Expanded tiers keep a header inside a hidden shell; pressing it changes invisible state.
      if (group.hasAttribute(PROCESS_EXPANDED_MODE_ATTRIBUTE)) return null
      const header = group.querySelector(PROCESS_ACTIVITY_SELECTOR)
      const body = group.querySelector(PROCESS_BODY_SELECTOR)
      if (!(header instanceof HTMLElement) || body === null) return null
      const phase = phaseOf(group)
      const flow = group.closest(CHAT_FLOW_SELECTOR)
      const turn = group.getAttribute(CHAT_TURN_ATTRIBUTE)
      const state = flow === null || turn === null ? null : readTurn!(flow)
      const desiredHidden = phase === PROCESS_CLOSED && (state === null || state.groups.get(turn!)?.at(-1) !== group || state.answered.has(turn!))
      if (body.hasAttribute('hidden') === desiredHidden || (!desiredHidden && readerTouched)) return null
      // The host focuses and scrolls the header. Keep the reader's caret and tail-follow position.
      let previousFocus: Element | null = null
      let composerCaret: ReturnType<typeof captureComposerCaret> = null
      const scroller = header.closest<HTMLElement>(CONVERSATION_SCROLL_SELECTOR)
      let scrollTop: number | null = null
      let wasAtBottom = false
      return {
        control: header,
        state: `${phase}:${body.hasAttribute('hidden') ? 'shut' : 'open'}`,
        read() {
          previousFocus = document.activeElement
          composerCaret = captureComposerCaret()
          scrollTop = scroller?.scrollTop ?? null
          wasAtBottom = scroller !== null
            && scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight <= FOLLOW_THRESHOLD_PX
        },
        settled: () => body.hasAttribute('hidden') === desiredHidden,
        retryAfterSettlement: true,
        afterPress() {
          if (scroller !== null && scrollTop !== null && scroller.scrollTop !== scrollTop) {
            writeScroll(scroller, wasAtBottom ? scroller.scrollHeight : scrollTop, 'fold')
          }
          if (previousFocus instanceof HTMLElement && previousFocus.isConnected) focusKeepingComposerCaret(previousFocus, composerCaret)
          if (document.activeElement === header) header.blur()
        },
      }
    },
  })
  const stopMutations = subscribeMutations(document.body, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: [SHIMMER_ATTRIBUTE, 'hidden', PROCESS_EXPANDED_MODE_ATTRIBUTE, STREAMING_ATTRIBUTE, TURN_PROCESS_MEMBER_ATTRIBUTE],
  }, records => {
    // Per mutation batch: each flow is indexed once for all affected turns.
    const turns = createProcessTurnReader()
    const settleTurnOf = (node: Element) => {
      const flow = node.closest(CHAT_FLOW_SELECTOR)
      const turn = node.closest(`[${CHAT_TURN_ATTRIBUTE}]`)?.getAttribute(CHAT_TURN_ATTRIBUTE)
      if (flow === null || turn == null) return
      for (const group of turns(flow).groups.get(turn) ?? []) scheduler.add(group)
    }
    collectFoldRows(records, PROCESS_GROUP_SELECTOR, scheduler.add, group => {
      scheduler.add(group)
      settleTurnOf(group)
    })
    for (const record of records) {
      if (record.type === 'attributes' && record.target instanceof Element) {
        if (record.attributeName === STREAMING_ATTRIBUTE && !record.target.hasAttribute(STREAMING_ATTRIBUTE)) settleTurnOf(record.target)
        if (record.attributeName === TURN_PROCESS_MEMBER_ATTRIBUTE && record.target.matches(TURN_PROCESS_ANSWER_SELECTOR)) settleTurnOf(record.target)
      }
      for (const node of record.addedNodes) {
        if (!(node instanceof Element)) continue
        const answer = node.matches(TURN_PROCESS_ANSWER_SELECTOR) ? node : node.querySelector(TURN_PROCESS_ANSWER_SELECTOR)
        if (answer !== null) settleTurnOf(answer)
      }
    }
    scheduler.schedule()
  })
  scheduler.refresh()
  return () => {
    stopMutations()
    scheduler.stop()
    readTurn = null
  }
}
