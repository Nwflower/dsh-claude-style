import { FLOW_KIND_ATTRIBUTE, STREAMING_SELECTOR } from '@dsh-claude-style/contracts/dom'
import { batchAdditions, observeMatches, observeSize, subscribeMutations } from '@dsh-claude-style/engine/bus'
import { conversationScroller } from '@dsh-claude-style/engine/chat-dom'
import { requestFrame } from '@dsh-claude-style/engine/frame'
import { INTERFACE_FONT_SIZE_ATTR } from '../../constants'
import { createRowHeightCache, rowHeightKey } from './row-heights'

/**
 * Which of the conversation's rows the stylesheet may skip (row-skip.css).
 *
 * A row arriving is laid out at its real size by the frame that follows, and
 * `contain-intrinsic-size: auto` remembers that height; the mark goes on the
 * frame after, and only then may the row be skipped, standing at the height it
 * really has. A change of the column's width rewraps every row, so every mark
 * comes off, every row is laid out once at the new width, and the marks go back.
 * A width that is still moving — a sidebar opening or closing, a divider dragged,
 * a window resized — is not the layout the rows will be laid out at: the relay
 * waits for the width to stand still, so the moving column costs the transcript
 * one relay instead of one per report.
 *
 * A row the engine has seen before — the same messages mounted again on a
 * session switch — carries the height it had last time before its first layout
 * of this mount: row-heights.ts holds it, the batch that mounts the row marks
 * it before the page lays anything out, and the stylesheet skips it from the
 * first frame. Without that, a switch lays every row of a long transcript out
 * only to skip it afterwards, which is the expensive half of the switch. A
 * height holds only for the layout it was taken at, so a change of the column's
 * width or of the interface text's size drops every one of them.
 *
 * A row under a `hidden` element (a folded process group's body, a folded
 * turn's members) has no layout to remember, so it carries no mark: one marked
 * there would open at the fallback height, and the fold glide would measure
 * that height and roll the door to it. Every `hidden` flip takes the marks
 * off the rows under it, and a row is marked only while it is rendered.
 */

/** The mark a row carries once it has been laid out at its real size. */
export const LAID_OUT_ATTR = 'data-dsh-claude-laid-out'

/** The mark a row carries when the height it was last mounted at is written on it: the stylesheet may skip it from its first layout. */
export const ROW_HEIGHT_ATTR = 'data-dsh-claude-row-height'

/** Every flow row the host draws, whatever its kind. */
const ROW_SELECTOR = `[${FLOW_KIND_ATTRIBUTE}]`

/** How long the column's width stands still before every row is relayed: a width still moving is not the layout the rows will be laid out at. */
export const WIDTH_SETTLE_MS = 140

export function install() {
  const rows = observeMatches<HTMLElement>(ROW_SELECTOR)
  /** Rows that have not yet been through a layout without the mark. */
  let waiting = new Set<HTMLElement>()
  let cancelFrame: (() => void) | null = null
  /** The scroller whose width is heard, its subscription, and the width last reported. */
  let scroller: Element | null = null
  let stopWidth: (() => void) | null = null
  let width = 0
  /** The pending relay of a width that has not stood still yet. */
  let settleTimer: number | null = null
  /** The heights rows were last laid out at, and the layout those heights hold for. */
  const heights = createRowHeightCache()
  let layoutSignature = ''

  /** The things a kept height stands for: the column's width and the interface text's size. */
  const currentSignature = () => `${Math.round(width)}|${document.body.getAttribute(INTERFACE_FONT_SIZE_ATTR) ?? ''}`

  /** A kept height holds only for the layout it was taken at. */
  const syncSignature = () => {
    const next = currentSignature()
    if (next === layoutSignature) return
    layoutSignature = next
    heights.clear()
  }

  /** Take the mark and the kept height off a row whose layout is about to change. */
  const unmark = (row: Element) => {
    row.removeAttribute(LAID_OUT_ATTR)
    row.removeAttribute(ROW_HEIGHT_ATTR)
    if (row instanceof HTMLElement) row.style.removeProperty('contain-intrinsic-size')
  }

  /**
   * Mark a row the cache already holds the height of, before its first layout.
   * @returns whether the row was marked.
   */
  const applyCached = (row: HTMLElement) => {
    if (row.hasAttribute(LAID_OUT_ATTR)) return false
    const key = rowHeightKey(row)
    if (key === null) return false
    const height = heights.get(key)
    if (height === undefined) return false
    row.style.setProperty('contain-intrinsic-size', `auto ${height}px`)
    row.setAttribute(ROW_HEIGHT_ATTR, '')
    row.setAttribute(LAID_OUT_ATTR, '')
    return true
  }

  /**
   * Mark the rows waiting now, two frames on: the first frame's layout is the one
   * that lays them out unmarked, and the mark lands before the second frame's.
   * A row arriving in between waits for the next round.
   */
  const schedule = () => {
    if (cancelFrame !== null || waiting.size === 0) return
    cancelFrame = requestFrame({
      write() {
        const queued = waiting
        waiting = new Set()
        /** The queued rows that were rendered, read before any mark is written. */
        let laidOut: HTMLElement[] = []
        /** The height each was laid out at, read in the same read phase. */
        const laidOutHeights = new Map<HTMLElement, number>()
        cancelFrame = requestFrame({
          read() {
            // A row under a hidden element waits for the flip that shows it.
            laidOut = [...queued].filter(row => row.isConnected && row.checkVisibility())
            for (const row of laidOut) laidOutHeights.set(row, row.getBoundingClientRect().height)
          },
          write() {
            cancelFrame = null
            for (const row of laidOut) row.setAttribute(LAID_OUT_ATTR, '')
            for (const [row, height] of laidOutHeights) {
              // A row still receiving characters keeps no height: the next mount
              // would stand at the size it had mid-answer.
              if (row.querySelector(STREAMING_SELECTOR) !== null) continue
              const key = rowHeightKey(row)
              if (key !== null) heights.set(key, height)
            }
            schedule()
          },
        })
      },
    })
  }

  /** A `hidden` flip: the rows at and under the element lose their marks and wait for a layout. */
  const onHiddenFlip = (records: MutationRecord[]) => {
    for (const record of records) {
      const target = record.target
      if (!(target instanceof HTMLElement)) continue
      const under = target.matches(ROW_SELECTOR) ? [target, ...target.querySelectorAll<HTMLElement>(ROW_SELECTOR)] : target.querySelectorAll<HTMLElement>(ROW_SELECTOR)
      for (const row of under) {
        unmark(row)
        waiting.add(row)
      }
    }
    schedule()
  }

  /** Every row's mark comes off and every row waits for a layout of its own again. */
  const relayAll = () => {
    for (const row of rows.all()) {
      unmark(row)
      waiting.add(row)
    }
    heights.clear()
    schedule()
  }

  /**
   * Relay once the column's width stands still. A sidebar opening or closing
   * reports a new width on every frame of its animation; relaying each report
   * lays the whole transcript out again per frame, so a conversation pays its
   * size for a column that has not arrived at its width yet.
   */
  const relayWhenSettled = () => {
    if (settleTimer !== null) window.clearTimeout(settleTimer)
    settleTimer = window.setTimeout(() => {
      settleTimer = null
      relayAll()
    }, WIDTH_SETTLE_MS)
  }

  /**
   * Hear the conversation scroller's width; a session switch replaces it. Its
   * first report is the width as it stands, which changes nothing.
   */
  const followWidth = () => {
    const next = conversationScroller()
    if (next === scroller) return
    if (stopWidth !== null) stopWidth()
    stopWidth = null
    // A pending relay heard the tree that left; the width signature decides
    // whether this mount's kept heights still hold.
    if (settleTimer !== null) {
      window.clearTimeout(settleTimer)
      settleTimer = null
    }
    scroller = next
    // The width a replaced scroller reports is the one the page had: a session
    // switch does not change it, so the kept heights still hold.
    if (next === null) return
    stopWidth = observeSize(next, (entries) => {
      const size = entries[entries.length - 1].borderBoxSize
      const inline = size !== undefined && size.length > 0 ? size[0].inlineSize : entries[entries.length - 1].contentRect.width
      const previous = width
      width = inline
      if (previous === 0) {
        // Heights recorded before the first report are real layouts at this width.
        layoutSignature = currentSignature()
        return
      }
      if (Math.abs(inline - previous) >= 0.5) relayWhenSettled()
    })
  }

  /** The rows that arrived without the mark wait for their first layout. */
  const collect = () => {
    followWidth()
    syncSignature()
    for (const row of rows.all()) {
      if (applyCached(row)) continue
      if (!row.hasAttribute(LAID_OUT_ATTR)) waiting.add(row)
    }
    schedule()
  }

  /**
   * A batch's additions are the rows to wait for. The registry's own change
   * callback fires on removals too, and a conversation that streams replaces
   * nodes constantly: re-reading every row for one that left is the page's
   * size paid on every batch.
   */
  const onArrivals = (records: MutationRecord[]) => {
    let added = false
    for (const node of batchAdditions(records).added) {
      if (node.matches(ROW_SELECTOR)) {
        waiting.add(node as HTMLElement)
        added = true
      }
      for (const row of node.querySelectorAll<HTMLElement>(ROW_SELECTOR)) {
        waiting.add(row)
        added = true
      }
    }
    followWidth()
    if (added) schedule()
  }

  /**
   * The rows a batch mounts that the engine has already laid out once carry
   * their height from that mount. This runs before paint, so the batch's first
   * layout reads the mark; a row the cache does not hold waits for its own
   * layout through `onArrivals` as before.
   */
  const onCachedArrivals = (records: MutationRecord[]) => {
    if (heights.size === 0) return
    syncSignature()
    for (const node of batchAdditions(records).added) {
      if (node.matches(ROW_SELECTOR)) applyCached(node as HTMLElement)
      for (const row of node.querySelectorAll<HTMLElement>(ROW_SELECTOR)) applyCached(row)
    }
  }

  const stopHidden = subscribeMutations(document.body, { subtree: true, attributes: true, attributeFilter: ['hidden'] }, onHiddenFlip)
  const stopArrivals = subscribeMutations(document.body, { subtree: true, childList: true }, onArrivals)
  const stopCachedArrivals = subscribeMutations(document.body, { subtree: true, childList: true, beforePaint: true }, onCachedArrivals)
  collect()

  return () => {
    stopHidden()
    stopArrivals()
    stopCachedArrivals()
    if (stopWidth !== null) stopWidth()
    if (settleTimer !== null) window.clearTimeout(settleTimer)
    if (cancelFrame !== null) cancelFrame()
    for (const row of rows.all()) unmark(row)
    rows.release()
  }
}
