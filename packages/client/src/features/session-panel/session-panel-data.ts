import * as React from 'react'
import { SESSION_PANEL_PATH } from '@dsh-claude-style/contracts/routes'
import type { PanelJobAnswer, SessionPanelAnswer, SessionPanelValue } from '@dsh-claude-style/contracts/session-panel'
import { billingQuery } from '../../shared/billing'
import { sessionProjectionFaces } from '../../shared/session-projections'
import { createPanelPoller } from './panel-poller'
import { createWakeThrottle } from './wake-throttle'
import { panelHost } from './session-panel-host'
import { EMPTY_READING, answeredReading, failedReading, readingFor } from './reading-state'
import type { PanelReading, PanelReadingState } from './reading-state'
import type { ContextOccupancy } from './context-rows'
import type { HostContextPressureProjection, HostSnapshotSource } from '@dsh-claude-style/contracts/services'

/** The reading shape the body consumes; its rules live in reading-state.ts. */
export type { PanelReading } from './reading-state'

/** How often an open panel asks the host again; the host keeps its own answer for about a second. */
const POLL_MS = 2500
/** The projections whose frames refresh the rail: the session's figures and its token buckets. */
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

/**
 * Follow one session's occupancy (D94).
 *
 * The context section states its overview on the frame the rail mounts: the
 * provider's occupancy is a projection frame, not the host route's fold, so the
 * rail does not wait for that fold to say how full the window is. The breakdown
 * under the overview is the fold's, and takes its place when it answers.
 * @param sessionId - the session the rail shows.
 * @returns the occupancy, or null while the projection names no window.
 */
export function useLiveOccupancy(sessionId: string): ContextOccupancy | null {
  const read = React.useCallback(() => {
    const face = sessionProjectionFaces(panelHost(), sessionId, [OCCUPANCY_KEY])?.[OCCUPANCY_KEY]
    return occupancyFrom(face)
  }, [sessionId])
  const [occupancy, setOccupancy] = React.useState<ContextOccupancy | null>(read)
  React.useEffect(() => {
    if (sessionId === '') return undefined
    setOccupancy(read())
    const face = sessionProjectionFaces(panelHost(), sessionId, [OCCUPANCY_KEY])?.[OCCUPANCY_KEY]
    if (typeof face?.subscribe !== 'function') return undefined
    return face.subscribe(() => { setOccupancy(read()) })
  }, [read, sessionId])
  return occupancy
}

/**
 * Follow one session's overview panel (D94).
 *
 * The rail mounts this body for the session it shows; a session switch replaces
 * the body and restarts this hook. The reading is kept with the session that
 * answered it, so a frame between the two never draws the previous session's
 * rows, and a failed first ask shows its failure rather than the old answer.
 *
 * One ask is in flight at a time. A newer ask supersedes the one in flight, and
 * only that newer ask may clear the controller or schedule the next poll: the
 * superseded promise sees a newer generation and stops at every step, so an
 * older answer cannot overwrite a newer one and one visibility flip cannot
 * leave two timers running. The page's hidden state pauses the asks, and so does
 * a rail that has left the page and is only giving its width back: it keeps the
 * words it was showing and asks the host nothing more (D94).
 * @param sessionId - the session the rail shows.
 * @param active - whether the rail still stands; a rail on its way out reads nothing more.
 * @returns the last answer for that session, or the failed flag while nothing arrived.
 */
export function usePanelReading(sessionId: string, active: boolean): PanelReading {
  const [state, setState] = React.useState<PanelReadingState>({ session: '', reading: EMPTY_READING })
  /** Whether an ask is still the reader's: updated on every render, read by the loop. */
  const asking = React.useRef(active)
  asking.current = active

  React.useEffect(() => {
    if (sessionId === '') return undefined
    setState({ session: sessionId, reading: EMPTY_READING })
    /** The last answer's text for this session, compared before it reaches React. */
    let shown = ''
    /** Whether the next ask must pass the host's kept answer. */
    let liveNext = false
    const fail = () => setState(previous => previous.session === sessionId ? failedReading(previous) : { session: sessionId, reading: { value: null, failed: true } })
    const poller = createPanelPoller({
      url: () => {
        const live = liveNext ? '&live=1' : ''
        liveNext = false
        return `${SESSION_PANEL_PATH}?id=${encodeURIComponent(sessionId)}${billingQuery()}${live}`
      },
      async fetch(url, signal) {
        const response = await fetch(url, { credentials: 'same-origin', headers: { accept: 'application/json' }, signal })
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        return await response.json() as SessionPanelAnswer
      },
      hidden: () => document.hidden || !asking.current,
      setTimeout: (run, ms) => window.setTimeout(run, ms),
      clearTimeout: id => window.clearTimeout(id),
      answer(answer, failed) {
        if (failed || answer?.ok !== true || answer.value === undefined) {
          fail()
          return
        }
        const text = JSON.stringify(answer.value)
        if (text === shown) return
        shown = text
        setState(answeredReading(sessionId, answer.value))
      },
      pollMs: POLL_MS,
    })
    poller.start()
    // The host lands its figures as projection frames (D40), and a streaming turn
    // moves them every few hundred milliseconds. The rail asks again on those
    // frames — past the host's kept answer — so its numbers move with the
    // composer's readout instead of one poll behind it (D94).
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
    return () => {
      poller.stop()
      throttle.stop()
      for (const stop of stops) stop()
      document.removeEventListener('visibilitychange', poller.wake)
    }
  }, [sessionId])

  return readingFor(sessionId, state)
}

/** What one expanded job row shows: the job's retained output, or why there is none. */
export interface JobOutputReading {
  text: string | null
  failed: boolean
  loading: boolean
}

/**
 * Read one background job's retained output while its row is expanded.
 *
 * The read happens once per expansion and never polls: the panel's own job list
 * already carries the live status, and output arrives through the host's
 * registry read only when the reader asked to see it.
 * @param sessionId - the session that owns the job.
 * @param jobId - the job whose output is shown.
 * @returns the text, the failure flag, and whether the read is still in flight.
 */
export function useJobOutput(sessionId: string, jobId: string): JobOutputReading {
  const [reading, setReading] = React.useState<JobOutputReading>({ text: null, failed: false, loading: true })

  React.useEffect(() => {
    if (sessionId === '' || jobId === '') return undefined
    let stopped = false
    const controller = new AbortController()
    setReading({ text: null, failed: false, loading: true })
    fetch(`${SESSION_PANEL_PATH}?id=${encodeURIComponent(sessionId)}&job=${encodeURIComponent(jobId)}`, {
      credentials: 'same-origin',
      headers: { accept: 'application/json' },
      signal: controller.signal,
    })
      .then(response => (response.ok ? response.json() as Promise<PanelJobAnswer> : Promise.reject(new Error(`HTTP ${response.status}`))))
      .then((answer) => {
        if (stopped) return
        if (answer.ok !== true) {
          setReading({ text: null, failed: true, loading: false })
          return
        }
        setReading({ text: answer.value?.text ?? '', failed: false, loading: false })
      }, (error: unknown) => {
        if (stopped || (error as { name?: string } | null)?.name === 'AbortError') return
        setReading({ text: null, failed: true, loading: false })
      })
    return () => {
      stopped = true
      controller.abort()
    }
  }, [sessionId, jobId])

  return reading
}
