import { READER_HOLD_ATTR } from '../../constants'
import { CHAT_CALL_SELECTOR, CHAT_RUNNING_SELECTOR, FLOW_BLOCK_SELECTOR, FOLLOWING_TAIL_ATTRIBUTE, ROW_PHASE_ATTRIBUTE, RUNNING_STATE, THINK_ROW_SELECTOR } from '@dsh-claude-style/contracts/dom'
import { subscribeMutations } from '@dsh-claude-style/engine/bus'
import { conversationScroller } from '@dsh-claude-style/engine/chat-dom'
import { requestFrame } from '@dsh-claude-style/engine/frame'
import { handBackFollow, joinScrollOwner, readerHolds } from '@dsh-claude-style/engine/scroll-owner'
import { createStreamSlide } from './slide-motion'

/** One tool call's row, and one flow block, in one selector: a new node either way. */
const FOLLOW_STRUCTURE_SELECTOR = FLOW_BLOCK_SELECTOR + ', ' + CHAT_CALL_SELECTOR
/** Two hand-backs never land closer than this, so a run of tool calls cannot pin the position. */
const FOLLOW_MIN_INTERVAL_MS = 200
/**
 * A structural change this recent still counts as work in progress. The
 * guard watches data-chat-following-tail going away, and it also goes away
 * on a session switch or a restored reading position — moments with no
 * streaming content and no fresh structure. The grace lets a freshly
 * inserted tool row count as work in progress too.
 */
const FOLLOW_ACTIVITY_GRACE_MS = 2000
/** A fold glide in flight is waited out; after this many waits the round is dropped. */
const FOLLOW_FOLD_WAIT_MS = 150
const FOLLOW_FOLD_WAIT_ATTEMPTS = 4

/**
 * Watch the whole page for the moments that lose the host's follow, and hand
 * the position back at each of them; while content streams, slide what the
 * host's pin pushed up instead of letting it jump in one frame (D95). Every
 * position write goes through the scroll owner (D40).
 *
 * @param options.foldBusy - whether a fold glide is animating a height right now.
 * @param options.submissionHeld - whether the reader's own message is still
 *     taking its place (see the composer's slide stand-down).
 * @returns teardown: the subscriptions go away.
 */
export function createChatFollowGuard(options: { foldBusy: () => boolean, submissionHeld: () => boolean }) {
  const { foldBusy, submissionHeld } = options
  const leaveOwner = joinScrollOwner()
  /** When the last hand-back really landed, for the throttle. */
  let lastEnsureAt = 0
  /** When structure last changed, for the grace above. */
  let lastActivityAt = 0
  let scanQueued = false
  /** Set by the teardown: no pass is queued and no retry is waiting. */
  let stopped = false
  /** Cancels the frame a seen moment waits on. */
  let cancelScan: (() => void) | null = null
  /** The wait a fold glide put the hand-back on, so the teardown can drop it. */
  let foldWaitTimer: number | null = null
  /** This batch of mutations held a structural moment / the follow being turned off. */
  let structureSeen = false
  let guardSeen = false
  let tailReadWanted = false

  /** Whether the reader is reading up there right now (the owner's hold on the conversation). */
  const readerAway = () => {
    const scroller = conversationScroller()
    return scroller !== null && readerHolds(scroller)
  }

  /**
   * The stream slide and the sync under it (slide-motion.ts, D95). The guard
   * asks it for the streaming mark, the tail and the slide's own transitions
   * instead of holding a second copy of any of that state.
   */
  const slide = createStreamSlide({ foldBusy, submissionHeld, readerAway })

  /**
   * Whether work counts as in progress right now: the mark the host writes
   * while it streams, read inside the message column the way the slide reads it
   * (a document query made after the host's own write forces a style pass over
   * the whole page), or the reader's own activity inside the grace window.
   */
  const running = () => slide.streaming() || performance.now() - lastActivityAt <= FOLLOW_ACTIVITY_GRACE_MS

  /**
   * Hand this round's follow back. Three gates have to open: the position,
   * the reader's intent and a fold glide in flight.
   * @param attempt - how many times this round has been put off by a fold glide.
   */
  const ensure = (attempt: number) => {
    if (stopped || readerAway()) return
    const scroller = conversationScroller()
    if (scroller === null) return
    slide.noteTail(scroller)
    // A conversation opened onto a saved historical position has never followed the tail.
    if (!slide.seenAtTail()) return
    // More than a screen off the end is the reader reading higher up, not a follow that fell one step behind.
    if (scroller.scrollHeight - scroller.clientHeight - scroller.scrollTop > scroller.clientHeight) return
    // A fold glide is moving the height, and the position is its business until it lands.
    if (foldBusy()) {
      if (attempt >= FOLLOW_FOLD_WAIT_ATTEMPTS) return
      if (foldWaitTimer !== null) window.clearTimeout(foldWaitTimer)
      foldWaitTimer = window.setTimeout(() => {
        foldWaitTimer = null
        ensure(attempt + 1)
      }, FOLLOW_FOLD_WAIT_MS)
      return
    }
    const now = performance.now()
    if (now - lastEnsureAt < FOLLOW_MIN_INTERVAL_MS) return
    lastEnsureAt = now
    // A hand-back in flight outlives the frame it began in, so it is told the
    // feature is gone rather than only that the reader is still up there.
    handBackFollow({ stillWanted: () => !stopped && !readerAway() })
  }

  /** A batch of mutations is settled: decide whether to act. */
  const settle = () => {
    const structure = structureSeen
    const guarded = guardSeen
    structureSeen = false
    guardSeen = false
    // The guard side needs the extra "work in progress" test: the attribute
    // going away can also be a session switch or history being restored.
    if (!structure && !(guarded && running())) return
    ensure(0)
  }

  const queue = () => {
    if (scanQueued || stopped) return
    scanQueued = true
    // The hand-back reads the position and writes it in one go, in the scroll
    // phase, while the frame's reads have left the layout settled (D40).
    cancelScan = requestFrame({
      read() {
        if (!tailReadWanted) return
        tailReadWanted = false
        slide.noteTail(conversationScroller())
      },
      scroll() {
        cancelScan = null
        scanQueued = false
        settle()
      },
    })
  }

  /** Whether a newly added node holds a flow block or a tool call row. */
  const marksStructure = (node: Node) => {
    if (!(node instanceof Element)) return false
    return node.matches(FOLLOW_STRUCTURE_SELECTOR) || node.querySelector(FOLLOW_STRUCTURE_SELECTOR) !== null
  }

  const onRecords = (records: MutationRecord[]) => {
    for (const record of records) {
      if (record.type === 'attributes') {
        // The reader took the conversation over: a slide still carrying an
        // offset would leave what he scrolls to off its place.
        if (record.attributeName === READER_HOLD_ATTR) {
          if (record.target instanceof Element && record.target.hasAttribute(READER_HOLD_ATTR)) slide.stop()
          continue
        }
        // The follow went from present to absent: the host just turned it off.
        if (record.attributeName === FOLLOWING_TAIL_ATTRIBUTE) {
          if (record.target instanceof Element && !record.target.hasAttribute(FOLLOWING_TAIL_ATTRIBUTE)) guardSeen = true
          continue
        }
        // A thinking row leaving "running": the boundary of that piece of work.
        if (record.oldValue === RUNNING_STATE
          && record.target instanceof Element
          && record.target.matches(THINK_ROW_SELECTOR)
          && record.target.getAttribute(ROW_PHASE_ATTRIBUTE) !== RUNNING_STATE) {
          lastActivityAt = performance.now()
          structureSeen = true
          // The row may shrink in this same batch. End its growth offset before
          // that structural change paints; the resize subscription is the backup.
          slide.stop()
        }
        continue
      }
      for (const node of record.addedNodes) {
        if (!marksStructure(node)) continue
        lastActivityAt = performance.now()
        structureSeen = true
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
      const columnChanged = slide.sync()
      slide.holdCheck()
      // Read the tail at most once per frame, only for a different column or
      // content arriving in this transcript. Mutations elsewhere never force
      // layout in a conversation restored at its saved reading position (D40).
      const scroller = conversationScroller()
      if (!slide.seenAtTail() && scroller !== null && (columnChanged || records.some(
        record => record.type !== 'attributes' && scroller.contains(record.target),
      ))) tailReadWanted = true
    }
    if (structureSeen || guardSeen || tailReadWanted) queue()
  }

  const stopMutations = subscribeMutations(document.body, {
    subtree: true,
    childList: true,
    characterData: true,
    skipQuiet: true,
    attributeFilter: [ROW_PHASE_ATTRIBUTE, FOLLOWING_TAIL_ATTRIBUTE, READER_HOLD_ATTR],
    attributeOldValue: true,
  }, onRecords)

  return () => {
    // First: a queued pass or a waiting retry would otherwise hand the position
    // back after the feature is off, pressing the host's own back-to-end button.
    stopped = true
    if (cancelScan !== null) cancelScan()
    cancelScan = null
    scanQueued = false
    if (foldWaitTimer !== null) window.clearTimeout(foldWaitTimer)
    foldWaitTimer = null
    stopMutations()
    slide.release()
    leaveOwner()
  }
}
