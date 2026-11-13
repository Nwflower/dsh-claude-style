/**
 * The rail's two figures tables read the same live reading the composer's line
 * below the input prints (D94).
 *
 * The host settles its usage one step at a time, so a table fed from the route's
 * fold would stand still through a whole answer and jump when the step ends; the
 * line moves because the statistics feature adds the text streaming on the page
 * to that fold (features/context-stats/stream-estimate.ts). Printing the same
 * entry makes the rail's numbers one figure with the line's, measured once.
 */
import { figuresCostText } from './stats-cost'
import type { PanelStats } from '@dsh-claude-style/contracts/session-panel'
import type { SessionFigures } from '../../shared/session-projections'

/** What the two tables print: one session's figures, and the cost word that goes with them. */
export interface PanelFigures {
  stats: PanelStats
  /** The cost as the reader reads it, or null while no figure is known. */
  cost: string | null
}

/**
 * The tables' rows from the live reading, keeping the route's folded numbers
 * wherever the reading has not answered yet: a projection that has said nothing
 * is not a zero, so the rail shows the host's settled figure until it speaks.
 * @param figures - the live reading for the session the rail shows.
 * @param settled - the route's folded figures, or null while it has none.
 */
export function panelFiguresOf(figures: SessionFigures, settled: PanelStats | null): PanelFigures {
  const stats = figures.stats
  const usage = figures.usage
  /** One number: the live reading's, else the route's, and an unread one stays zero. */
  const count = (live: number | undefined, kept: number | undefined) => Math.round(live ?? kept ?? 0)
  return {
    stats: {
      turns: count(stats?.turns, settled?.turns),
      steps: count(stats?.steps, settled?.steps),
      llmMs: count(stats?.llmMs, settled?.llmMs),
      toolMs: count(stats?.toolMs, settled?.toolMs),
      ttftMs: count(stats?.ttftMs, settled?.ttftMs),
      ttftSteps: count(stats?.ttftSteps, settled?.ttftSteps),
      decodeMs: count(stats?.decodeMs, settled?.decodeMs),
      decodeTokens: count(stats?.decodeTokens, settled?.decodeTokens),
      uncachedInputTokens: count(usage?.uncachedInputTokens, settled?.uncachedInputTokens),
      cacheReadTokens: count(usage?.cacheReadTokens, settled?.cacheReadTokens),
      cacheWriteTokens: count(usage?.cacheWriteTokens, settled?.cacheWriteTokens),
      outputTokens: count(usage?.outputTokens, settled?.outputTokens),
      // The cost is printed from the reading itself: the route's total is one
      // settlement old, which is the standing still this reading removes.
      cost: null,
    },
    cost: figuresCostText(figures),
  }
}
