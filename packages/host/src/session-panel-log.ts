/**
 * The session log's job records, folded into the overview panel's kept history
 * (D94).
 *
 * The host's job registry drops a settled record once its owner collected the
 * outcome — a foreground command's record is gone by the next poll — so the
 * durable `job/registered` and `job/settled` events are what keeps a command's
 * row after it finishes. The command's output lives in the log too: a
 * foreground result carries it, and a background job's completion notice quotes
 * it after `Output:`. Both are read here because the registry's ring may be
 * gone by the time the panel is asked.
 */
import type { PanelJob, PanelJobOutput } from '@dsh-claude-style/contracts/session-panel'
import { createHash } from 'node:crypto'
import { isPanelProcess, panelInvocation } from './session-panel-call.js'
import type { PanelInvocation } from './session-panel-call.js'

/** Longest job output the panel carries; a long job's head is the least useful part of it. */
export const JOB_OUTPUT_MAX = 8000

/** One content block of a rendered message, in the member this reader needs. */
interface PanelBlock {
  type?: unknown
  text?: unknown
}

/** One model-visible message, including producer attribution. */
export interface PanelMessage {
  role?: string
  content?: unknown
  source?: { callId?: unknown, kind?: string, form?: string }
  isError?: boolean
}

/** One raw session event, in the members this module reads. */
export interface PanelEvent {
  type?: string
  seq?: number
  time?: number
  surfaceOp?: 'append' | { startSeq: number, endSeq: number }
  data?: PanelMessage & {
    header?: { tools?: readonly { name: string }[] }
    files?: readonly { path?: unknown }[]
    callId?: unknown
    name?: unknown
    arguments?: unknown
    message?: PanelMessage
    error?: unknown
    jobId?: unknown
    kind?: unknown
    childId?: unknown
    label?: unknown
    startedAt?: unknown
    finishedAt?: unknown
    status?: unknown
    detail?: unknown
    toolCall?: { callId?: unknown, rootCallId?: unknown }
  }
}

/** What one session's kept fold holds for its jobs. */
export interface JobHistoryState {
  /** Every job this session has registered, kept after the registry drops it. */
  jobs: Map<string, PanelJob>
  /** Output read for a job while the log or the registry still carried it, by job id. */
  jobOutputs: Map<string, PanelJobOutput>
  /** The tool call that registered each job, by its call id. */
  jobCalls: Map<string, Set<string>>
  jobInvocations: Map<string, PanelInvocation>
  /** The exact creating invocation, so root results are not copied to every nested job. */
  jobOrigins: Map<string, string>
}

/** Index direct and root results once; restoring a long session stays linear in its events. */
function linkJobCall(state: JobHistoryState, callId: string, jobId: string) {
  let ids = state.jobCalls.get(callId)
  if (ids === undefined) {
    ids = new Set()
    state.jobCalls.set(callId, ids)
  }
  ids.add(jobId)
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value !== '' ? value : null
}

function number(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

/** The text of a message's content blocks, joined as the log carries them. */
export function messageText(content: unknown) {
  if (!Array.isArray(content)) return ''
  let out = ''
  for (const block of content as PanelBlock[]) {
    if (block?.type === 'text' && typeof block.text === 'string') out += block.text
  }
  return out
}

/** Keep one job's output the log already carries, capped and marked with the job's state. */
export function rememberJobOutput(state: JobHistoryState, jobId: string, text: string) {
  if (text === '') return
  const capped = text.length > JOB_OUTPUT_MAX ? text.slice(text.length - JOB_OUTPUT_MAX) : text
  state.jobOutputs.set(jobId, { text: capped, lossy: text.length > JOB_OUTPUT_MAX, status: state.jobs.get(jobId)?.status ?? '' })
}

/**
 * Fold one batch of session events into the kept job history.
 * @param state - the session's kept job maps.
 * @param events - the events that arrived since the last fold, oldest first.
 */
export function foldJobs(state: JobHistoryState, events: readonly PanelEvent[]) {
  for (const event of events) {
    const data = event.data
    if (data === undefined) continue
    if (event.type === 'tool/call') {
      const callId = text(data.callId)
      if (callId === null) continue
      const invocation = panelInvocation(data.name, data.arguments)
      state.jobInvocations.set(callId, invocation)
      if (!invocation.process) continue
      const id = `call-${createHash('sha256').update(callId).digest('hex').slice(0, 24)}`
      linkJobCall(state, callId, id)
      state.jobOrigins.set(id, callId)
      state.jobs.set(id, {
        id, label: invocation.label, category: 'process',
        execution: invocation.background ? 'background' : 'foreground',
        controllable: false, status: 'running', startedAt: event.time ?? 0,
      })
      continue
    }
    if (event.type === 'job/registered' || event.type === 'job/settled') {
      const id = text(data.jobId)
      if (id === null) continue
      if (event.type === 'job/registered') {
        const callId = text(data.toolCall?.callId)
        const rootId = text(data.toolCall?.rootCallId) ?? callId
        const invocation = (callId === null ? undefined : state.jobInvocations.get(callId))
          ?? (rootId === null ? undefined : state.jobInvocations.get(rootId))
        const temporary = callId === null ? undefined : [...(state.jobCalls.get(callId) ?? [])].find(candidate => state.jobs.get(candidate)?.controllable === false)
        const called = temporary === undefined ? undefined : state.jobs.get(temporary)
        // Registration gives a command its controllable id; it remains one execution.
        if (called?.controllable === false) {
          state.jobs.delete(called.id)
          state.jobOrigins.delete(called.id)
          state.jobCalls.get(callId!)!.delete(called.id)
        }
        const known = state.jobs.get(id)
        state.jobs.set(id, {
          id,
          label: called?.label || known?.label || text(data.label) || '',
          category: isPanelProcess(id, data.kind, invocation) ? 'process' : 'task',
          execution: invocation?.background === true ? 'background' : invocation?.process === true ? 'foreground' : 'unknown',
          controllable: true,
          status: 'running',
          startedAt: number(data.startedAt) ?? known?.startedAt ?? 0,
        })
        if (callId !== null) {
          linkJobCall(state, callId, id)
          state.jobOrigins.set(id, callId)
        }
        if (rootId !== null) linkJobCall(state, rootId, id)
        continue
      }
      const known = state.jobs.get(id)
      state.jobs.set(id, {
        id,
        label: known?.label ?? text(data.label) ?? '',
        category: known?.category ?? (isPanelProcess(id, data.kind) ? 'process' : 'task'),
        execution: known?.execution ?? 'unknown',
        controllable: true,
        status: (text(data.status) ?? 'completed') as PanelJob['status'],
        startedAt: number(data.startedAt) ?? known?.startedAt ?? 0,
        finishedAt: number(data.finishedAt) ?? undefined,
        detail: text(data.detail) ?? undefined,
      })
      continue
    }
    if (event.type === 'tool/result') {
      const callId = text(data.message?.source?.callId)
      if (callId === null) continue
      const output = messageText(data.message?.content)
      for (const jobId of state.jobCalls.get(callId) ?? []) {
        const known = state.jobs.get(jobId)!
        // These producer-owned markers survive in the durable log; the canonical
        // result's kind is not persisted by the host. Match only this execution's id.
        const handedOut = output.includes(`started background job ${jobId}`) || output.includes(`moved to background job ${jobId}]`)
        const live = known.status === 'running' || known.status === 'stopping'
        const execution = known.execution === 'background' || handedOut || (known.controllable && live && data.message?.isError !== true) ? 'background' : known.execution
        const settled = !known.controllable
        state.jobs.set(jobId, {
          ...known, execution,
          ...(settled ? { status: data.message?.isError === true ? 'failed' : 'completed', finishedAt: event.time ?? known.startedAt } : {}),
        })
        if ((settled || !live) && state.jobOrigins.get(jobId) === callId) rememberJobOutput(state, jobId, output)
      }
      continue
    }
    if (event.type === 'user/message') {
      const message = data.message ?? data
      if (message.source?.kind !== 'job') continue
      const notice = messageText(message.content)
      const match = notice.match(/background job ([A-Za-z0-9_-]+)/)
      if (match === null) continue
      const known = state.jobs.get(match[1])
      if (known === undefined) continue
      state.jobs.set(known.id, { ...known, execution: 'background' })
      const at = notice.indexOf('Output:')
      const output = at === -1 ? '' : notice.slice(at + 'Output:'.length).replace(/^\s*/, '')
      if (output !== '') rememberJobOutput(state, match[1], output)
    }
  }
}
