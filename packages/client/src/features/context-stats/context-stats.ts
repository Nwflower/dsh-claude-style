import { SESSION_STATS_ATTR } from '../../constants'
import { createSessionStats } from './session-stats'
import type { SessionCostReading } from './session-stats'
import type { HostContext } from '@dsh-claude-style/engine/host'
import type { CloseReason, FeatureHandle } from '@dsh-claude-style/engine/scheduler'
import type { FeatureUi } from '../../core/feature'
import type manifest from './context-stats.manifest'

/** The statistics as another feature reads them: the shown session's cost, and word of each rewrite. */
export interface ContextStatsHandle extends FeatureHandle {
  sessionCost(): SessionCostReading | null
  onSessionCost(listener: () => void): () => void
}

/**
 * The session's numbers in the context popover
 *
 * The host's stats row and its two stat dialogs give way to the context
 * meter's own panel, which this feature fills from the host's session
 * projections (session-stats.ts). It runs under the `context` position alone:
 * with the numbers asked onto a line of their own, the host's statistics row
 * and its dialogs stand as the host draws them and this feature is not
 * installed at all.
 */
export function install(ctx: HostContext, ui: FeatureUi<typeof manifest>) {
  // The ring the composer row carries is the feature's own (meter-ring.ts,
  // installed before this one): its reading and the face the panel opens from
  // both cross over, and it stands down with this feature's switch.
  const ring = () => (typeof ui.meterRing?.root === 'function' ? ui.meterRing : null)
  // The model feature names the route the shown session takes; the statistics
  // price the platform's own billing and leave a provider that settles
  // elsewhere out of the account's balance (features/context-stats/session-stats.ts).
  const provider = () => (typeof ui.model?.provider === 'function' ? ui.model.provider() : null)
  const stats = createSessionStats(ctx, ring, provider)

  ui.contextStats = {
    measure: stats.measure,
    sync: stats.sync,
    // Streaming text cannot move the composer row or change a projection by
    // itself; projection subscriptions schedule the figures on their own frame.
    skipOnContentOnly: true,
    /**
     * A viewport move under the context panel: the panel is the host's,
     * and the feature only re-takes its own reading of where the panel's
     * edges belong.
     */
    reposition: stats.reposition,
    /** Composer focus closes the panel. */
    close(reason?: CloseReason) {
      if (reason === 'composer') stats.close()
    },
    sessionCost: stats.sessionCost,
    onSessionCost: stats.onSessionCost,
  }

  // The composer restyle hides the host's stat dialogs only while this
  // says their replacement is installed.
  document.body.setAttribute(SESSION_STATS_ATTR, '')

  return () => {
    stats.teardown()
    document.body.removeAttribute(SESSION_STATS_ATTR)
  }
}
