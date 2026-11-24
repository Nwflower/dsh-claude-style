/**
 * Following the statistics feature's live reading from the panel sections (D113).
 *
 * The figures the panel's two tables print are the ones the composer's line
 * prints, so the tables subscribe to the same entry instead of asking the host
 * route for a second, settled copy (session-panel-figures.ts makes the rows).
 * The feature is installed from a chunk of its own and can be switched off, so
 * its handle comes and goes under the tables: the body's mark says when it
 * lands, and a handle that leaves hands the tables back to the route's folded
 * numbers.
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

/** Shared subscription over the statistics handle and its body mark so all panel surfaces share one bus watcher (D40). */
const liveListeners = new Set<() => void>()
let stopHandle: (() => void) | null = null
let stopMark: (() => void) | null = null

function notifyLiveListeners() {
  for (const listener of liveListeners) listener()
}

function attachHandle() {
  if (stopHandle !== null) {
    stopHandle()
    stopHandle = null
  }
  const handle = registry?.contextStats
  if (typeof handle?.onFigures === 'function') {
    stopHandle = handle.onFigures(notifyLiveListeners)
  }
}

function subscribeLiveFigures(listener: () => void) {
  liveListeners.add(listener)
  if (liveListeners.size === 1) {
    attachHandle()
    // The statistics feature is installed from a chunk of its own and can be
    // switched off under the tables (D76): its install stamps the body, and that
    // mark is what says the handle arrived or left. Without a handle the tables
    // print the route's folded figures again (session-panel-figures.ts).
    stopMark = subscribeMutations(document.body, { attributes: true, attributeFilter: [SESSION_STATS_ATTR] }, () => {
      attachHandle()
      notifyLiveListeners()
    })
  }
  return () => {
    liveListeners.delete(listener)
    if (liveListeners.size > 0) return
    if (stopHandle !== null) {
      stopHandle()
      stopHandle = null
    }
    if (stopMark !== null) {
      stopMark()
      stopMark = null
    }
  }
}

/**
 * Follow the live reading of one session. When `live` is false, returns null so
 * hidden summary slots fall back to the route's settled reading without holding
 * a stale initial snapshot or waking on per-frame streaming ticks.
 * @param sessionId - the session the panel shows.
 * @param live - whether to subscribe to live per-frame updates.
 * @returns the reading, or null while inactive or while this session has none published.
 */
export function useLiveFigures(sessionId: string, live = true): SessionFigures | null {
  const read = React.useCallback(() => figuresOf(sessionId), [sessionId])
  const [figures, setFigures] = React.useState<SessionFigures | null>(() => (live ? read() : null))
  React.useEffect(() => {
    if (!live) {
      setFigures(null)
      return undefined
    }
    setFigures(read())
    return subscribeLiveFigures(() => { setFigures(read()) })
  }, [live, read])
  return live ? (figures ?? read()) : null
}
