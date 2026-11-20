import * as React from 'react'
import { formatHostDuration } from '../../shared/format'
import { hostChatSeat } from '../../core/i18n'
import { copy } from './copy'
import { openPanelSession } from './session-panel-host'
import { useJobOutput } from './session-panel-data'
import { JobStop } from './job-stop'
import { Row, Chip, Section } from './panel-rows'
import { AgentMark, ChecklistMark, CommandMark, FinishedMark, TeamMark } from './session-panel-marks'
import type { PanelBackground, PanelJob, PanelSubagent } from '@dsh-claude-style/contracts/session-panel'

const h = React.createElement

/** Whether any background row is still moving. */
export function hasRunningWork(background: PanelBackground) {
  if (background.jobs.some(job => job.status === 'running' || job.status === 'stopping')) return true
  if (background.subagents.some(child => child.running === true)) return true
  return (background.team?.members ?? []).some(member => member.running === true)
}

/**
 * The word a job row still needs: one running, stopping or failed. A finished
 * command is what most rows are, and it says so with its clock stopping; a word
 * on every row would make the state the row's loudest part (D106).
 */
function jobStatusText(status: string) {
  if (status === 'running') return copy('running')
  if (status === 'stopping') return copy('stopping')
  if (status === 'failed') return copy('failed')
  return null
}

/** A clock the host's own chat surfaces write: minutes from the first minute, hours from the first hour. */
function hostDuration(ms: number) {
  const seat = hostChatSeat()
  return seat === null ? `${Math.max(0, Math.round(ms / 1000))}s` : formatHostDuration(ms, seat)
}

/**
 * One job's clock: how long it ran, or how long it has been running. A command
 * that finished inside its first second has no clock worth reading, so its row
 * leaves the place empty rather than print a zero.
 */
function jobDuration(job: PanelJob, now: number) {
  if (job.startedAt <= 0) return ''
  const ms = (job.finishedAt ?? now) - job.startedAt
  if (job.finishedAt !== undefined && ms < 1000) return ''
  return hostDuration(ms)
}

/**
 * One child's clock: the turns it closed plus the open one.
 *
 * A finished child's figure stands still; only a child with a turn open at the
 * reading moves, because only then is `activeSince` carried.
 */
function childDuration(child: PanelSubagent, now: number) {
  const total = child.settledMs + (child.running && child.activeSince !== null ? Math.max(0, now - child.activeSince) : 0)
  return total <= 0 ? '' : hostDuration(total)
}

/** A team member's state word. */
function memberStatusText(running: boolean | null) {
  if (running === true) return copy('running')
  if (running === false) return copy('idle')
  return copy('finished')
}

/**
 * One job's retained output, read when the reader opens its row.
 * @param props.sessionId - the session that owns the job.
 * @param props.jobId - the job whose output is shown.
 * @returns the output block, or the reason there is none.
 */
function JobOutput({ sessionId, jobId }: { sessionId: string, jobId: string }) {
  const reading = useJobOutput(sessionId, jobId)
  const text = reading.loading ? copy('loading') : reading.failed ? copy('unavailable') : reading.text === null || reading.text === '' ? copy('noOutput') : reading.text
  return h('pre', { className: 'dsh-claude-panel-job-output' }, text)
}

interface WorkRow {
  id: string
  active: boolean
  node: React.ReactNode
}

/** Current work stays visible; settled records share Claude's one disclosure row (D106). */
function WorkList({ title, rows, kind }: { title: string, rows: readonly WorkRow[], kind?: string }) {
  if (rows.length === 0) return null
  const finished = rows.filter(row => !row.active)
  return h(Section, {
    title,
    kind: kind === undefined ? 'dsh-claude-panel-work-section' : ['dsh-claude-panel-work-section', kind],
    summary: copy('sectionItems', { count: rows.length }),
  },
    h('div', { className: 'dsh-claude-panel-list' }, rows.filter(row => row.active).map(row => row.node)),
    finished.length === 0 ? null : h('details', { className: 'dsh-claude-panel-finished' },
      h('summary', { className: 'dsh-claude-panel-finished-toggle' },
        h(FinishedMark),
        h('span', null, copy('finishedCount', { count: finished.length }))),
      h('div', { className: 'dsh-claude-panel-list' }, finished.map(row => row.node))))
}

/** Independent process, task, subagent and team sections share the rail's row geometry (D106). */
export function WorkSections({ sessionId, background }: { sessionId: string, background: PanelBackground }) {
  const now = Date.now()
  const [expandedJob, setExpandedJob] = React.useState<string | null>(null)
  const jobRows: WorkRow[] = []
  const taskRows: WorkRow[] = []
  const childRows: WorkRow[] = []
  const teamRows: WorkRow[] = []
  // The host answers newest first (running work included); the rail keeps that order.
  const jobs = background.jobs
  for (const job of jobs) {
    const expanded = expandedJob === job.id
    const status = jobStatusText(job.status)
    // A command that finished keeps its clock and drops the exit code: the code
    // is what the reader opens the row for when it is not zero.
    const settled = status === null
    const active = job.status === 'running' || job.status === 'stopping'
    const rows = job.category === 'task' ? taskRows : jobRows
    rows.push({ id: job.id, active, node: h(React.Fragment, { key: `job:${job.id}` },
      h('div', { className: 'dsh-claude-panel-job-line' }, h(Row, {
        kind: 'dsh-claude-panel-work-row',
        mark: job.category === 'task' ? h(ChecklistMark) : h(CommandMark),
        title: job.label === '' ? copy('jobs') : job.label,
        hint: [job.label, job.progress, settled ? null : job.detail].filter(Boolean).join(' · '),
        side: h(React.Fragment, null,
          job.execution !== 'foreground' && job.execution !== 'background' ? null : h('span', { className: 'dsh-claude-panel-execution' }, copy(job.execution === 'foreground' ? 'processForeground' : 'processBackground')),
          status === null || job.status === 'running' ? null : h(Chip, { text: status, tone: job.status === 'failed' ? 'failure' : 'pending' }),
          h('span', { className: 'dsh-claude-panel-work-duration' }, jobDuration(job, now))),
        expanded,
        onClick() { setExpandedJob(expanded ? null : job.id) },
      }), job.controllable !== false ? h(JobStop, { sessionId, jobId: job.id, label: job.label === '' ? copy('jobs') : job.label, status: job.status }) : null),
      expanded ? h(JobOutput, { key: 'output', sessionId, jobId: job.id }) : null) })
  }
  for (const child of background.subagents) {
    childRows.push({ id: child.id, active: child.running, node: h('div', { key: `subagent:${child.id}`, className: 'dsh-claude-panel-job-line' }, h(Row, {
      kind: 'dsh-claude-panel-work-row',
      mark: h(AgentMark),
      title: child.label === '' ? copy('subagents') : child.label,
      side: h('span', { className: 'dsh-claude-panel-work-duration' }, childDuration(child, now)),
      onClick() { openPanelSession(child.id) },
    }), child.mode === 'continuable' && child.running ? h(JobStop, {
      key: child.activeSince,
      sessionId, jobId: child.id, label: child.label === '' ? copy('subagents') : child.label, status: 'running', subagent: true,
    }) : null) })
  }
  const team = background.team
  if (team !== null) {
    for (const member of team.members) {
      teamRows.push({ id: member.id, active: member.running === true, node: h(Row, {
        key: `member:${member.id}`,
        mark: h(TeamMark),
        title: member.role === 'lead' ? `${member.name} · ${copy('team')}` : member.name,
        detail: member.phase,
        side: h(Chip, { text: memberStatusText(member.running), tone: member.running === true ? 'pending' : undefined }),
        onClick() { openPanelSession(member.id) },
      }) })
    }
    for (const task of team.tasks) {
      teamRows.push({ id: task.id, active: task.status !== 'completed', node: h(Row, {
        key: `task:${task.id}`,
        mark: h(ChecklistMark),
        title: task.subject,
        detail: task.ownerName ?? copy('tasks'),
        side: h(Chip, { text: task.status, tone: task.status === 'completed' ? 'success' : task.status === 'in_progress' ? 'pending' : undefined }),
      }) })
    }
  }
  return h(React.Fragment, null,
    h(WorkList, { key: 'jobs', title: copy('jobs'), rows: jobRows }),
    h(WorkList, { key: 'tasks', title: copy('tasks'), rows: taskRows }),
    h(WorkList, { key: 'subagents', title: copy('subagents'), rows: childRows, kind: 'dsh-claude-panel-quiet-marks' }),
    h(WorkList, { key: 'team', title: copy('team'), rows: teamRows }))
}
