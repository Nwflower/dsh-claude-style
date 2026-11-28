import * as React from 'react'
import { SESSION_PANEL_PATH } from '@dsh-claude-style/contracts/routes'
import { readHostJson } from '@dsh-claude-style/engine/resource'
import type { SessionPanelAnswer } from '@dsh-claude-style/contracts/session-panel'
import { sessionProjectionFaces } from '../../shared/session-projections'
import { createPanelPoller } from './panel-poller'
import { createWakeThrottle } from './wake-throttle'
import { panelHost } from './session-panel-host'
import { EMPTY_READING, answeredReading, failedReading, readingFor } from './reading-state'
import type { PanelReading, PanelReadingState } from './reading-state'
import type { ContextOccupancy } from './context-rows'
import type { HostContextPressureProjection, HostSnapshotSource } from '@dsh-claude-style/contracts/services'

/** The reading shape the sections consume; its rules live in reading-state.ts. */
export type { PanelReading } from './reading-state'

/** How often a mounted section asks the host again; the host keeps its own answer for about a second. */
const POLL_MS = 2500
/** The projections whose frames refresh the reading: each settled step moves the context and outputs with them. */
const WAKE_KEYS = ['sessionStats', 'tokenUsage'] as const
/** The closest two asks from those frames, so one streaming turn is not one ask per frame. */
const WAKE_MIN_MS = 400
/** The projection that carries the session's occupancy, read for the context section's overview. */
const OCCUPANCY_KEY = 'contextPressure'

/**
 * The host's occupancy reading for one session, from the projection that carries
 * it, or null while that projection names no window.
 */
function occupancyFrom(face: HostSnapshotSource<unknown> | undefined) {
  if (typeof face?.getSnapshot !== 'function') return null
  const pressure = face.getSnapshot() as HostContextPressureProjection | undefined
  const used = pressure?.projectedTokens ?? pressure?.pressureTokens
  const window = pressure?.contextWindow
  if (used === undefined || window === undefined || !(window > 0)) return null
  return { used: Math.max(0, Math.min(window, used)), window }
}

function sameOccupancy(left: ContextOccupancy | null, right: ContextOccupancy | null) {
  if (left === right) return true
  return left !== null && right !== null && left.used === right.used && left.window === right.window
}

/**
 * Follow one session's occupancy (D113).
 *
 * The context section states its overview on the frame it mounts: the
 * provider's occupancy is a projection frame, not the host route's fold, so the
 * section does not wait for that fold to say how full the window is. The
 * breakdown under the overview is the fold's, and takes its place when it answers.
 * @param sessionId - the session the panel shows.
 * @param live - whether to subscribe to live projection frames while visible.
 * @returns the occupancy, or null while the projection names no window.
 */
export function useLiveOccupancy(sessionId: string, live = true): ContextOccupancy | null {
  const read = React.useCallback(() => {
    const face = sessionProjectionFaces(panelHost(), sessionId, [OCCUPANCY_KEY])?.[OCCUPANCY_KEY]
    return occupancyFrom(face)
  }, [sessionId])
  const [occupancy, setOccupancy] = React.useState<ContextOccupancy | null>(() => (live ? read() : null))
  React.useEffect(() => {
    if (sessionId === '' || !live) {
      setOccupancy(null)
      return undefined
    }
    const refresh = () => {
      const next = read()
      setOccupancy(previous => (sameOccupancy(previous, next) ? previous : next))
    }
    refresh()
    const face = sessionProjectionFaces(panelHost(), sessionId, [OCCUPANCY_KEY])?.[OCCUPANCY_KEY]
    if (typeof face?.subscribe !== 'function') return undefined
    return face.subscribe(refresh)
  }, [live, read, sessionId])
  return live ? (occupancy ?? read()) : null
}

/** One session's reading, shared by every section of the panel that shows it. */
interface ReadingSource {
  state: PanelReadingState
  listeners: Set<() => void>
  stop(): void
}

/** The state before a session's first answer. */
const NO_STATE: PanelReadingState = { session: '', reading: EMPTY_READING }

/** The live sources, one per session that has a mounted section. */
const sources = new Map<string, ReadingSource>()

/**
 * Start one session's poll loop (D113).
 *
 * One ask is in flight at a time. A newer ask supersedes the one in flight, and
 * only that newer ask may clear the controller or schedule the next poll: the
 * superseded promise sees a newer generation and stops at every step, so an
 * older answer cannot overwrite a newer one and one visibility flip cannot
 * leave two timers running. The page's hidden state pauses the asks. The
 * reading is kept with the session that answered it, so a failed first ask
 * shows its failure rather than another session's answer.
 */
function openSource(sessionId: string): ReadingSource {
  /** The last answer's text for this session, compared before it reaches React. */
  let shown = ''
  /** Whether the next ask must pass the host's kept answer. */
  let liveNext = false
  const source: ReadingSource = { state: { session: sessionId, reading: EMPTY_READING }, listeners: new Set(), stop() {} }
  const publish = (next: PanelReadingState) => {
    source.state = next
    for (const listener of source.listeners) listener()
  }
  const poller = createPanelPoller({
    url: () => {
      const live = liveNext ? '&live=1' : ''
      liveNext = false
      return `${SESSION_PANEL_PATH}?id=${encodeURIComponent(sessionId)}${live}`
    },
    async fetch(url, signal) {
      return await readHostJson(url, { signal }) as unknown as SessionPanelAnswer
    },
    hidden: () => document.hidden,
    setTimeout: (run, ms) => window.setTimeout(run, ms),
    clearTimeout: id => window.clearTimeout(id),
    answer(answer, failed) {
      if (failed || answer?.ok !== true || answer.value === undefined) {
        publish(failedReading(source.state))
        return
      }
      const text = JSON.stringify(answer.value)
      if (text === shown) return
      shown = text
      publish(answeredReading(sessionId, answer.value))
    },
    pollMs: POLL_MS,
  })
  // The host lands its figures as projection frames (D40), and a streaming turn
  // moves them every few hundred milliseconds. The source asks again on those
  // frames — past the host's kept answer — so the context and outputs move with
  // the composer's readout instead of one poll behind it (D113).
  const throttle = createWakeThrottle({
    minMs: WAKE_MIN_MS,
    now: () => Date.now(),
    setTimeout: (run, ms) => window.setTimeout(run, ms),
    clearTimeout: id => window.clearTimeout(id),
    wake() {
      liveNext = true
      poller.wake()
    },
  })
  const faces = sessionProjectionFaces(panelHost(), sessionId, WAKE_KEYS)
  const stops: (() => void)[] = []
  if (faces !== null) {
    for (const key of WAKE_KEYS) {
      const face = faces[key]
      if (typeof face?.subscribe === 'function') stops.push(face.subscribe(() => throttle.soon()))
    }
  }
  document.addEventListener('visibilitychange', poller.wake)
  source.stop = () => {
    poller.stop()
    throttle.stop()
    for (const stop of stops) stop()
    document.removeEventListener('visibilitychange', poller.wake)
  }
  poller.start()
  return source
}

/**
 * Follow one session's folded overview (D113).
 *
 * The context and outputs sections, and their folded summaries, each mount on
 * their own in the host's panel; they read one source per session, opened by
 * the first one that mounts and closed with the last one, so the host is asked
 * once per poll whatever the number of sections standing.
 * @param sessionId - the session the panel shows.
 * @returns the last answer for that session, or the failed flag while nothing arrived.
 */
export function usePanelReading(sessionId: string): PanelReading {
  const subscribe = React.useCallback((listener: () => void) => {
    let source = sources.get(sessionId)
    if (source === undefined) {
      source = openSource(sessionId)
      sources.set(sessionId, source)
    }
    source.listeners.add(listener)
    const owned = source
    return () => {
      owned.listeners.delete(listener)
      if (owned.listeners.size > 0 || sources.get(sessionId) !== owned) return
      owned.stop()
      sources.delete(sessionId)
    }
  }, [sessionId])
  const state = React.useSyncExternalStore(subscribe, () => sources.get(sessionId)?.state ?? NO_STATE)
  return readingFor(sessionId, state)
}
