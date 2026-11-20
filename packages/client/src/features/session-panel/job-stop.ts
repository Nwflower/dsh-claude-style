import * as React from 'react'
import { copy } from './copy'
import { stopPanelJob, stopPanelSubagent } from './session-panel-host'
import { StopMark } from './session-panel-marks'

const h = React.createElement

/** A sibling of the output disclosure, so stopping never opens the row or nests buttons (D106). */
export function JobStop({ sessionId, jobId, label, status, subagent = false }: { sessionId: string, jobId: string, label: string, status: string, subagent?: boolean }) {
  const [state, setState] = React.useState<'idle' | 'confirm' | 'pending' | 'requested' | 'failed'>('idle')
  // The ref closes the gap before React paints the disabled button.
  const sending = React.useRef(false)
  if (status !== 'running' && status !== 'stopping') return null
  const waiting = status === 'stopping' || state === 'pending' || state === 'requested'
  const title = waiting ? copy('stopping') : state === 'confirm' ? copy('confirmStop') : copy('stopJob', { label })
  async function stop() {
    if (sending.current || waiting) return
    if (state !== 'confirm') {
      setState('confirm')
      return
    }
    sending.current = true
    setState('pending')
    try {
      if (subagent) await stopPanelSubagent(sessionId, jobId)
      else await stopPanelJob(sessionId, jobId)
      setState('requested')
    } catch {
      // The failure belongs to this row; other jobs and the panel keep working.
      setState('failed')
    } finally {
      sending.current = false
    }
  }
  return h('span', { className: 'dsh-claude-panel-job-control' },
    h('button', {
      type: 'button',
      className: 'dsh-claude-panel-job-stop',
      title,
      'aria-label': title,
      disabled: waiting,
      onClick: stop,
      onBlur() { setState(previous => previous === 'confirm' ? 'idle' : previous) },
    }, state === 'confirm' ? copy('confirmStop') : waiting ? copy('stopping') : h(StopMark)),
    state === 'failed' ? h('span', { className: 'dsh-claude-panel-job-error', role: 'alert' }, copy('stopFailed')) : null)
}
