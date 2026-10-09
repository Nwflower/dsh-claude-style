import type { LiveStep, LiveTurnItem } from './live-turn'

/**
 * The live fold's choreography (D57), ported from dsh-better-display (MIT):
 * shrink the steps a new fold takes, roll its counts, hold still, then reveal
 * what arrived meanwhile. One fold runs at a time; new data waits for the
 * current one to finish rather than restarting its shrink.
 */

/** Phase lengths in ms, on the presentation clock. */
export const FOLD_TIMING = {
  collapse: 320,
  count: 160,
  settle: 80,
  reveal: 180,
  /**
   * Added to every phase's deadline before the watchdog moves on. Phases advance
   * on animation promises and rendered frames, and both can stall: a cancelled
   * animation rejects, a compositor can leave one pending, a background tab
   * delivers no frames. A phase that never ended would freeze the turn.
   */
  watchdogSlack: 240,
} as const

export type FoldPhase = 'idle' | 'collapse' | 'count' | 'settle' | 'reveal'

export type FlowRow =
  | { kind: 'summary', key: string, item: Extract<LiveTurnItem, { kind: 'fold' }> }
  | { kind: 'step', key: string, step: LiveStep, foldKey?: string }

/** The flat rows of a turn. A step keeps its parent and its React key whether or not a fold holds it. */
export function flowRows(items: readonly LiveTurnItem[]): FlowRow[] {
  return items.flatMap((item): FlowRow[] => item.kind === 'fold'
    ? [{ kind: 'summary', key: item.key, item }, ...item.steps.map(step => ({ kind: 'step' as const, key: step.key, step, foldKey: item.key }))]
    : [{ kind: 'step', key: item.key, step: item.step }])
}

/** The steps that were open before and sit in a closed fold after: the rows that shrink. */
export function retiringKeys(before: readonly LiveTurnItem[], after: readonly LiveTurnItem[], open: Readonly<Record<string, boolean>>): string[] {
  const folded = new Set(flowRows(after).filter(row => row.kind === 'step' && row.foldKey !== undefined && open[row.foldKey] !== true).map(row => row.key))
  return flowRows(before).filter(row => row.kind === 'step' && row.foldKey === undefined && folded.has(row.key)).map(row => row.key)
}

/**
 * The rows shown while a fold shrinks: the rows from before, with only the new
 * summaries inserted, their counts at zero for the roll. Incoming content waits.
 */
export function collapseRows(before: readonly LiveTurnItem[], target: readonly LiveTurnItem[]): FlowRow[] {
  const rows = flowRows(before)
  const headers = new Set(rows.filter(row => row.kind === 'summary').map(row => row.key))
  for (const item of target) {
    if (item.kind !== 'fold' || headers.has(item.key)) continue
    const members = new Set(item.steps.map(step => step.key))
    const at = rows.findIndex(row => members.has(row.key))
    if (at >= 0) rows.splice(at, 0, { kind: 'summary', key: item.key, item: { ...item, summary: item.summary.replace(/\d+/g, '0') } })
  }
  return rows
}

/** Whether a user message arrived between two presentations: it bypasses the waiting fold. */
export function containsNewUser(before: readonly LiveTurnItem[], after: readonly LiveTurnItem[]): boolean {
  const users = new Set(before.filter(item => item.kind === 'user').map(item => item.key))
  return after.some(item => item.kind === 'user' && !users.has(item.key))
}
