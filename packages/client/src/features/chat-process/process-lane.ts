import { PROCESS_COLLAPSE_ATTR, PROCESS_COUNTS_ATTR, PROCESS_FLAT_ATTR, PROCESS_HEAD_ATTR, PROCESS_LANE_ATTR } from '../../constants'
import { requestFrame } from '../../core/frame'
import { motionReduced } from '../../core/prefs'
import { writeScroll } from '../../shared/scroll-owner'
import { afterPhase, animateReveal, animateRetire, cancelAnimations, holdBoxes, LANE_TIMING, layoutEnd, layoutStart, releaseHeld } from './lane-motion'
import { countsLine, rollTally, segmentProcess, tallyProcess } from './process-counts'
import { createSegmentLane, endSegment, syncSegment } from './segment-fold'
import type { LanePhase } from './lane-motion'
import type { SegmentLane } from './segment-fold'
import type { ProcessTally } from './process-counts'
import { syncThinkFollows } from './think-follow'
import { CHAT_FLOW_SELECTOR, CHAT_RUNNING_SELECTOR, CHAT_TURN_ATTRIBUTE, CONVERSATION_SCROLL_SELECTOR, FLOW_BLOCK_SELECTOR, FOLLOW_THRESHOLD_PX, PROCESS_ACTIVITY_SELECTOR, PROCESS_BODY_SELECTOR, PROCESS_CONTENT_SELECTOR, PROCESS_GROUP_SELECTOR, TURN_PROCESS_MEMBER_ATTRIBUTE, TURN_PROCESS_SELECTOR } from '@dsh-claude-style/contracts/dom'

/**
 * The process lane (D55): one turn's thinking, tool calls and process records
 * folded at every formal output, each run of them collapsing into its own
 * summary row — the choreography dsh-better-display presents.
 *
 * The host already renders every one of those rows as a flow row of its own,
 * and splits each assistant step into a `reasoning` part and a `response` part
 * (chat.group-part). The lane moves no host node and draws no content row of its
 * own: it walks the rows of a turn, opens a new segment at every response row
 * (segment-fold.ts), and folds each segment behind its own summary row once that
 * output has arrived. The host's own whole-turn control keeps the turn's total;
 * opening it lays the whole process out as one column again.
 *
 * What is left here is the pass itself: reading the column, the fold the reader
 * owns (his presses on a group header), the flat list, and the counters roll that
 * closes a finished turn.
 */

/** One turn of the conversation, as one pass read it. */
interface TurnScan {
  turn: string
  /** The conversation column this turn stands in. */
  column: HTMLElement
  /** The whole-turn disclosure, when the host has mounted one. */
  control: HTMLElement | null
  /** The column-level process blocks: the groups and the loose process rows. */
  blocks: HTMLElement[]
  /** Every process row of the turn, in source order. */
  rows: HTMLElement[]
  /** The turn's process, split at its formal outputs. */
  segments: ReturnType<typeof segmentProcess>
}

/** What the lane remembers about one turn between passes. */
interface TurnLane {
  control: HTMLElement | null
  /** The conversation column this turn stands in: the layout events travel on it. */
  column: HTMLElement | null
  blocks: HTMLElement[]
  rows: HTMLElement[]
  read: boolean
  open: boolean
  /** Bumped on every closed-to-open step: a press recorded before it is a press of another opening. */
  generation: number
  pendingReveal: boolean
  phase: LanePhase
  shown: ProcessTally
  tally: ProcessTally
  line: string
  held: HTMLElement[]
  animations: Animation[]
  timer: number
  frame: number
  roll: number
  /** The segments, keyed by the lane's own segment key. */
  segments: Map<string, SegmentLane>
}

/** The lane's state, per conversation column and turn: a session switch replaces the column. */
const lanes = new Map<Element, Map<string, TurnLane>>()
/** A process group's header the reader pressed himself: the lane leaves that group alone. */
const readerTouched = new WeakSet<Element>()
/**
 * When the lane last pressed a group's header, and how often it has tried.
 *
 * A press is not always answered: the host folds a completed turn's groups from an
 * effect, and its own state can settle a beat after the turn's rows have come
 * back, so a press landing in that window is undone. The lane presses again after
 * a pause instead of assuming one press was heard, and a body it has seen open
 * clears the record.
 */
const pressed = new WeakMap<Element, { at: number, tries: number, generation: number }>()
/** How long the lane waits before pressing the same header again. */
const PRESS_RETRY_MS = 400
/** How many times one header is pressed before the lane leaves it to the reader. */
const PRESS_TRIES = 12
/** Set while the lane is pressing a header, so the reader's own press is told apart. */
let pressing = false

function lanesOf(column: Element): Map<string, TurnLane> {
  const found = lanes.get(column)
  if (found !== undefined) return found
  const created = new Map<string, TurnLane>()
  lanes.set(column, created)
  return created
}

function createLane(): TurnLane {
  return {
    control: null,
    column: null,
    blocks: [],
    rows: [],
    read: false,
    open: false,
    generation: 0,
    pendingReveal: false,
    phase: 'idle',
    shown: { thinking: 0, tool: 0, record: 0 },
    tally: { thinking: 0, tool: 0, record: 0 },
    line: '',
    held: [],
    animations: [],
    timer: 0,
    frame: 0,
    roll: 0,
    segments: new Map(),
  }
}

/** The conversation columns in the page: the group content carries the same mark, so only the outermost counts. */
function conversationColumns(): HTMLElement[] {
  return [...document.querySelectorAll(CHAT_FLOW_SELECTOR)].filter((element): element is HTMLElement => {
    return element instanceof HTMLElement && element.parentElement?.closest(CHAT_FLOW_SELECTOR) === null
  })
}

/** Read every turn of one column: its control, its process blocks, its process rows and its segments. */
function readTurns(column: HTMLElement): TurnScan[] {
  const byTurn = new Map<string, TurnScan>()
  /** The flow keys already counted for a turn: a re-render can hold two copies of one row. */
  const counted = new Map<string, Set<string>>()
  const scanOf = (turn: string) => {
    const found = byTurn.get(turn)
    if (found !== undefined) return found
    const created: TurnScan = { turn, column, control: null, blocks: [], rows: [], segments: [] }
    byTurn.set(turn, created)
    return created
  }
  const addRow = (turn: string, row: HTMLElement) => {
    const keys = counted.get(turn) ?? new Set<string>()
    counted.set(turn, keys)
    // One part of a node, not the node: the host keys two parts of one assistant
    // step apart by their flow key, so that key is what identifies a row. A row
    // the host has mounted twice while moving it is counted once.
    const key = row.getAttribute(FLOW_BLOCK_SELECTOR.slice(1, -1))
    if (key !== null) {
      if (keys.has(key)) return
      keys.add(key)
    }
    scanOf(turn).rows.push(row)
  }
  for (const child of column.children) {
    if (!(child instanceof HTMLElement)) continue
    const turn = child.getAttribute(CHAT_TURN_ATTRIBUTE)
    if (turn === null) continue
    const scan = scanOf(turn)
    const control = child.querySelector(TURN_PROCESS_SELECTOR)
    if (control instanceof HTMLElement) scan.control = control
    if (child.matches(PROCESS_GROUP_SELECTOR)) {
      scan.blocks.push(child)
      const content = child.querySelector(PROCESS_CONTENT_SELECTOR)
      if (content === null) continue
      for (const row of content.children) {
        if (row instanceof HTMLElement && row.hasAttribute(TURN_PROCESS_MEMBER_ATTRIBUTE)) addRow(turn, row)
      }
      continue
    }
    if (child.hasAttribute(TURN_PROCESS_MEMBER_ATTRIBUTE)) {
      scan.blocks.push(child)
      addRow(turn, child)
    }
  }
  for (const scan of byTurn.values()) scan.segments = segmentProcess(scan.rows)
  return [...byTurn.values()]
}

/** Write the counts line onto the turn's control, when there is one and the value moved. */
function writeCounts(lane: TurnLane, line: string) {
  const control = lane.control
  if (control === null || !control.isConnected) return
  if (control.getAttribute(PROCESS_COUNTS_ATTR) === line) return
  control.setAttribute(PROCESS_COUNTS_ATTR, line)
}

/* ---------- the whole turn: the counters and the host's own fold ---------- */

/** Roll the turn's counters from one set of figures to another, then hand the lane on. */
function rollCounters(lane: TurnLane, from: ProcessTally, to: ProcessTally, line: string, next: () => void) {
  lane.line = line
  lane.tally = { ...to }
  const end = () => {
    lane.phase = 'idle'
    next()
  }
  if (lane.control === null || motionReduced() || countsLine(from) === line) {
    lane.shown = { ...to }
    writeCounts(lane, line)
    end()
    return
  }
  const startedAt = performance.now()
  const finish = afterPhase(lane, 'count', LANE_TIMING.count, () => {
    lane.shown = { ...to }
    writeCounts(lane, line)
    end()
  })
  const tick = () => {
    const at = Math.min(1, (performance.now() - startedAt) / LANE_TIMING.count)
    writeCounts(lane, countsLine(rollTally(from, to, at)))
    if (at < 1) {
      lane.roll = requestAnimationFrame(tick)
      return
    }
    lane.roll = 0
    finish()
  }
  lane.roll = requestAnimationFrame(tick)
}

/** Hand the held boxes back: the host's own `hidden` attribute takes them from here. */
function release(lane: TurnLane) {
  cancelAnimations(lane)
  if (lane.roll !== 0) {
    cancelAnimationFrame(lane.roll)
    lane.roll = 0
  }
  releaseHeld(lane.held)
  lane.held = []
  if (lane.column !== null) {
    lane.column.removeAttribute(PROCESS_COLLAPSE_ATTR)
    layoutEnd(lane.column)
  }
  lane.phase = 'idle'
  lane.shown = { ...lane.tally }
  writeCounts(lane, lane.line)
  // The host can settle a row a beat after the pass that closed this turn, and the
  // figures are written from whatever that pass read: one more pass over settled
  // DOM is what keeps a transient row out of the reader's summary.
  requestFrame({ write: () => syncProcessLane() })
}

/** After the shrink the counters roll, then the lane pauses before it lets go. */
function countThenRelease(lane: TurnLane) {
  rollCounters(lane, lane.shown, lane.tally, lane.line, () => {
    afterPhase(lane, 'settle', LANE_TIMING.settle, () => release(lane))
  })
}

/** The host folded this turn: shrink the blocks, roll the counters, then hand them back. */
function startCollapse(lane: TurnLane, scan: TurnScan, column: Element | null) {
  lane.held = holdBoxes([...scan.blocks, ...scan.rows])
  if (motionReduced()) {
    countThenRelease(lane)
    return
  }
  if (column !== null) {
    // Everything nested inside stands still while the turn shrinks, and the
    // follow stands down for the length of it (D56).
    column.setAttribute(PROCESS_COLLAPSE_ATTR, '')
    layoutStart(column)
  }
  lane.animations = scan.blocks
    .map(block => animateRetire(block, true))
    .filter((animation): animation is Animation => animation !== null)
  const advance = afterPhase(lane, 'collapse', LANE_TIMING.collapse, () => countThenRelease(lane))
  Promise.all(lane.animations.map(animation => animation.finished)).then(advance, advance)
}

/** The lane wants this turn's rows shown, and the rows arrive over the reveal. */
function startReveal(lane: TurnLane, scan: TurnScan, column: Element | null) {
  // A block with no height measured yet has nothing to grow from; the host
  // paints it on its own, one frame later.
  lane.held = scan.blocks.filter(block => block.getBoundingClientRect().height > 0)
  for (const block of lane.held) block.setAttribute(PROCESS_LANE_ATTR, '')
  if (motionReduced() || lane.held.length === 0) {
    release(lane)
    return
  }
  if (column !== null) layoutStart(column)
  lane.animations = lane.held
    .map(block => animateReveal(block, true))
    .filter((animation): animation is Animation => animation !== null)
  const advance = afterPhase(lane, 'reveal', LANE_TIMING.reveal, () => release(lane))
  Promise.all(lane.animations.map(animation => animation.finished)).then(advance, advance)
}

/* ---------- the fold the reader owns ---------- */

/** The reader's own press on a group header, so the lane never reopens what he closed. */
function rememberReaderPress(event: Event) {
  if (pressing) return
  const target = event.target
  if (!(target instanceof Element)) return
  const header = target.closest(PROCESS_ACTIVITY_SELECTOR)
  if (header !== null) readerTouched.add(header)
}

/**
 * Press a process group's header the way process-fold.ts does: the host's own
 * state machine is what opens the body, and its `focus()` scrolls and takes the
 * focus, so both are put back before the reader sees them move.
 */
function pressHeader(header: HTMLElement) {
  const scroller = header.closest<HTMLElement>(CONVERSATION_SCROLL_SELECTOR)
  const scrollTop = scroller === null ? null : scroller.scrollTop
  const wasAtBottom = scroller !== null
    && scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight <= FOLLOW_THRESHOLD_PX
  const previousFocus = document.activeElement
  pressing = true
  try {
    header.click()
  } finally {
    pressing = false
  }
  if (scroller !== null && scrollTop !== null && scroller.scrollTop !== scrollTop) {
    writeScroll(scroller, wasAtBottom ? scroller.scrollHeight : scrollTop, 'fold')
  }
  if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus({ preventScroll: true })
  if (document.activeElement === header) header.blur()
}

/**
 * Present one turn as a flat list: every group body stands open and carries no
 * height cap, and the group's own header gives way to its rows, which is what
 * leaves one line per thinking row and one per tool row.
 *
 * A closed turn is walked as well, so the marks of the pass before it folded come
 * off; `open` is what the turn reads as, and `press` adds whether the lane may
 * open a body itself in this pass.
 */
function flatten(scan: TurnScan, open: boolean, press: boolean, generation: number) {
  for (const group of scan.blocks) {
    if (!group.matches(PROCESS_GROUP_SELECTOR)) continue
    const header = group.querySelector(PROCESS_ACTIVITY_SELECTOR)
    const body = group.querySelector(PROCESS_BODY_SELECTOR)
    if (!(header instanceof HTMLElement) || !(body instanceof HTMLElement)) continue
    const head = header.parentElement
    if (!open || body.hasAttribute('hidden')) {
      head?.removeAttribute(PROCESS_HEAD_ATTR)
      group.removeAttribute(PROCESS_FLAT_ATTR)
      if (!press || readerTouched.has(header)) continue
      const record = pressed.get(header)
      const tries = record !== undefined && record.generation === generation ? record.tries : 0
      if (tries >= PRESS_TRIES) continue
      const now = performance.now()
      if (record !== undefined && record.generation === generation && now - record.at < PRESS_RETRY_MS) continue
      pressed.set(header, { at: now, tries: tries + 1, generation })
      pressHeader(header)
      continue
    }
    pressed.delete(header)
    head?.setAttribute(PROCESS_HEAD_ATTR, '')
    group.setAttribute(PROCESS_FLAT_ATTR, '')
  }
}

/** Bring every segment of one turn in line, dropping the ones the host re-keyed away. */
function syncSegments(lane: TurnLane, scan: TurnScan) {
  const seen = new Set<string>()
  for (const of of scan.segments) {
    seen.add(of.key)
    const segment = lane.segments.get(of.key) ?? createSegmentLane(of.key)
    lane.segments.set(of.key, segment)
    syncSegment(segment, of, true, () => syncProcessLane())
  }
  for (const [key, segment] of lane.segments) {
    if (seen.has(key)) continue
    endSegment(segment)
    lane.segments.delete(key)
  }
}

/** Take every segment of one turn off the page, marks and summaries both. */
function endSegments(lane: TurnLane) {
  for (const segment of lane.segments.values()) endSegment(segment)
  lane.segments.clear()
}

/** Bring one turn's lane in line with the rows the host has mounted. */
function syncTurn(lane: TurnLane, scan: TurnScan) {
  lane.control = scan.control ?? lane.control
  lane.column = scan.column
  lane.blocks = scan.blocks
  lane.rows = scan.rows
  const tally = tallyProcess(scan.rows)
  const line = countsLine(tally)
  const open = [...scan.blocks, ...scan.rows].some(element => !element.hasAttribute('hidden'))
  if (!lane.read) {
    lane.read = true
    lane.open = open
    lane.tally = tally
    lane.line = line
    lane.shown = { ...tally }
    writeCounts(lane, line)
    flatten(scan, open, open, lane.generation)
    if (open) syncSegments(lane, scan)
    return
  }
  if (lane.open && !open && lane.phase === 'idle') {
    // The host folded the whole turn: the lane's own summaries come off with it,
    // and the shrink that follows is the turn's, not one segment's.
    endSegments(lane)
    lane.open = open
    flatten(scan, open, false, lane.generation)
    startCollapse(lane, scan, scan.column)
    return
  }
  // The list stands before anything measures it: opening a group body is the
  // host's own state, and the rows have to be in place for the reveal to size.
  flatten(scan, open, open && lane.phase !== 'collapse', lane.generation)
  if (open) syncSegments(lane, scan)
  if (lane.phase !== 'idle') return
  const wasOpen = lane.open
  lane.open = open
  if (!wasOpen && open) {
    lane.generation += 1
    lane.pendingReveal = true
    return
  }
  if (lane.pendingReveal) {
    lane.pendingReveal = false
    startReveal(lane, scan, scan.column)
    return
  }
  if (line !== lane.line) rollCounters(lane, lane.shown, tally, line, () => {})
}

/** Stop everything one turn's lane is doing and take its marks off. */
function endLane(lane: TurnLane) {
  cancelAnimations(lane)
  if (lane.roll !== 0) {
    cancelAnimationFrame(lane.roll)
    lane.roll = 0
  }
  releaseHeld(lane.held)
  lane.held = []
  lane.pendingReveal = false
  endSegments(lane)
}

/**
 * The live figures (D56): while a turn is still running the host has not put up
 * its whole-turn row, so the turn's totals ride the host's own running line at
 * the end of the flow — the one line the reader is looking at — and the figures
 * grow there as the work does.
 */
function writeLiveCounts(column: HTMLElement, scan: TurnScan | undefined) {
  const running = column.querySelector(CHAT_RUNNING_SELECTOR)
  if (!(running instanceof HTMLElement)) return
  const line = scan === undefined ? '' : countsLine(tallyProcess(scan.rows))
  if (line === '') {
    running.removeAttribute(PROCESS_COUNTS_ATTR)
    return
  }
  if (running.getAttribute(PROCESS_COUNTS_ATTR) !== line) running.setAttribute(PROCESS_COUNTS_ATTR, line)
}

/** One pass: read every column, bring each turn's lane in line, drop what is gone. */
export function syncProcessLane() {
  const columns = conversationColumns()
  const live = new Set<Element>(columns)
  for (const column of columns) {
    const byTurn = lanesOf(column)
    const seen = new Set<string>()
    const scans = readTurns(column)
    for (const scan of scans) {
      seen.add(scan.turn)
      const lane = byTurn.get(scan.turn) ?? createLane()
      byTurn.set(scan.turn, lane)
      syncTurn(lane, scan)
    }
    writeLiveCounts(column, scans.at(-1))
    for (const [turn, lane] of byTurn) {
      if (seen.has(turn)) continue
      endLane(lane)
      byTurn.delete(turn)
    }
  }
  for (const [column, byTurn] of lanes) {
    if (live.has(column)) continue
    for (const lane of byTurn.values()) endLane(lane)
    lanes.delete(column)
  }
  syncThinkFollows()
}

/** Watch the reader's own presses, which is how a group he closed stays closed. */
export function startProcessLane() {
  document.addEventListener('click', rememberReaderPress, true)
  document.addEventListener('keydown', rememberReaderPress, true)
  return () => {
    document.removeEventListener('click', rememberReaderPress, true)
    document.removeEventListener('keydown', rememberReaderPress, true)
    for (const byTurn of lanes.values()) {
      for (const lane of byTurn.values()) endLane(lane)
    }
    lanes.clear()
  }
}
