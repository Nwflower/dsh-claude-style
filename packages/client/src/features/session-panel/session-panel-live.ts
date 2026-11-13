/**
 * Following the statistics feature's live reading from the rail (D94).
 *
 * The figures the rail's two tables print are the ones the composer's line
 * prints, so the rail subscribes to the same entry instead of asking the host
 * route for a second, settled copy (session-panel-figures.ts makes the rows).
 * The feature is installed from a chunk of its own and can be switched off, so
 * its handle comes and goes under the rail: the body's mark says when it lands,
 * and a handle that leaves hands the rail back to the route's folded numbers.
 */
import * as React from 'react'
import { subscribeMutations } from '@dsh-claude-style/engine/bus'
import { SESSION_STATS_ATTR } from '../../constants'
import type { SessionFigures } from '../../shared/session-projections'
import type { FeatureUi } from '../../core/feature'
import type manifest from './session-panel.manifest'

/** The features this generation reads: the statistics feature's live reading (session-panel.manifest.ts). */
type PanelUi = FeatureUi<typeof manifest>

/** The feature registry this generation runs on, for the statistics feature's handle. */
let registry: PanelUi | null = null

/** Hand the registry over for this generation; its teardown gives it back. */
export function setPanelUi(next: PanelUi | null) {
  registry = next
  return next
}

/** Give the registry back only when it is still the one this generation handed over. */
export function clearPanelUi(ctx: PanelUi | null) {
  if (registry === ctx) registry = null
}

/** The live reading for one session, or null while the statistics feature shows another session. */
function figuresOf(sessionId: string): SessionFigures | null {
  const handle = registry?.contextStats
  if (typeof handle?.figures !== 'function') return null
  const figures = handle.figures()
  return figures !== null && figures.sessionId === sessionId ? figures : null
}

/**
 * Follow the live reading of one session.
 * @param sessionId - the session the rail shows.
 * @returns the reading, or null while this session has none published.
 */
export function useLiveFigures(sessionId: string): SessionFigures | null {
  const read = React.useCallback(() => figuresOf(sessionId), [sessionId])
  const [figures, setFigures] = React.useState<SessionFigures | null>(read)
  React.useEffect(() => {
    /** The subscription to the handle of the moment, while one answers. */
    let stop: (() => void) | null = null
    const detach = () => {
      if (stop !== null) stop()
      stop = null
    }
    const attach = () => {
      const handle = registry?.contextStats
      if (typeof handle?.onFigures === 'function') stop = handle.onFigures(() => { setFigures(read()) })
      setFigures(read())
    }
    attach()
    // The statistics feature is installed from a chunk of its own and can be
    // switched off under the rail (D72): its install stamps the body, and that
    // mark is what says the handle arrived or left. Without a handle the rail
    // prints the route's folded figures again (session-panel-figures.ts).
    const stopMark = subscribeMutations(document.body, { attributes: true, attributeFilter: [SESSION_STATS_ATTR] }, () => {
      detach()
      attach()
    })
    return () => {
      detach()
      stopMark()
    }
  }, [read])
  return figures
}
