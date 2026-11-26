import { READER_HOLD_ATTR } from '../../constants'
import { CHAT_RUNNING_SELECTOR, ROW_PHASE_ATTRIBUTE, RUNNING_STATE, THINK_ROW_SELECTOR } from '@dsh-claude-style/contracts/dom'
import { subscribeMutations } from '@dsh-claude-style/engine/bus'
import { conversationScroller } from '@dsh-claude-style/engine/chat-dom'
import { joinScrollOwner, readerHolds } from '@dsh-claude-style/engine/scroll-owner'
import { createStreamSlide } from './stream-slide'

/**
 * Watch the page for the moments the stream slide has to answer: while content
 * streams, slide what the host's pin pushed up instead of letting it jump in
 * one frame (D95), and end a running slide where the reader takes the
 * conversation over or a structural boundary changes the height under it.
 *
 * The host keeps its own follow through tool calls, thinking rows ending and
 * new flow blocks, so these moments need no hand-back; the hand-backs left are
 * the fold's and the reader's own return to the end (D40).
 *
 * @param options.foldBusy - whether a fold glide is animating a height right now.
 * @param options.submissionHeld - whether the reader's own message is still
 *     taking its place (see the composer's slide stand-down).
 * @returns teardown: the subscriptions go away.
 */
export function createChatFollowGuard(options: { foldBusy: () => boolean, submissionHeld: () => boolean }) {
  const { foldBusy, submissionHeld } = options
  const leaveOwner = joinScrollOwner()

  /** Whether the reader is reading up there right now (the owner's hold on the conversation). */
  const readerAway = () => {
    const scroller = conversationScroller()
    return scroller !== null && readerHolds(scroller)
  }

  /** The stream slide, its size subscription and the door's hold mark (stream-slide.ts, D95). */
  const slide = createStreamSlide({ foldBusy, submissionHeld, readerAway })

  const onRecords = (records: MutationRecord[]) => {
    for (const record of records) {
      if (record.type === 'attributes') {
        // The reader took the conversation over: a slide still carrying an
        // offset would leave what he scrolls to off its place.
        if (record.attributeName === READER_HOLD_ATTR) {
          if (record.target instanceof Element && record.target.hasAttribute(READER_HOLD_ATTR)) slide.stop()
          continue
        }
        // A thinking row leaving "running" may shrink in this same batch. End
        // its growth offset before that structural change paints; the resize
        // subscription is the backup.
        if (record.oldValue === RUNNING_STATE
          && record.target instanceof Element
          && record.target.matches(THINK_ROW_SELECTOR)
          && record.target.getAttribute(ROW_PHASE_ATTRIBUTE) !== RUNNING_STATE) {
          slide.stop()
        }
        continue
      }
      for (const node of record.removedNodes) {
        if (!(node instanceof Element)) continue
        if (node.matches(CHAT_RUNNING_SELECTOR) || node.querySelector(CHAT_RUNNING_SELECTOR) !== null) {
          // The live row leaving is the stream's structural boundary. Its last
          // growth offset ends in this mutation batch, ahead of the next paint.
          slide.stop()
          break
        }
      }
    }
    if (records.some(record => record.type !== 'attributes')) {
      slide.sync()
      slide.holdCheck()
    }
  }

  const stopMutations = subscribeMutations(document.body, {
    subtree: true,
    childList: true,
    characterData: true,
    skipQuiet: true,
    attributeFilter: [ROW_PHASE_ATTRIBUTE, READER_HOLD_ATTR],
    attributeOldValue: true,
  }, onRecords)

  return () => {
    stopMutations()
    slide.release()
    leaveOwner()
  }
}
