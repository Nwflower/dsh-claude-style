/**
 * The panel's two figures tables read the same live reading the composer's line
 * below the input prints (D113).
 *
 * The figures are the host's own `sessionStats` and `tokenUsage` projections,
 * which the statistics feature reads on the page. The host settles its usage one
 * step at a time, so a table fed straight from the projection would stand still
 * through a whole answer and jump when the step ends; the line moves because the
 * statistics feature adds the text streaming on the page to that settled total
 * (features/context-stats/stream-estimate.ts). Printing the same entry makes the
 * panel's numbers one figure with the line's, measured once.
 */
import { formatMoneyMicro } from '@dsh-claude-style/contracts/prices'
import type { HostSessionStatsProjection, HostTokenUsageProjection } from '@dsh-claude-style/contracts/services'
import type { SessionFigures } from '../../shared/session-projections'

/** How the session ran: its counts and times, each a whole number. */
export type PanelRunFigures = Omit<HostSessionStatsProjection, 'dialog'>

/**
 * What the two tables print. A projection that has said nothing is not a zero:
 * its half stays null, and the table that prints it keeps its placeholders.
 */
export interface PanelFigures {
  run: PanelRunFigures | null
  usage: HostTokenUsageProjection | null
  /** The cost as the reader reads it, or null while no figure is known or billing is off. */
  cost: string | null
}

/**
 * The live reading's cost as the reader reads it: already in the currency it was
 * priced in, and grown by the answer still streaming (shared/session-projections.ts).
 * @param figures - the session's live figures.
 * @returns the written figure, or null while no cost is known or billing is off.
 */
export function figuresCostText(figures: SessionFigures) {
  if (figures.cost === null || figures.currency === null) return null
  return formatMoneyMicro(figures.cost, figures.currency)
}

/**
 * The tables' rows from the live reading.
 * @param figures - the live reading for the session the panel shows.
 */
export function panelFiguresOf(figures: SessionFigures): PanelFigures {
  const stats = figures.stats
  const usage = figures.usage
  return {
    run: stats === null ? null : {
      turns: Math.round(stats.turns),
      steps: Math.round(stats.steps),
      llmMs: Math.round(stats.llmMs),
      toolMs: Math.round(stats.toolMs),
      ttftMs: Math.round(stats.ttftMs),
      ttftSteps: Math.round(stats.ttftSteps),
      decodeMs: Math.round(stats.decodeMs),
      decodeTokens: Math.round(stats.decodeTokens),
    },
    usage: usage === null ? null : {
      uncachedInputTokens: Math.round(usage.uncachedInputTokens),
      cacheReadTokens: Math.round(usage.cacheReadTokens),
      cacheWriteTokens: Math.round(usage.cacheWriteTokens),
      outputTokens: Math.round(usage.outputTokens),
    },
    cost: figuresCostText(figures),
  }
}
