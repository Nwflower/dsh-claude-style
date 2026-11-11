import * as React from 'react'
import { SESSION_PANEL_PATH } from '@dsh-claude-style/contracts/routes'
import type { PanelJobAnswer, SessionPanelAnswer, SessionPanelValue } from '@dsh-claude-style/contracts/session-panel'
import { billingQuery } from '../../shared/billing'
import { createPanelPoller } from './panel-poller'
import { EMPTY_READING, answeredReading, failedReading, readingFor } from './reading-state'
import type { PanelReading, PanelReadingState } from './reading-state'

/** The reading shape the body consumes; its rules live in reading-state.ts. */
export type { PanelReading } from './reading-state'

/** How often an open panel asks the host again; the host keeps its own answer for about a second. */
const POLL_MS = 2500

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
 * leave two timers running. The page's hidden state pauses the asks.
 * @param sessionId - the session the rail shows.
 * @returns the last answer for that session, or the failed flag while nothing arrived.
 */
export function usePanelReading(sessionId: string): PanelReading {
  const [state, setState] = React.useState<PanelReadingState>({ session: '', reading: EMPTY_READING })

  React.useEffect(() => {
    if (sessionId === '') return undefined
    setState({ session: sessionId, reading: EMPTY_READING })
    /** The last answer's text for this session, compared before it reaches React. */
    let shown = ''
    const fail = () => setState(previous => previous.session === sessionId ? failedReading(previous) : { session: sessionId, reading: { value: null, failed: true } })
    const poller = createPanelPoller({
      url: () => `${SESSION_PANEL_PATH}?id=${encodeURIComponent(sessionId)}${billingQuery()}`,
      async fetch(url, signal) {
        const response = await fetch(url, { credentials: 'same-origin', headers: { accept: 'application/json' }, signal })
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        return await response.json() as SessionPanelAnswer
      },
      hidden: () => document.hidden,
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
    document.addEventListener('visibilitychange', poller.wake)
    return () => {
      poller.stop()
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
