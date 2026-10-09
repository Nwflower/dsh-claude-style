import { CHAT_CALL_SELECTOR, CHAT_GROUP_PART_ATTRIBUTE, CHAT_GROUP_PART_RESPONSE, FLOW_BLOCK_SELECTOR, THINK_ROW_SELECTOR } from '@dsh-claude-style/contracts/dom'

/**
 * The process lane's tallies, the counts line built from them, and the turn's
 * split into segments (D55).
 *
 * The lane counts what it actually shows: one thinking row per reasoning block,
 * one tool row per root call, one record per remaining process row. The host
 * publishes two figures of its own on the whole-turn control
 * (`data-turn-process-messages`, `data-turn-process-tool-calls`), and they count
 * a different thing — a step is not a row, and a subcall is not a root call —
 * so the summary describes the list rather than borrowing the host's arithmetic.
 */

/** The attribute one flow row carries its own key in (D44: chat.flow-block). */
const FLOW_KEY_ATTRIBUTE = FLOW_BLOCK_SELECTOR.slice(1, -1)

/** How many of each kind of row one turn's process holds. */
export interface ProcessTally {
  thinking: number
  tool: number
  record: number
}

/** The tally of a turn with no process rows. */
export const EMPTY_TALLY: ProcessTally = { thinking: 0, tool: 0, record: 0 }

/**
 * The call rows that are not inside another call row of the same member. A tool
 * member renders its root call and every subcall of it; only the root is an
 * item of the lane.
 */
function rootCalls(row: Element): Element[] {
  const calls = row.matches(CHAT_CALL_SELECTOR)
    ? [row, ...row.querySelectorAll(CHAT_CALL_SELECTOR)]
    : [...row.querySelectorAll(CHAT_CALL_SELECTOR)]
  return calls.filter((call) => {
    for (let parent = call.parentElement; parent !== null; parent = parent.parentElement) {
      if (parent.matches(CHAT_CALL_SELECTOR)) return false
    }
    return true
  })
}

/**
 * Count one turn's process rows.
 * @param rows - the turn's process rows, in source order.
 */
export function tallyProcess(rows: readonly Element[]): ProcessTally {
  const tally = { ...EMPTY_TALLY }
  for (const row of rows) {
    if (row.matches(THINK_ROW_SELECTOR) || row.querySelector(THINK_ROW_SELECTOR) !== null) {
      tally.thinking += 1
      continue
    }
    const calls = rootCalls(row)
    if (calls.length > 0) {
      tally.tool += calls.length
      continue
    }
    tally.record += 1
  }
  return tally
}

/**
 * The counts line the stylesheet appends to the host's own label. The joining
 * separator is part of the value, so an empty tally renders nothing at all.
 */
export function countsLine(tally: ProcessTally): string {
  const parts: string[] = []
  if (tally.thinking > 0) parts.push(`思考×${tally.thinking}`)
  if (tally.tool > 0) parts.push(`工具×${tally.tool}`)
  if (tally.record > 0) parts.push(`记录×${tally.record}`)
  return parts.length === 0 ? '' : ` · ${parts.join(' · ')}`
}

/**
 * One segment of a turn's process: the run of rows before one formal output.
 *
 * The host splits an assistant step into a `reasoning` part and a `response`
 * part (chat.group-part), and the lane folds the process at every formal output
 * rather than into a single block: a turn that answered twice holds two
 * segments, one per output (D55).
 */
export interface ProcessSegment {
  /** The key the lane knows this segment by: its response row's flow key. */
  key: string
  /** The rows between the previous formal output and this one. */
  rows: HTMLElement[]
  /** The formal output itself: the response row the host rendered. */
  response: HTMLElement | null
  /** This segment's figures. */
  tally: ProcessTally
}

/**
 * Split one turn's process rows at its formal outputs. A response row ends the
 * segment before it; rows past the last one (the turn still writing, or the
 * answer's own step) gather into an open segment whose response is null.
 *
 * @param rows - the turn's process rows, in source order.
 */
export function segmentProcess(rows: readonly HTMLElement[]): ProcessSegment[] {
  const segments: ProcessSegment[] = []
  let current: HTMLElement[] = []
  const flush = (response: HTMLElement | null) => {
    if (current.length === 0 && response === null) return
    const key = response === null ? 'segment:open' : response.getAttribute(FLOW_KEY_ATTRIBUTE) ?? `segment:${segments.length}`
    segments.push({ key, rows: current, response, tally: tallyProcess(current) })
    current = []
  }
  for (const row of rows) {
    if (row.getAttribute(CHAT_GROUP_PART_ATTRIBUTE) === CHAT_GROUP_PART_RESPONSE) flush(row)
    else current.push(row)
  }
  flush(null)
  return segments
}

/**
 * The tallies a counter roll passes through: each figure walks its own way from
 * the old total to the new one, and a figure that arrives starts at zero.
 * @param at - the roll's share, 0 at the start and 1 at the end.
 */
export function rollTally(from: ProcessTally, to: ProcessTally, at: number): ProcessTally {
  const share = Math.max(0, Math.min(1, at))
  const walk = (start: number, end: number) => Math.round(start + (end - start) * share)
  return { thinking: walk(from.thinking, to.thinking), tool: walk(from.tool, to.tool), record: walk(from.record, to.record) }
}
