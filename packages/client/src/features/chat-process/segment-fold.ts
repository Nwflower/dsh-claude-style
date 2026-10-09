import { PART_IN_ATTR, PROCESS_COLLAPSE_ATTR, PROCESS_LANE_ATTR, PROCESS_SEGMENT_ATTR, QUIET_ATTR } from '../../constants'
import { requestFrame } from '../../core/frame'
import { motionReduced } from '../../core/prefs'
import { afterPhase, animateReveal, animateRetire, cancelAnimations, layoutEnd, layoutStart, LANE_TIMING, playElastic, playPulse, releaseHeld } from './lane-motion'
import { createNumberRoll } from './number-roll'
import type { LanePhase } from './lane-motion'
import type { NumberRoll } from './number-roll'
import type { ProcessSegment, ProcessTally } from './process-counts'

/**
 * One segment's presentation (D55, D56): the summary row standing where that
 * segment's process folded, and the choreography that folds it — the moves
 * dsh-better-display's reader settled on, at its numbers.
 *
 * A segment folds once its formal output has arrived: the reader then reads
 * "思考×N · 工具×M · 记录×K" where the thinking and the calls were, and the
 * output itself stands below it. The rows are the host's and stay mounted — the
 * lane marks the segment's own rows, so a group that also holds rows of the
 * next segment keeps them.
 *
 * The summary is sticky and the fold's own moves are the reference's: the row
 * arrives on its measured height over 220 ms, the rows give way in three stops
 * over 320 ms, and opening it again grows them back over 180 ms. Every animated
 * move brackets itself in the layout events the follow stands down between.
 */

/** One segment's summary row, built and kept by the lane. */
export interface SegmentSummary {
  root: HTMLElement
  button: HTMLButtonElement
  /** The figures, created as each kind first appears. */
  rolls: Partial<Record<keyof ProcessTally, NumberRoll>>
  /** The value each figure last showed, so a roll never restarts on an equal value. */
  shown: ProcessTally
  /** Whether the row has played its landing pulse. */
  pulsed: boolean
}

/** What the lane remembers about one segment between passes. */
export interface SegmentLane {
  key: string
  summary: SegmentSummary | null
  /** Read once: the first pass after the segment appeared starts no phase. */
  read: boolean
  /** Whether the segment's rows stand folded behind the summary right now. */
  folded: boolean
  /** The reader's own choice: true once he opened this segment himself. */
  opened: boolean
  /**
   * The rows carrying the fold mark right now. The host re-keys a row as a turn
   * settles — the final answer stops being a process member — so the mark is
   * cleared through this list rather than through a fresh reading, which may no
   * longer hold the row.
   */
  marked: HTMLElement[]
  phase: LanePhase
  held: HTMLElement[]
  animations: Animation[]
  timer: number
  frame: number
}

/**
 * The mark a folded segment's rows carry: the stylesheet takes them out of the
 * column under it. The rows are the host's own, one flow row each, so a group
 * that spans two segments keeps the one still being written.
 */
const FOLDED_ATTR = 'data-segment-folded'

const SUMMARY_KIND_ORDER: (keyof ProcessTally)[] = ['thinking', 'tool', 'record']
const SUMMARY_KIND_LABEL: Record<keyof ProcessTally, string> = { thinking: '思考', tool: '工具', record: '记录' }

/** The figures line, as the summary's accessible name and its own record of what it shows. */
function figuresLine(tally: ProcessTally): string {
  const parts: string[] = []
  for (const kind of SUMMARY_KIND_ORDER) if (tally[kind] > 0) parts.push(`${SUMMARY_KIND_LABEL[kind]}×${tally[kind]}`)
  return parts.join(' · ')
}

/** The connected rows of a segment, in source order. */
function rowsOf(of: ProcessSegment): HTMLElement[] {
  return of.rows.filter(row => row.isConnected)
}

export function createSegmentLane(key: string): SegmentLane {
  return { key, summary: null, read: false, folded: false, opened: false, marked: [], phase: 'idle', held: [], animations: [], timer: 0, frame: 0 }
}

/**
 * The column one segment stands in: the element the layout events travel on and
 * the one the collapse mark goes on. A row's own parent is the group's content,
 * so the column is the nearest chat flow above it.
 */
function columnOf(of: ProcessSegment): HTMLElement | null {
  const anchor = of.rows[0] ?? of.response
  return anchor?.closest<HTMLElement>('[data-chat-flow]') ?? null
}

/** Take the fold mark off every row this segment had marked. */
function unmark(segment: SegmentLane) {
  for (const row of segment.marked) row.removeAttribute(FOLDED_ATTR)
  segment.marked = []
}

/** Put the fold mark on this segment's rows, and remember them for the taking-off. */
function mark(segment: SegmentLane, rows: readonly HTMLElement[]) {
  unmark(segment)
  segment.marked = rows.filter(row => row.isConnected)
  for (const row of segment.marked) row.setAttribute(FOLDED_ATTR, '')
}

/** Paint a summary's figures: a kind that appears gets its roll, every figure shows its value. */
export function paintSummary(summary: SegmentSummary, tally: ProcessTally, motion: boolean) {
  for (const kind of SUMMARY_KIND_ORDER) {
    if (tally[kind] <= 0) continue
    let roll = summary.rolls[kind]
    if (roll === undefined) {
      roll = createNumberRoll(tally[kind])
      summary.rolls[kind] = roll
      const part = document.createElement('span')
      part.setAttribute('data-dsh-claude-segment-part', '')
      part.append(`${SUMMARY_KIND_LABEL[kind]}×`, roll.root)
      summary.button.append(part)
      // The figure opens its own line the way the reference's meta row does:
      // the start pose is committed first, and the next frame releases the
      // transition (D56).
      requestFrame({ write: () => part.setAttribute(PART_IN_ATTR, '') })
      summary.shown[kind] = tally[kind]
      continue
    }
    if (summary.shown[kind] !== tally[kind]) {
      roll.show(tally[kind], motion)
      summary.shown[kind] = tally[kind]
    }
  }
  summary.button.setAttribute('aria-label', figuresLine(tally))
}

/**
 * Build one segment's summary row: a disclosure of the lane's own, marked so
 * the stylesheet paints it in the host's disclosure language. Pressing it is
 * the reader's own choice for that segment, which the lane then keeps.
 */
export function buildSummary(of: ProcessSegment, onPress: () => void): SegmentSummary {
  const root = document.createElement('div')
  root.setAttribute(PROCESS_SEGMENT_ATTR, '')
  root.setAttribute(QUIET_ATTR, '')
  const button = document.createElement('button')
  button.type = 'button'
  button.setAttribute('aria-expanded', 'true')
  root.append(button)
  const summary: SegmentSummary = { root, button, rolls: {}, shown: { thinking: 0, tool: 0, record: 0 }, pulsed: false }
  paintSummary(summary, of.tally, false)
  button.addEventListener('click', onPress)
  return summary
}

/**
 * Where a segment's summary row stands: immediately before the segment's first
 * row, inside whatever holds it. A group can hold rows of two segments, so the
 * segment's own first row is the anchor that keeps them in order.
 */
export function placeSummary(of: ProcessSegment, summary: SegmentSummary) {
  const anchor = of.rows[0] ?? of.response
  if (anchor === null || !anchor.isConnected) return
  if (summary.root.nextElementSibling === anchor && summary.root.parentElement === anchor.parentElement) return
  anchor.parentElement?.insertBefore(summary.root, anchor)
}

/** Take a segment's summary row off the page. */
export function dropSummary(segment: SegmentLane) {
  if (segment.summary === null) return
  for (const roll of Object.values(segment.summary.rolls)) roll?.remove()
  segment.summary.root.remove()
  segment.summary = null
}

/** Stop everything one segment is doing, take its fold mark off and drop its summary. */
export function endSegment(segment: SegmentLane) {
  cancelAnimations(segment)
  releaseHeld(segment.held)
  unmark(segment)
  segment.held = []
  segment.phase = 'idle'
  segment.read = false
  segment.folded = false
  segment.opened = false
  dropSummary(segment)
}

/**
 * Fold one segment: the rows give way in three stops while the summary stands
 * above them, then the rows leave the column and the summary takes a small
 * elastic as the fold lands (D56).
 */
export function collapseSegment(segment: SegmentLane, of: ProcessSegment, resync: () => void) {
  const rows = rowsOf(of)
  const column = columnOf(of)
  const motion = !motionReduced()
  const finish = () => {
    // The rows leave the column here, so the fills the shrink left them at are
    // no longer what keeps them out of it.
    for (const animation of segment.animations) animation.cancel()
    segment.animations = []
    mark(segment, rows)
    if (column !== null) {
      column.removeAttribute(PROCESS_COLLAPSE_ATTR)
      layoutEnd(column)
    }
    if (segment.summary !== null) playElastic(segment.summary.root, motion)
    segment.phase = 'idle'
    resync()
  }
  if (!motion || rows.length === 0) {
    finish()
    return
  }
  if (column !== null) {
    // Nested animation inside the column stands still while it shrinks: the
    // reference pauses everything under its flow for the same reason (D56).
    column.setAttribute(PROCESS_COLLAPSE_ATTR, '')
    layoutStart(column)
  }
  segment.animations = rows
    .map(row => animateRetire(row, motion))
    .filter((animation): animation is Animation => animation !== null)
  const advance = afterPhase(segment, 'collapse', LANE_TIMING.collapse, finish)
  Promise.all(segment.animations.map(animation => animation.finished)).then(advance, advance)
}

/** Open one segment: new space opens first, then the rows are painted into it. */
export function revealSegment(segment: SegmentLane, of: ProcessSegment) {
  unmark(segment)
  const rows = rowsOf(of).filter(row => row.getBoundingClientRect().height > 0)
  const motion = !motionReduced()
  if (!motion || rows.length === 0) {
    segment.phase = 'idle'
    return
  }
  const column = columnOf(of)
  segment.held = rows
  for (const row of rows) row.setAttribute(PROCESS_LANE_ATTR, '')
  if (column !== null) layoutStart(column)
  segment.animations = rows
    .map(row => animateReveal(row, motion))
    .filter((animation): animation is Animation => animation !== null)
  const advance = afterPhase(segment, 'reveal', LANE_TIMING.reveal, () => {
    releaseHeld(segment.held)
    segment.held = []
    if (column !== null) layoutEnd(column)
    segment.phase = 'idle'
  })
  Promise.all(segment.animations.map(animation => animation.finished)).then(advance, advance)
}

/**
 * Bring one segment in line with its rows. A segment folds once its formal
 * output has arrived and the turn's process is on the page; the rows past the
 * last output, still being written, stay where the reader can watch them.
 *
 * @param visible - whether the turn's process is on the page at all.
 * @param resync - the lane's own pass, which a phase asks for when it is over.
 */
export function syncSegment(segment: SegmentLane, of: ProcessSegment, visible: boolean, resync: () => void) {
  if (of.response === null) {
    if (segment.read || segment.summary !== null) endSegment(segment)
    return
  }
  if (segment.summary === null) {
    segment.summary = buildSummary(of, () => {
      segment.opened = !segment.opened
      resync()
    })
  }
  const shouldFold = visible && !segment.opened
  paintSummary(segment.summary, of.tally, !motionReduced())
  segment.summary.button.setAttribute('aria-expanded', String(!shouldFold))
  if (!segment.read) {
    segment.read = true
    segment.folded = shouldFold
    const first = segment.summary.root.parentElement === null
    placeSummary(of, segment.summary)
    if (shouldFold) mark(segment, rowsOf(of))
    // The row's own arrival: the reference opens its cell on a measured height
    // and plays one landing pulse, the first time it stands.
    if (first) {
      const motion = !motionReduced()
      animateCellIn(segment.summary.root, motion)
      playPulse(segment.summary.root, motion)
    }
    return
  }
  if (shouldFold === segment.folded) {
    placeSummary(of, segment.summary)
    return
  }
  segment.folded = shouldFold
  placeSummary(of, segment.summary)
  if (shouldFold) collapseSegment(segment, of, resync)
  else revealSegment(segment, of)
}

/** The reference's cell entrance: the row opens on its own height, fading in. */
function animateCellIn(element: HTMLElement, motion: boolean) {
  if (!motion) return
  const height = element.getBoundingClientRect().height
  if (height < 1) return
  element.animate(
    [{ height: '0px', opacity: 0 }, { height: `${height}px`, opacity: 1 }],
    { duration: LANE_TIMING.cell, easing: LANE_TIMING.easing, fill: 'none' },
  )
}
