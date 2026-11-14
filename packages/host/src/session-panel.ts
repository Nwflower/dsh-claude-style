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
import type { PanelBackground, PanelChange, PanelContextProjections, PanelEnvironment, PanelJob, PanelJobOutput, PanelStats, PanelSubagent, PanelTeamMember, PanelTeamTask, SessionPanelValue } from '@dsh-claude-style/contracts/session-panel'
import type { BillingRows } from './session-cost.js'
import { panelEnvironment } from './checkout.js'
import { JOB_OUTPUT_MAX, foldJobs } from './session-panel-log.js'
import type { PanelEvent } from './session-panel-log.js'
import { createPanelContext, foldPanelContext, panelContextOf } from './session-panel-context.js'
import { compactionThresholdOf } from './session-compact.js'
import type { PanelContextState } from './session-panel-context.js'
import { belongsToPanelRound, createPanelRound, foldPanelRound } from './session-panel-round.js'
import type { PanelRoundState } from './session-panel-round.js'
import { isPanelProcess } from './session-panel-call.js'
import type { PanelInvocation } from './session-panel-call.js'

/** Most sessions whose folded panel is kept; the panel reads the session on screen. */
const KEPT_SESSIONS = 32
/** How long a built answer is reused before the host folds again. */
const ANSWER_TTL_MS = 1200
/** How long one child's folded facts are reused: a child's log is not restored on every poll. */
const CHILD_FACTS_TTL_MS = 8000

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
  kind?: unknown
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
  lastStartedAt: number
}

/** The facts of a child whose own log cannot be read: it still has a row. */
const NO_CHILD_FACTS: ChildFacts = { settledMs: 0, activeSince: null, running: false, completed: false, tokens: 0, lastStartedAt: 0 }

/** One session's kept fold. */
interface Entry {
  value: SessionPanelValue
  at: number
  /** The last event seq consumed by the context, round and job folds. */
  cursor: number
  context: PanelContextState
  /** The latest human-input round and call ownership across polls. */
  round: PanelRoundState
  /** Child sessions' facts, by child id, with the time they were read. */
  children: Map<string, { facts: ChildFacts, at: number }>
  /** Every job this session has registered, kept after the registry drops it. */
  jobs: Map<string, PanelJob>
  /** Retained output read for a job while it could still be read, by job id. */
  jobOutputs: Map<string, PanelJobOutput>
  /** The tool call that registered each job, by its call id. */
  jobCalls: Map<string, Set<string>>
  jobInvocations: Map<string, PanelInvocation>
  jobOrigins: Map<string, string>
  /** Change-request updates the watches delivered, by URL. */
  updates: Map<string, ForgeUpdate>
  /** Stop functions of the forge watches, by URL. */
  watches: Map<string, () => void>
  loading: Promise<SessionPanelValue> | null
  touchedAt: number
}

/** One session panel service: a folded answer per session, with its watches. */
export interface SessionPanelService {
  /** Fold one session's panel, reusing the kept answer while it is fresh; `fresh` asks past that kept answer. */
  get(sessionId: string, billing?: BillingRows, fresh?: boolean): Promise<SessionPanelValue>
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
        foldPanelContext(entry.context, incoming)
        foldPanelRound(entry.round, incoming, resolvedDirectory)
        foldJobs(entry, incoming)
        const last = incoming[incoming.length - 1]
        if (last !== undefined) entry.cursor = last.seq ?? entry.cursor
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
      // Where automatic compaction fires is the host's own policy, scaled to this
      // session's window and output reservation (D100).
      const thresholdTokens = compactionThresholdOf(ctx, agents, sessionId, entry.context, projections.contextPressure?.contextWindow)
      const value: SessionPanelValue = {
        environment,
        context: panelContextOf(projections, entry.context, thresholdTokens),
        // Newest first: the row a reader just caused stands at the top of the list.
        outputs: [...entry.round.outputs].reverse(),
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
      const lastStart = observation.events?.findLast(event => event.type === 'turn/start')
      return {
        lastStartedAt: lastStart?.time ?? 0,
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
        const known = entry.jobs.get(id)
        entry.jobs.set(id, {
          id,
          label: known?.label || text(job.label) || '',
          category: known?.category ?? (isPanelProcess(id, job.kind) ? 'process' : 'task'),
          execution: known?.execution ?? 'unknown',
          controllable: true,
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
      const isRunning = running(id) ?? facts.running
      const resumed = entry.round.since > 0 && facts.lastStartedAt >= entry.round.since
      if (!isRunning && !resumed && !belongsToPanelRound(entry.round, 'children', id, number(child.createdAt) ?? 0)) continue
      subagents.push({
        id,
        label: text(child.label) ?? '',
        mode: text(child.mode) ?? '',
        settledMs: facts.settledMs,
        activeSince: facts.activeSince,
        running: isRunning,
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

  async function get(sessionId: string, billing: BillingRows = { rows: [], currency: null }, fresh = false): Promise<SessionPanelValue> {
    const held = entries.get(sessionId)
    if (held !== undefined) {
      held.touchedAt = Date.now()
      if (held.loading !== null) return held.loading
      if (!fresh && Date.now() - held.at < ANSWER_TTL_MS) return held.value
    }
    const entry: Entry = held ?? {
      value: { environment: null, context: null, outputs: [], changes: [], background: { jobs: [], subagents: [], team: null } },
      at: 0,
      cursor: -1,
      context: createPanelContext(),
      round: createPanelRound(),
      children: new Map(),
      jobs: new Map(),
      jobOutputs: new Map(),
      jobCalls: new Map(),
      jobInvocations: new Map(),
      jobOrigins: new Map(),
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
