/** The context window's composition, folded from the session log's own surface (D94, D99).
 *
 * Every part is priced from the content the host sends — the retained messages, the
 * request header's tool definitions, the system prompt — by the shared estimator in
 * packages/contracts/src/tokens.ts, so one yardstick prices every part and the parts
 * split the provider's own occupancy reading by their true sizes rather than by a
 * flat characters-per-token rate.
 *
 * The fold is incremental: a message is priced once when it arrives, its price joins
 * the running total of its kind, and a replacement retires the prices it covers. Only
 * a compaction walks the retained messages, so a long session costs one price per
 * event. The classification reads the event type and the producer attribution the
 * host records, never the message's own text.
 */
import type { PanelContext, PanelContextKind, PanelContextPart, PanelContextProjections } from '@dsh-claude-style/contracts/session-panel'
import { messageTokens, toolSchemaTokens } from '@dsh-claude-style/contracts/tokens'
import type { PanelEvent } from './session-panel-log.js'

/** The kinds a retained message can hold; the system prompt and the tools have their own counts. */
type MessageKind = Exclude<PanelContextKind, 'system' | 'tools' | 'mcp'>

/** The order the parts are published and drawn in. */
const KIND_ORDER: readonly PanelContextKind[] = ['system', 'tools', 'mcp', 'user', 'assistant', 'tool-result', 'memory', 'skills', 'other']

/** One retained message's contribution, kept so a replacement can retire it. */
interface PanelContextNode {
  kind: PanelContextKind
  tokens: number
}

/** Kept per session with the panel's event cursor. */
export interface PanelContextState {
  /** Every retained message's price, by the sequence its surface entry carries. */
  nodes: Map<number, PanelContextNode>
  /** Running totals per retained-message kind, so publishing never walks the messages. */
  sums: Record<MessageKind, number>
  /** The newest system prompt's price and sequence, or null while none survives. */
  system: { seq: number, tokens: number } | null
  /** What the latest request header's tool definitions cost, the MCP proxy's apart. */
  tools: number
  mcp: number
  /** The route the latest request was sent to, when the header names it. */
  provider: string
  model: string
  /** Output tokens the latest request reserved for itself, or null when the header states none. */
  reservedOutput: number | null
}

export function createPanelContext(): PanelContextState {
  return {
    nodes: new Map(),
    sums: { user: 0, assistant: 0, 'tool-result': 0, memory: 0, skills: 0, other: 0 },
    system: null,
    tools: 0,
    mcp: 0,
    provider: '',
    model: '',
    reservedOutput: null,
  }
}

/** The text a tool result opens with when a skill's own body is its payload. */
const SKILL_CONTENT = '<skill_content'

/**
 * Whether a tool result carries a skill's body.
 *
 * The host's `skill` tool answers with the skill's instructions wrapped in a
 * `<skill_content name="…">` marker, and no source attribution reaches the log for
 * it: the calling tool's name is the only witness, and the marker its answer opens
 * with. Only the first text block's first bytes are read, so a megabyte of tool
 * output is not copied to answer the question.
 */
function opensSkill(content: unknown): boolean {
  if (!Array.isArray(content)) return false
  for (const block of content) {
    if (block === null || typeof block !== 'object') continue
    const { type, text } = block as { type?: unknown, text?: unknown }
    if (type !== 'text' || typeof text !== 'string') continue
    return text.startsWith(SKILL_CONTENT)
  }
  return false
}

/**
 * The kind one event's message belongs to, or null when the event carries no
 * model-visible message.
 *
 * The producer attribution decides: a skill catalog entry and a skill invocation are
 * skills, an instruction file's own text is memory, any other attributed injection
 * (a runtime context, a subagent relay, a job notice) is other context, and what
 * carries no attribution is the conversation. The system prompt is published as its
 * own part rather than kept with the messages.
 */
function kindOf(event: PanelEvent, message: { content?: unknown, source?: { kind?: string, form?: string } }): PanelContextKind | null {
  switch (event.type) {
    case 'system/message':
      return 'system'
    case 'assistant/message':
      return 'assistant'
    case 'tool/result':
      return opensSkill(message.content) ? 'skills' : 'tool-result'
    case 'developer/message':
      return message.source?.form === 'instructions' ? 'memory' : 'other'
    case 'user/message': {
      const source = message.source
      if (source?.kind === 'skill-catalog' || source?.kind === 'skill-invocation') return 'skills'
      if (source?.form === 'instructions') return 'memory'
      // A real user turn carries either no attribution or the host's own `user` kind.
      if (source?.kind !== undefined && source.kind !== '' && source.kind !== 'user') return 'other'
      if (source?.form !== undefined) return 'other'
      return 'user'
    }
    default:
      return null
  }
}

/** Retire every price a replacement covers, its system prompt included. */
function retire(state: PanelContextState, startSeq: number, endSeq: number) {
  for (const [seq, node] of state.nodes) {
    if (seq < startSeq || seq > endSeq) continue
    if (node.kind !== 'system') state.sums[node.kind as MessageKind] -= node.tokens
    state.nodes.delete(seq)
  }
  const system = state.system
  if (system !== null && system.seq >= startSeq && system.seq <= endSeq) state.system = null
}

/** Price the latest request header's tool definitions, the MCP proxy's own counted apart (D43). */
function priceTools(state: PanelContextState, tools: readonly unknown[]) {
  let plain = 0
  let mcp = 0
  for (const tool of tools) {
    const tokens = toolSchemaTokens(tool)
    const name = (tool as { name?: unknown } | null)?.name
    // The host's MCP proxy declares this model-facing name (D43).
    if (typeof name === 'string' && name.startsWith('mcp__')) mcp += tokens
    else plain += tokens
  }
  state.tools = plain
  state.mcp = mcp
}

/**
 * Fold one batch of session events into the context composition.
 *
 * @param state - the session's kept context state.
 * @param events - the events that arrived since the last fold, oldest first.
 */
export function foldPanelContext(state: PanelContextState, events: readonly PanelEvent[]) {
  for (const event of events) {
    const operation = event.surfaceOp
    if (operation !== undefined && operation !== 'append') retire(state, operation.startSeq, operation.endSeq)
    const data = event.data
    if (event.type === 'request/header') {
      const tools = data?.header?.tools
      priceTools(state, Array.isArray(tools) ? tools : [])
      const config = data?.header?.config
      if (typeof config?.provider === 'string') state.provider = config.provider
      if (typeof config?.model === 'string') state.model = config.model
      state.reservedOutput = typeof config?.maxTokens === 'number' && Number.isFinite(config.maxTokens) && config.maxTokens > 0
        ? config.maxTokens
        : null
      continue
    }
    if (data === undefined || event.seq === undefined) continue
    const message = data.message ?? data
    const kind = kindOf(event, message)
    if (kind === null) continue
    const tokens = messageTokens(message)
    if (kind === 'system') {
      // A newer system prompt supersedes the one it follows; a surviving older prompt
      // is still sent, so its price stays in the composition as other context.
      const previous = state.system
      if (previous !== null && previous.seq !== event.seq) {
        const kept = state.nodes.get(previous.seq)
        if (kept !== undefined) {
          kept.kind = 'other'
          state.sums.other += kept.tokens
        }
      }
      state.system = { seq: event.seq, tokens }
      state.nodes.set(event.seq, { kind: 'system', tokens })
      continue
    }
    const existing = state.nodes.get(event.seq)
    if (existing !== undefined) retire(state, event.seq, event.seq)
    state.nodes.set(event.seq, { kind, tokens })
    state.sums[kind as MessageKind] += tokens
  }
}

/**
 * Publish the composition against the provider's own occupancy reading.
 *
 * The occupancy and the window are the provider's figures; the parts are this fold's
 * prices, which the browser half divides into the occupancy in proportion (D94).
 *
 * @param projections - the host's projection values for the session.
 * @param state - the folded context composition.
 * @param thresholdTokens - where automatic compaction fires, or null while the host
 *   states no policy (D100).
 * @returns the panel's context value, or null while the host reports no occupancy.
 */
export function panelContextOf(
  projections: PanelContextProjections,
  state: PanelContextState,
  thresholdTokens: number | null = null,
): PanelContext | null {
  const pressure = projections.contextPressure
  const used = pressure?.projectedTokens ?? pressure?.pressureTokens
  const window = pressure?.contextWindow
  if (used === undefined || window === undefined || window <= 0) return null
  const counts: Record<PanelContextKind, number> = {
    system: state.system?.tokens ?? 0,
    tools: state.tools,
    mcp: state.mcp,
    user: state.sums.user,
    assistant: state.sums.assistant,
    'tool-result': state.sums['tool-result'],
    memory: state.sums.memory,
    skills: state.sums.skills,
    other: state.sums.other,
  }
  const parts: PanelContextPart[] = []
  for (const kind of KIND_ORDER) {
    const tokens = Math.max(0, Math.round(counts[kind]))
    if (tokens > 0) parts.push({ kind, tokens })
  }
  return {
    used,
    window,
    parts,
    ...(thresholdTokens !== null && thresholdTokens > 0 ? { compaction: { thresholdTokens } } : {}),
  }
}
