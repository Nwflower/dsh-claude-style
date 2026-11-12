/**
 * The details rail's latest human-input round (D94).
 *
 * A host turn may start for a notification or an automatic continuation. Only
 * an appended user-sourced message starts a new reading round. Calls retain
 * their round until results arrive, so a late result cannot enter a newer one.
 * The same ordered fold handles a restored log and incremental poll batches.
 */
import type { PanelJob, PanelOutput } from '@dsh-claude-style/contracts/session-panel'
import type { PanelEvent } from './session-panel-log.js'

const IMAGE_EXT = /\.(?:png|jpe?g|webp|gif|svg|avif|bmp)$/i
const DOCUMENT_EXT = /\.(?:md|markdown|txt|pdf|docx?|xlsx?|pptx?|csv|json|jsonl|yaml|yml|html?)$/i
const WRITE_TOOLS = new Set(['write', 'edit', 'str_replace_editor'])

interface RoundCall {
  round: number
  written: string | null
  child: string | null
}

/** Latest-round rows and durable attribution retained across poll boundaries. */
export interface PanelRoundState {
  round: number
  since: number
  outputs: PanelOutput[]
  calls: Map<string, RoundCall>
  jobs: Map<string, number>
  children: Map<string, number>
}

export function createPanelRound(): PanelRoundState {
  return { round: 0, since: 0, outputs: [], calls: new Map(), jobs: new Map(), children: new Map() }
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value !== '' ? value : null
}

/** Malformed tool arguments have no file or recipient to attribute. */
function argumentsOf(value: unknown): Record<string, unknown> | null {
  if (typeof value !== 'string' || value === '') return null
  let parsed: unknown
  try {
    parsed = JSON.parse(value)
  } catch {
    // A failed or partially recorded tool call contributes no output row.
    return null
  }
  return typeof parsed === 'object' && parsed !== null ? parsed as Record<string, unknown> : null
}

function outputOf(path: string, origin: PanelOutput['origin'], directory: string | null): PanelOutput {
  const normalized = path.replaceAll('\\', '/')
  const base = directory?.replaceAll('\\', '/')
  const display = base !== undefined && base !== '' && normalized.startsWith(`${base}/`) ? normalized.slice(base.length + 1) : normalized
  const name = display.slice(display.lastIndexOf('/') + 1)
  return { path: normalized, display, name, kind: IMAGE_EXT.test(name) ? 'image' : DOCUMENT_EXT.test(name) ? 'document' : 'file', origin }
}

function rememberOutput(state: PanelRoundState, path: string, origin: PanelOutput['origin'], directory: string | null) {
  const output = outputOf(path, origin, directory)
  const index = state.outputs.findIndex(known => known.path === output.path)
  if (index !== -1) {
    // Presentation upgrades a written file; touching it again makes it newest.
    if (state.outputs[index].origin === 'presented') output.origin = 'presented'
    state.outputs.splice(index, 1)
  }
  state.outputs.push(output)
}

/** Fold round boundaries before attributing each event's own work (D94). */
export function foldPanelRound(state: PanelRoundState, events: readonly PanelEvent[], directory: string | null) {
  for (const event of events) {
    const data = event.data
    if (data === undefined) continue
    if (event.type === 'user/message' && (event.surfaceOp === 'append' || event.surfaceOp === undefined)
      && (data.source ?? data.message?.source)?.kind === 'user') {
      state.round += 1
      state.since = event.time ?? 0
      state.outputs = []
      continue
    }
    if (event.type === 'tool/call') {
      const id = text(data.callId)
      if (id === null) continue
      const args = argumentsOf(data.arguments)
      const written = WRITE_TOOLS.has(String(data.name)) && args !== null
        ? text(args.path) ?? text(args.file_path) ?? text(args.target_file) ?? text(args.filePath) : null
      const child = data.name === 'send_message' && args !== null ? text(args.agent_id) : null
      state.calls.set(id, { round: state.round, written, child })
      continue
    }
    if (event.type === 'job/registered') {
      const id = text(data.jobId)
      const call = text(data.toolCall?.callId)
      const root = text(data.toolCall?.rootCallId)
      const round = (call === null ? undefined : state.calls.get(call)?.round)
        ?? (root === null ? undefined : state.calls.get(root)?.round) ?? state.round
      if (id !== null) state.jobs.set(id, round)
      continue
    }
    if (event.type === 'subagent/catalog') {
      const id = text(data.childId)
      if (id !== null) state.children.set(id, state.round)
      continue
    }
    if (event.type === 'deliverables/presented') {
      const callId = text(data.callId)
      const round = callId === null ? state.round : state.calls.get(callId)?.round ?? state.round
      if (round !== state.round) continue
      for (const file of data.files ?? []) {
        const path = text(file?.path)
        if (path !== null) rememberOutput(state, path, 'presented', directory)
      }
      continue
    }
    if (event.type === 'tool/result') {
      const id = text(data.message?.source?.callId)
      const call = id === null ? undefined : state.calls.get(id)
      if (call === undefined || data.error !== undefined || data.message?.isError === true) continue
      if (call.child !== null) state.children.set(call.child, call.round)
      if (call.round === state.round && call.written !== null) rememberOutput(state, call.written, 'written', directory)
    }
  }
}

/** Unknown registry-only records use their creation time; a legacy log has no boundary. */
export function belongsToPanelRound(state: PanelRoundState, kind: 'jobs' | 'children', id: string, createdAt: number) {
  const round = state[kind].get(id)
  return round === undefined ? state.round === 0 || (state.since > 0 && createdAt >= state.since) : round === state.round
}

/** Running work stays actionable across a new input; settled older work leaves. */
export function panelRoundJobs(state: PanelRoundState, jobs: readonly PanelJob[]) {
  return jobs.filter(job => job.status === 'running' || job.status === 'stopping' || belongsToPanelRound(state, 'jobs', job.id, job.startedAt))
}
