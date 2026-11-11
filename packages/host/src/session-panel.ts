/**
 * The session overview panel's host assembly (D94).
 *
 * The page cannot reach what the panel shows: the session's working directory
 * and Git checkout, the context window's composition, the files the session
 * presented or wrote, the change requests bound to it, and the jobs, subagents
 * and Team behind the conversation. The host half folds all of it from the
 * session log and the host's own projections and services, and answers one
 * route per ask; the browser half renders the sections and polls while the
 * panel is open.
 *
 * Live sessions come through `sessionQuery.observeSession`, whose projection
 * baseline is already driven by the host's eager fold; a closed session's log is
 * prepared on first ask and cached by the query service. The outputs fold is
 * advanced from the event cursor kept with the session's entry, so a poll pays
 * for the events that arrived since the last one, not for the whole log.
 *
 * Change-request statuses are polled by the host's forge watches, each started
 * the first time a bound URL is shown and dropped with the session's entry; a
 * host without the forge registry answers the URLs without statuses. Every
 * optional service missing is an empty section, not a failed answer.
 */
import type { DshContext } from '@dsh-claude-style/engine/node/dsh'
import type { PanelBackground, PanelChange, PanelContextProjections, PanelEnvironment, PanelJob, PanelJobOutput, PanelOutput, PanelStats, PanelSubagent, PanelTeamMember, PanelTeamTask, SessionPanelValue } from '@dsh-claude-style/contracts/session-panel'
import type { BillingRows } from './session-cost.js'
import { panelEnvironment } from './checkout.js'
import { JOB_OUTPUT_MAX, foldJobs } from './session-panel-log.js'
import type { PanelEvent } from './session-panel-log.js'
import { createPanelContext, foldPanelContext, panelContextOf } from './session-panel-context.js'
import type { PanelContextState, PanelTokenMeter } from './session-panel-context.js'

/** Most sessions whose folded panel is kept; the panel reads the session on screen. */
const KEPT_SESSIONS = 32
/** How long a built answer is reused before the host folds again. */
const ANSWER_TTL_MS = 1200
/** How long one child's folded facts are reused: a child's log is not restored on every poll. */
const CHILD_FACTS_TTL_MS = 8000
/** The file extensions the panel marks as images and as documents. */
const IMAGE_EXT = /\.(?:png|jpe?g|webp|gif|svg|avif|bmp)$/i
const DOCUMENT_EXT = /\.(?:md|markdown|txt|pdf|docx?|xlsx?|pptx?|csv|json|jsonl|yaml|yml|html?)$/i
/** Tool names whose successful call writes a file; `apply_patch` names its paths inside the patch. */
const WRITE_TOOLS = new Set(['write', 'edit', 'str_replace_editor'])

/** The session-query service, in the members this module reads. */
interface SessionQueryReader {
  observeSession?(sessionId: string, options?: { projectionMode?: 'all' | 'none' }): Promise<SessionObservation>
}

/** One prepared or live observation; its lease is released as soon as the answers are read. */
interface SessionObservation {
  header?: { cwd?: string }
  cursor?: number
  events?: readonly PanelEvent[]
  projections?: { values?: Record<string, unknown> }
  dispose?(): void
  [Symbol.dispose]?(): void
}

/** One bound change request as the projection stores it. */
interface ForgeBinding {
  url?: unknown
  dismissed?: unknown
}

/** The change request's latest polling result, in the members this module reads. */
interface ForgeUpdate {
  snapshot?: {
    url?: string
    title?: string
    state?: 'open' | 'closed' | 'merged'
    draft?: boolean
    checks?: readonly { state?: string }[]
    checksRollup?: 'none' | 'pending' | 'success' | 'failure'
  }
}

/** A forge change request reference: the repository and number a URL names. */
interface ForgeRef {
  repository?: { owner?: string, name?: string }
  number?: number
}

/** The forge registry's watch and read seats, in the members this module reads. */
interface ForgeRegistry {
  changeRequestFromUrl?(url: string): ForgeRef | undefined
  watch?(ref: ForgeRef, listener: (update: ForgeUpdate) => void): () => void
  latest?(ref: ForgeRef): ForgeUpdate | undefined
}

/** One background job as the jobs registry projects it. */
interface JobView {
  id?: unknown
  label?: unknown
  status?: unknown
  startedAt?: unknown
  finishedAt?: unknown
  progress?: unknown
  detail?: unknown
}

/** One job's retained output as the registry answers it. */
interface JobOutputRead {
  chunks?: readonly { text?: unknown }[]
  lossy?: unknown
}

/** The jobs registry, in the members this module reads. */
interface JobsRegistry {
  list?(caller?: string): JobView[]
  get?(id: string, caller?: string): JobView
  readAt?(id: string, from: number, caller?: string): JobOutputRead
}

/** The live-agent registry, in the member this module reads. */
interface AgentsRegistry {
  get?(id: string): { status?: string } | undefined
}

/** The projections the panel reads, as the host's merged table types them. */
interface PanelProjections extends PanelContextProjections {
  workingDirectory?: string | null
  forgeChangeRequests?: readonly ForgeBinding[]
  subagentCatalog?: readonly { id?: unknown, createdAt?: unknown, mode?: unknown, label?: unknown }[]
  sessionStats?: { turns?: unknown, steps?: unknown, llmMs?: unknown, toolMs?: unknown, ttftMs?: unknown, ttftSteps?: unknown, decodeMs?: unknown, decodeTokens?: unknown }
  tokenUsage?: { uncachedInputTokens?: unknown, cacheReadTokens?: unknown, cacheWriteTokens?: unknown, outputTokens?: unknown }
  agentTeam?: { members?: readonly { id?: unknown, name?: unknown, role?: unknown, phase?: unknown }[], tasks?: readonly { id?: unknown, subject?: unknown, status?: unknown, ownerName?: unknown }[] }
}

/** One child's durable turn timing, as its own `subagentTiming` projection carries it. */
interface SubagentTiming {
  settledMs?: number
  active?: { since?: number }
  lastTurnCompleted?: boolean
}

/** One child's token buckets, as its own `tokenUsage` projection carries them. */
interface ChildUsage {
  uncachedInputTokens?: number
  cacheReadTokens?: number
  cacheWriteTokens?: number
  outputTokens?: number
}

/** What the panel shows of one child session: its turn timing, its state, and its tokens. */
interface ChildFacts {
  settledMs: number
  activeSince: number | null
  running: boolean
  completed: boolean
  tokens: number
}

/** The facts of a child whose own log cannot be read: it still has a row. */
const NO_CHILD_FACTS: ChildFacts = { settledMs: 0, activeSince: null, running: false, completed: false, tokens: 0 }

/** One session's kept fold. */
interface Entry {
  value: SessionPanelValue
  at: number
  /** The last event seq folded into `outputs`. */
  cursor: number
  context: PanelContextState
  outputs: PanelOutput[]
  /** Writing calls awaiting a result across polls; owned by this session's fold. */
  writes: Map<string, string>
  /** Child sessions' facts, by child id, with the time they were read. */
  children: Map<string, { facts: ChildFacts, at: number }>
  /** Every job this session has registered, kept after the registry drops it. */
  jobs: Map<string, PanelJob>
  /** Retained output read for a job while it could still be read, by job id. */
  jobOutputs: Map<string, PanelJobOutput>
  /** The tool call that registered each job, by its call id. */
  jobCalls: Map<string, string>
  /** Change-request updates the watches delivered, by URL. */
  updates: Map<string, ForgeUpdate>
  /** Stop functions of the forge watches, by URL. */
  watches: Map<string, () => void>
  loading: Promise<SessionPanelValue> | null
  touchedAt: number
}

/** One session panel service: a folded answer per session, with its watches. */
export interface SessionPanelService {
  /** Fold one session's panel, reusing the kept answer while it is fresh. */
  get(sessionId: string, billing?: BillingRows): Promise<SessionPanelValue>
  /** Read one background job's retained output, owned by its session. */
  jobOutput(sessionId: string, jobId: string): PanelJobOutput | null
  /** Start the session-event watch that marks folds stale. */
  ensure(): void
  dispose(): void
}

/** What the host's cost fold answers for one session, in the members this module reads. */
interface CostReading {
  cny: number
  usd: number
}

/** The host's own cost store, as the routes seat hands it here. */
export interface PanelCostStore {
  get(sessionId: string, billing: BillingRows): Promise<CostReading | null>
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function number(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value !== '' ? value : null
}

/** Release an observation's lease through whichever disposal it offers. */
function release(observation: SessionObservation) {
  if (typeof observation.dispose === 'function') {
    observation.dispose()
    return
  }
  const symbol = observation[Symbol.dispose]
  if (typeof symbol === 'function') symbol.call(observation)
}

/** The output's mark, from its file name. */
function kindOf(name: string): PanelOutput['kind'] {
  if (IMAGE_EXT.test(name)) return 'image'
  if (DOCUMENT_EXT.test(name)) return 'document'
  return 'file'
}

/** One file as the panel names it: under the working directory, else absolute. */
function outputOf(path: string, origin: PanelOutput['origin'], directory: string | null): PanelOutput {
  const normalized = path.replaceAll('\\', '/')
  const base = directory === null ? null : directory.replaceAll('\\', '/')
  const display = base !== null && base !== '' && normalized.startsWith(`${base}/`)
    ? normalized.slice(base.length + 1)
    : normalized
  const name = display.slice(display.lastIndexOf('/') + 1)
  return { path: normalized, display, name, kind: kindOf(name), origin }
}

/** The path one writing tool call names in its arguments, or null. */
function writtenPath(argumentsText: unknown): string | null {
  if (typeof argumentsText !== 'string' || argumentsText === '') return null
  let parsed: unknown
  try {
    parsed = JSON.parse(argumentsText)
  } catch {
    return null
  }
  if (!isRecord(parsed)) return null
  return text(parsed.path) ?? text(parsed.file_path) ?? text(parsed.target_file) ?? text(parsed.filePath)
}

/** One change request as the panel shows it: the binding plus the latest status the forge knew. */
function changeOf(url: string, ref: ForgeRef | undefined, update: ForgeUpdate | undefined): PanelChange {
  const snapshot = update?.snapshot
  const checks = snapshot?.checks ?? []
  let failing = 0
  for (const check of checks) if (check.state === 'failure') failing += 1
  const owner = ref?.repository?.owner
  const name = ref?.repository?.name
  return {
    url,
    number: number(ref?.number),
    repository: owner !== undefined && name !== undefined ? `${owner}/${name}` : null,
    title: text(snapshot?.title),
    state: snapshot?.state ?? null,
    draft: snapshot?.draft === true,
    checks: snapshot?.checksRollup ?? null,
    failing,
    total: checks.length,
  }
}

/** One change request update's cheap status, compared to decide whether a folded answer moved. */
function updateSignature(update: ForgeUpdate | undefined) {
  const snapshot = update?.snapshot
  return snapshot === undefined ? '' : `${snapshot.title ?? ''}|${snapshot.state ?? ''}|${snapshot.checksRollup ?? ''}|${snapshot.checks?.length ?? 0}`
}

/**
 * Build the panel service over one host context.
 * @param ctx - host plugin context.
 * @returns the service; `ensure` starts the event watch and `dispose` stops it.
 */
export function createSessionPanel(ctx: DshContext, cost?: PanelCostStore): SessionPanelService {
  const entries = new Map<string, Entry>()
  /** Stops the session-event watch; opened by `ensure`. */
  let stopEvents: (() => void) | null = null
  let disposed = false

  function query(): SessionQueryReader | null {
    const reader = ctx.get('sessionQuery') as SessionQueryReader | null | undefined
    return reader ?? null
  }

  function remember(sessionId: string, entry: Entry) {
    entries.set(sessionId, entry)
    if (entries.size <= KEPT_SESSIONS) return
    const oldest = [...entries.entries()]
      .filter(([id]) => id !== sessionId)
      .sort((left, right) => left[1].touchedAt - right[1].touchedAt)[0]
    if (oldest === undefined) return
    for (const stop of oldest[1].watches.values()) stop()
    entries.delete(oldest[0])
  }

  function observe(sessionId: string): Promise<SessionObservation> {
    const reader = query()
    if (reader === null || typeof reader.observeSession !== 'function') {
      return Promise.reject(new Error('the host carries no session query service'))
    }
    return reader.observeSession(sessionId, { projectionMode: 'all' })
  }

  /** The events that arrived after the fold's cursor, oldest first. */
  function arrivals(events: readonly PanelEvent[], cursor: number): PanelEvent[] {
    let index = events.length
    while (index > 0 && (events[index - 1].seq ?? -1) > cursor) index -= 1
    return index === events.length ? [] : events.slice(index)
  }

  /** Fold the new events into the session's outputs: presented files first, then written ones. */
  function foldOutputs(entry: Entry, events: readonly PanelEvent[], directory: string | null) {
    // A poll may end between a call and its result; the session keeps the
    // pending path until that result arrives, including unsuccessful results.
    const calls = entry.writes
    const present = new Set(entry.outputs.map(output => output.path))
    for (const event of events) {
      const data = event.data
      if (data === undefined) continue
      if (event.type === 'tool/call') {
        const callId = text(data.callId)
        const name = text(data.name)
        const written = name !== null && WRITE_TOOLS.has(name) ? writtenPath(data.arguments) : null
        if (callId !== null && written !== null) calls.set(callId, written)
        continue
      }
      if (event.type === 'deliverables/presented') {
        for (const file of data.files ?? []) {
          const path = text(file?.path)
          if (path === null || present.has(path)) continue
          present.add(path)
          entry.outputs.push(outputOf(path, 'presented', directory))
        }
        continue
      }
      if (event.type === 'tool/result') {
        const callId = text(data.message?.source?.callId)
        const written = callId === null ? null : calls.get(callId)
        if (callId === null || written === undefined || written === null) continue
        calls.delete(callId)
        if (data.error !== undefined || data.message?.isError === true || present.has(written)) continue
        present.add(written)
        entry.outputs.push(outputOf(written, 'written', directory))
      }
    }
    const last = events[events.length - 1]
    if (last !== undefined) entry.cursor = last.seq ?? entry.cursor
  }

  /** Watch one bound change request's status through the host's forge registry. */
  function watchChange(entry: Entry, forge: ForgeRegistry, url: string) {
    if (entry.watches.has(url) || typeof forge.changeRequestFromUrl !== 'function' || typeof forge.watch !== 'function') return
    const ref = forge.changeRequestFromUrl(url)
    if (ref === undefined) return
    const stop = forge.watch(ref, (update) => {
      const before = updateSignature(entry.updates.get(url))
      entry.updates.set(url, update)
      // A changed status re-folds on the next ask; a poll that changed nothing
      // leaves the kept answer alone.
      if (updateSignature(update) !== before) entry.at = 0
    })
    entry.watches.set(url, stop)
  }

  /** The session's own figures: timing and usage projections, and the settled cost when the route seated one. */
  async function statsOf(projections: PanelProjections, sessionId?: string, billing?: BillingRows): Promise<PanelStats | null> {
    const stats = projections.sessionStats
    const usage = projections.tokenUsage
    if (stats === undefined && usage === undefined) return null
    let settled: { cny: number, usd: number } | null = null
    if (cost !== undefined && sessionId !== undefined && billing !== undefined) {
      try {
        const answer = await cost.get(sessionId, billing)
        if (answer !== null) settled = { cny: answer.cny, usd: answer.usd }
      } catch {
        // The figures stand without a price while the table is unavailable.
      }
    }
    return {
      turns: number(stats?.turns) ?? 0,
      steps: number(stats?.steps) ?? 0,
      llmMs: number(stats?.llmMs) ?? 0,
      toolMs: number(stats?.toolMs) ?? 0,
      ttftMs: number(stats?.ttftMs) ?? 0,
      ttftSteps: number(stats?.ttftSteps) ?? 0,
      decodeMs: number(stats?.decodeMs) ?? 0,
      decodeTokens: number(stats?.decodeTokens) ?? 0,
      uncachedInputTokens: number(usage?.uncachedInputTokens) ?? 0,
      cacheReadTokens: number(usage?.cacheReadTokens) ?? 0,
      cacheWriteTokens: number(usage?.cacheWriteTokens) ?? 0,
      outputTokens: number(usage?.outputTokens) ?? 0,
      cost: settled,
    }
  }

  async function build(sessionId: string, entry: Entry, billing: BillingRows): Promise<SessionPanelValue> {
    const observation = await observe(sessionId)
    try {
      const projections = (observation.projections?.values ?? {}) as PanelProjections
      const directory = text(observation.header?.cwd) ?? projections.workingDirectory ?? null
      const environment: PanelEnvironment | null = await panelEnvironment(directory)
      const resolvedDirectory = environment?.directory ?? null
      const events = observation.events ?? []
      if (entry.cursor === -1 || events.length > 0) {
        const incoming = arrivals(events, entry.cursor)
        foldPanelContext(entry.context, incoming, ctx.get('tokenMeter') as PanelTokenMeter | null | undefined)
        foldOutputs(entry, incoming, resolvedDirectory)
        foldJobs(entry, incoming)
      }
      const forge = ctx.get('forge') as ForgeRegistry | null | undefined
      const jobs = ctx.get('jobs') as JobsRegistry | null | undefined
      const agents = ctx.get('agents') as AgentsRegistry | null | undefined
      const changes: PanelChange[] = []
      for (const binding of projections.forgeChangeRequests ?? []) {
        const url = text(binding.url)
        if (url === null || binding.dismissed === true) continue
        if (forge !== null && forge !== undefined) watchChange(entry, forge, url)
        const ref = typeof forge?.changeRequestFromUrl === 'function' ? forge.changeRequestFromUrl(url) : undefined
        // `latest` names a watched change request; a URL no provider recognizes
        // has no reference to ask about, so the row keeps the binding alone.
        const update = entry.updates.get(url) ?? (ref === undefined ? undefined : forge?.latest?.(ref))
        if (update !== undefined) entry.updates.set(url, update)
        changes.push(changeOf(url, ref, update))
      }
      changes.reverse()
      const background = await backgroundOf(entry, projections, jobs, agents, sessionId)
      const value: SessionPanelValue = {
        environment,
        context: panelContextOf(projections, entry.context),
        // Newest first: the row a reader just caused stands at the top of the list.
        outputs: [...entry.outputs].reverse(),
        changes,
        background,
        stats: await statsOf(projections, sessionId, billing),
      }
      entry.value = value
      entry.at = Date.now()
      entry.touchedAt = Date.now()
      return value
    } finally {
      release(observation)
    }
  }

  /**
   * One child session's own facts: its timing and usage projections are its own
   * log's, so the parent's catalog entry alone cannot answer how long it ran.
   * A child whose log the host cannot read keeps its row with no figures.
   */
  async function childFacts(id: string): Promise<ChildFacts> {
    let observation: SessionObservation
    try {
      observation = await observe(id)
    } catch {
      return NO_CHILD_FACTS
    }
    try {
      const values = (observation.projections?.values ?? {}) as { subagentTiming?: SubagentTiming, tokenUsage?: ChildUsage }
      const timing = values.subagentTiming
      const usage = values.tokenUsage
      const active = timing?.active
      const since = number(active?.since)
      return {
        settledMs: number(timing?.settledMs) ?? 0,
        activeSince: active === undefined ? null : since,
        running: active !== undefined,
        completed: timing?.lastTurnCompleted === true,
        tokens: (number(usage?.uncachedInputTokens) ?? 0) + (number(usage?.cacheReadTokens) ?? 0)
          + (number(usage?.cacheWriteTokens) ?? 0) + (number(usage?.outputTokens) ?? 0),
      }
    } catch {
      // A projection set this reader cannot fold leaves the child's row without
      // figures; the rest of the panel is unaffected.
      return NO_CHILD_FACTS
    } finally {
      release(observation)
    }
  }

  async function backgroundOf(entry: Entry, projections: PanelProjections, jobs: JobsRegistry | null | undefined, agents: AgentsRegistry | null | undefined, sessionId: string): Promise<PanelBackground> {
    // Live views first: the registry's own projection is newer than the log fold
    // for a job that is still running.
    const live = new Set<string>()
    if (typeof jobs?.list === 'function') {
      for (const job of jobs.list(sessionId)) {
        const id = String(job.id ?? '')
        if (id === '') continue
        live.add(id)
        entry.jobs.set(id, {
          id,
          label: text(job.label) ?? '',
          status: (text(job.status) ?? 'running') as PanelJob['status'],
          startedAt: number(job.startedAt) ?? 0,
          finishedAt: number(job.finishedAt) ?? undefined,
          progress: text(job.progress) ?? undefined,
          detail: text(job.detail) ?? undefined,
        })
      }
    }
    // A live registry record is read while it still exists: the log's own copy
    // is captured by the event fold, and this catches a ring the log does not
    // carry (a job whose output never reached a tool result or notice).
    for (const job of entry.jobs.values()) {
      if (entry.jobOutputs.has(job.id) || !live.has(job.id)) continue
      const read = jobOutput(sessionId, job.id)
      if (read !== null && read.text !== '') entry.jobOutputs.set(job.id, read)
    }
    const jobRows = [...entry.jobs.values()]
      .sort((left, right) => {
        const leftRunning = left.status === 'running' || left.status === 'stopping' ? 0 : 1
        const rightRunning = right.status === 'running' || right.status === 'stopping' ? 0 : 1
        return leftRunning - rightRunning || right.startedAt - left.startedAt
      })

    const running = (id: string | null): boolean | null => {
      if (id === null || typeof agents?.get !== 'function') return null
      const agent = agents.get(id)
      if (agent === undefined || agent === null) return null
      return agent.status === 'running'
    }
    const subagents: PanelSubagent[] = []
    const catalog = [...(projections.subagentCatalog ?? [])]
      .sort((left, right) => (number(right.createdAt) ?? 0) - (number(left.createdAt) ?? 0))
    for (const child of catalog) {
      const id = text(child.id)
      if (id === null) continue
      // A child's figures move at a turn's pace, not the panel's: the kept read
      // keeps a long log from being restored on every poll.
      const kept = entry.children.get(id)
      const facts = kept !== undefined && Date.now() - kept.at < CHILD_FACTS_TTL_MS ? kept.facts : await childFacts(id)
      if (kept === undefined || kept.facts !== facts) entry.children.set(id, { facts, at: Date.now() })
      subagents.push({
        id,
        label: text(child.label) ?? '',
        mode: text(child.mode) ?? '',
        settledMs: facts.settledMs,
        activeSince: facts.activeSince,
        running: facts.running,
        completed: facts.completed,
        tokens: facts.tokens,
      })
    }
    const team = projections.agentTeam
    let teamRows: PanelBackground['team'] = null
    if (team !== undefined && team !== null && (team.members !== undefined || team.tasks !== undefined)) {
      const members: PanelTeamMember[] = []
      for (const member of team.members ?? []) {
        const id = text(member.id)
        if (id === null) continue
        members.push({
          id,
          name: text(member.name) ?? '',
          role: member.role === 'lead' ? 'lead' : 'teammate',
          phase: text(member.phase) ?? '',
          running: running(id),
        })
      }
      const tasks: PanelTeamTask[] = []
      for (const task of team.tasks ?? []) {
        const status = text(task.status)
        if (status === null || status === 'deleted') continue
        tasks.push({
          id: String(task.id ?? ''),
          subject: text(task.subject) ?? '',
          status,
          ownerName: text(task.ownerName) ?? undefined,
        })
      }
      teamRows = { members, tasks }
    }
    return { jobs: jobRows, subagents, team: teamRows }
  }

  async function get(sessionId: string, billing: BillingRows = { rows: [], currency: null }): Promise<SessionPanelValue> {
    const held = entries.get(sessionId)
    if (held !== undefined) {
      held.touchedAt = Date.now()
      if (held.loading !== null) return held.loading
      if (Date.now() - held.at < ANSWER_TTL_MS) return held.value
    }
    const entry: Entry = held ?? {
      value: { environment: null, context: null, outputs: [], changes: [], background: { jobs: [], subagents: [], team: null } },
      at: 0,
      cursor: -1,
      context: createPanelContext(),
      outputs: [],
      writes: new Map(),
      children: new Map(),
      jobs: new Map(),
      jobOutputs: new Map(),
      jobCalls: new Map(),
      updates: new Map(),
      watches: new Map(),
      loading: null,
      touchedAt: Date.now(),
    }
    remember(sessionId, entry)
    const work = build(sessionId, entry, billing)
    entry.loading = work
    try {
      return await work
    } finally {
      entry.loading = null
    }
  }

  /**
   * One job's retained output, read for the row the reader expanded.
   * The read stops at the panel's own length, keeping the tail: a long job's
   * first bytes are the least useful ones here, and the registry's own cursor
   * is never moved by this read.
   */
  function jobOutput(sessionId: string, jobId: string): PanelJobOutput | null {
    const cached = entries.get(sessionId)?.jobOutputs.get(jobId)
    if (cached !== undefined) return cached
    const jobs = ctx.get('jobs') as JobsRegistry | null | undefined
    if (jobs === null || jobs === undefined || typeof jobs.readAt !== 'function') return null
    let read: JobOutputRead
    let status = ''
    try {
      read = jobs.readAt(jobId, 0, sessionId)
      status = text(jobs.get?.(jobId, sessionId)?.status) ?? ''
    } catch {
      // A job the registry no longer holds (or a foreign one) has no output to
      // show; the row keeps its last folded status.
      return null
    }
    let full = ''
    for (const chunk of read.chunks ?? []) full += text(chunk.text) ?? ''
    const textOfOutput = full.length > JOB_OUTPUT_MAX ? full.slice(full.length - JOB_OUTPUT_MAX) : full
    return { text: textOfOutput, lossy: read.lossy === true || full.length > JOB_OUTPUT_MAX, status }
  }

  function ensure() {
    if (stopEvents !== null || typeof ctx.on !== 'function') return
    stopEvents = ctx.on('session/event', (session: { id?: unknown } | null) => {
      if (disposed) return
      const id = text(session?.id)
      if (id === null) return
      const entry = entries.get(id)
      // The next ask folds the events that moved; the kept answer is reused
      // until then.
      if (entry !== undefined) entry.at = 0
    }) as (() => void) | null
  }

  return {
    get,
    jobOutput,
    ensure,
    dispose() {
      disposed = true
      if (stopEvents !== null) stopEvents()
      stopEvents = null
      for (const entry of entries.values()) for (const stop of entry.watches.values()) stop()
      entries.clear()
    },
  }
}
