/**
 * The session panel sections' host assembly (D112).
 *
 * The page cannot reach what the skin's sections in the host's session panel
 * show: the context window's composition, the files the session presented or
 * wrote, and the settled cost. The checkout and its branch are the host panel's
 * own Environment rows, so this fold runs no Git. The host half folds them
 * from the session log and the host's own projections and services, and answers
 * one route per ask; the browser half renders the sections and polls while one
 * of them is mounted. The work around the conversation — jobs, subagents, the
 * Team and change requests — is the host panel's own sections, so this fold
 * reads none of it.
 *
 * Live sessions come through `sessionQuery.observeSession`, whose projection
 * baseline is already driven by the host's eager fold; a closed session's log is
 * prepared on first ask and cached by the query service. The context and outputs
 * folds are advanced from the event cursor kept with the session's entry, so a
 * poll pays for the events that arrived since the last one, not for the whole log.
 */
import type { DshContext } from '@dsh-claude-style/engine/node/dsh'
import { homedir } from 'node:os'
import { resolve } from 'node:path'
import type { PanelContextProjections, PanelStats, SessionPanelValue } from '@dsh-claude-style/contracts/session-panel'
import type { BillingRows } from './session-cost.js'
import type { PanelEvent } from './session-panel-event.js'
import { createPanelContext, foldPanelContext, panelContextOf } from './session-panel-context.js'
import { compactionThresholdOf } from './session-compact.js'
import type { PanelContextState } from './session-panel-context.js'
import { createPanelRound, foldPanelRound } from './session-panel-round.js'
import type { PanelRoundState } from './session-panel-round.js'

/** Most sessions whose folded answer is kept; the panel reads the session on screen. */
const KEPT_SESSIONS = 32
/** How long a built answer is reused before the host folds again. */
const ANSWER_TTL_MS = 1200

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

/** The live-agent registry, in the member the compaction threshold reads. */
interface AgentsRegistry {
  get?(id: string): { status?: string } | undefined
}

/** The projections the fold reads, as the host's merged table types them. */
interface PanelProjections extends PanelContextProjections {
  workingDirectory?: string | null
  sessionStats?: { turns?: unknown, steps?: unknown, llmMs?: unknown, toolMs?: unknown, ttftMs?: unknown, ttftSteps?: unknown, decodeMs?: unknown, decodeTokens?: unknown }
  tokenUsage?: { uncachedInputTokens?: unknown, cacheReadTokens?: unknown, cacheWriteTokens?: unknown, outputTokens?: unknown }
}

/** One session's kept fold. */
interface Entry {
  value: SessionPanelValue
  at: number
  /** The last event seq consumed by the context and round folds. */
  cursor: number
  context: PanelContextState
  /** The latest human-input round and call ownership across polls. */
  round: PanelRoundState
  loading: Promise<SessionPanelValue> | null
  touchedAt: number
}

/** One session panel service: a folded answer per session. */
export interface SessionPanelService {
  /** Fold one session's answer, reusing the kept one while it is fresh; `fresh` asks past that kept answer. */
  get(sessionId: string, billing?: BillingRows, fresh?: boolean): Promise<SessionPanelValue>
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
      // A session that recorded no directory works in the reader's home, as the host's own default does.
      const recorded = text(observation.header?.cwd) ?? text(projections.workingDirectory)
      const resolvedDirectory = resolve(recorded ?? homedir())
      const events = observation.events ?? []
      if (entry.cursor === -1 || events.length > 0) {
        const incoming = arrivals(events, entry.cursor)
        foldPanelContext(entry.context, incoming)
        foldPanelRound(entry.round, incoming, resolvedDirectory)
        const last = incoming[incoming.length - 1]
        if (last !== undefined) entry.cursor = last.seq ?? entry.cursor
      }
      const agents = ctx.get('agents') as AgentsRegistry | null | undefined
      // Where automatic compaction fires is the host's own policy, scaled to this
      // session's window and output reservation (D100).
      const thresholdTokens = compactionThresholdOf(ctx, agents, sessionId, entry.context, projections.contextPressure?.contextWindow)
      const value: SessionPanelValue = {
        directory: resolvedDirectory,
        context: panelContextOf(projections, entry.context, thresholdTokens),
        // Newest first: the row a reader just caused stands at the top of the list.
        outputs: [...entry.round.outputs].reverse(),
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

  async function get(sessionId: string, billing: BillingRows = { rows: [], currency: null }, fresh = false): Promise<SessionPanelValue> {
    const held = entries.get(sessionId)
    if (held !== undefined) {
      held.touchedAt = Date.now()
      if (held.loading !== null) return held.loading
      if (!fresh && Date.now() - held.at < ANSWER_TTL_MS) return held.value
    }
    const entry: Entry = held ?? {
      value: { directory: null, context: null, outputs: [] },
      at: 0,
      cursor: -1,
      context: createPanelContext(),
      round: createPanelRound(),
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
    ensure,
    dispose() {
      disposed = true
      if (stopEvents !== null) stopEvents()
      stopEvents = null
      entries.clear()
    },
  }
}
