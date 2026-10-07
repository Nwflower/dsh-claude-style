import { SESSION_STATS_ATTR } from '../../constants'
import { createSessionStats } from './session-stats'
import type { HostContext } from '../../core/host'
import type { CloseReason, Ui } from '../../core/scheduler'

/**
 * The session's numbers in the context popover (docs/decisions D27).
 *
 * The host's stats row and its two stat dialogs give way to the context
 * meter's own panel, which this feature fills from the host's session
 * projections (session-stats.ts). It switches together with the
 * permission control: both take over the composer's bottom line.
 */
export function installContextStats(ctx: HostContext, ui: Ui) {
  const stats = createSessionStats(ctx)

  ui.contextStats = {
    sync: stats.sync,
    /**
     * A viewport move under the context panel: the panel is the host's,
     * and the feature only re-takes its own reading of where the panel's
     * right edge belongs.
     */
    reposition: stats.reposition,
    /** Composer focus closes the panel. */
    close(reason?: CloseReason) {
      if (reason === 'composer') stats.close()
    },
  }

  // The composer restyle hides the host's stat dialogs only while this
  // says their replacement is installed.
  document.body.setAttribute(SESSION_STATS_ATTR, '')

  return () => {
    stats.teardown()
    document.body.removeAttribute(SESSION_STATS_ATTR)
  }
}
