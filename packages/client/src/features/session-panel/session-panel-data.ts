import * as React from 'react'
import { SESSION_PANEL_PATH } from '@dsh-claude-style/contracts/routes'
import type { PanelJobAnswer, SessionPanelAnswer, SessionPanelValue } from '@dsh-claude-style/contracts/session-panel'
import { billingQuery } from '../../shared/billing'

/** What one open panel knows: the host's last folded answer, and whether the last ask failed. */
export interface PanelReading {
  value: SessionPanelValue | null
  failed: boolean
}

/** How often an open panel asks the host again; the host keeps its own answer for about a second. */
const POLL_MS = 2500

/** The reading the panel had before its first answer. */
const EMPTY: PanelReading = { value: null, failed: false }

/**
 * Follow one session's overview panel (D94).
 *
 * The panel polls only while its page is on screen: the tab body can stay
 * mounted with the column collapsed, and a hidden panel that kept asking would
 * make the host fold the session for nobody (D94). It stops when the tab body
 * unmounts, while the page is not visible, and at unmount; an opened column
 * asks once immediately. One ask is in flight at a time, and a later ask aborts
 * nothing: the next one starts only after the current one settles, so a slow
 * host never stacks reads. An answer identical to the one already shown is
 * dropped before it reaches React, so an idle session renders nothing.
 * @param sessionId - the session the panel shows.
 * @returns the last answer, or the failed flag while nothing arrived.
 */
export function usePanelReading(sessionId: string): PanelReading {
  const [reading, setReading] = React.useState<PanelReading>(EMPTY)

  React.useEffect(() => {
    if (sessionId === '') return undefined
    let stopped = false
    let timer: number | null = null
    let controller: AbortController | null = null
    /** The last answer's text, compared before it reaches React. */
    let shown = ''

    const schedule = () => {
      if (stopped) return
      timer = window.setTimeout(load, POLL_MS)
    }

    const load = () => {
      timer = null
      if (stopped) return
      // A hidden page throttles timers and shows nobody, and a collapsed column
      // keeps this body mounted: ask again only once the reader can see it.
      if (document.hidden) {
        schedule()
        return
      }
      // A newer ask supersedes the one in flight: its answer would be older
      // than the state the page already shows.
      controller?.abort()
      controller = new AbortController()
      const signal = controller.signal
      fetch(`${SESSION_PANEL_PATH}?id=${encodeURIComponent(sessionId)}${billingQuery()}`, {
        credentials: 'same-origin',
        headers: { accept: 'application/json' },
        signal,
      })
        .then(response => (response.ok ? response.json() as Promise<SessionPanelAnswer> : Promise.reject(new Error(`HTTP ${response.status}`))))
        .then((answer) => {
          if (stopped) return
          if (answer.ok !== true || answer.value === undefined) {
            setReading(previous => ({ value: previous.value, failed: true }))
            return
          }
          const text = JSON.stringify(answer.value)
          if (text === shown) return
          shown = text
          setReading({ value: answer.value, failed: false })
        }, (error: unknown) => {
          if (stopped) return
          // An abort is this effect's own teardown, not the host failing.
          if ((error as { name?: string } | null)?.name === 'AbortError') return
          setReading(previous => ({ value: previous.value, failed: true }))
        })
        .finally(() => {
          controller = null
          schedule()
        })
    }

    const onVisible = () => {
      if (document.hidden || stopped) return
      if (timer !== null) {
        window.clearTimeout(timer)
        timer = null
      }
      load()
    }

    load()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      stopped = true
      if (timer !== null) window.clearTimeout(timer)
      controller?.abort()
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [sessionId])

  return reading
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
