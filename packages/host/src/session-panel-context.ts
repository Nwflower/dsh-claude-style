/** The context window's composition, folded from the session log's own surface (D106, D104).
 *
 * Every part is priced from the content the host sends — the retained messages, the
 * request header's tool definitions, the system prompt — by the shared estimator in
 * packages/contracts/src/tokens.ts, so one yardstick prices every part and the parts
 * split the provider's own occupancy reading by their true sizes rather than by a
 * flat characters-per-token rate.
 *
 * The fold is incremental: a message is priced once when it arrives, its price joins
 * the running totals of the kinds it contributes to, and a replacement retires the
 * prices it covers. Only a compaction walks the retained messages, so a long session
 * costs one price per event.
 *
 * The categories follow the block form first and the producer attribution second
 * (D104): reasoning, tool-call and attachment blocks are extracted from whatever
 * message carries them; the assistant's reasoning is the residual left after its text,
 * calls and attachments are priced (so invisible reasoning lands there too); every
 * other carrier's remaining text routes by source — skill content to skills, attributed
 * injections to injection, the unattributed conversation to conversation. The system
 * prompt keeps every surviving prompt; tool definitions and the MCP proxy's are priced
 * from the request header.
 */
import type { PanelContext, PanelContextKind, PanelContextPart, PanelContextProjections } from '@dsh-claude-style/contracts/session-panel'
import { messageBlockParts, toolSchemaTokens } from '@dsh-claude-style/contracts/tokens'
import type { PanelEvent } from './session-panel-log.js'

/** The kinds a retained message contributes to; tools and mcp come from the request header. */
type MessageKind = Exclude<PanelContextKind, 'tools' | 'mcp'>

/** The order the parts are published in. */
const KIND_ORDER: readonly PanelContextKind[] = ['system', 'tools', 'mcp', 'skills', 'conversation', 'reasoning', 'tool-call', 'tool-result', 'attachment', 'injection']

/** One retained message's contributions by kind, kept so a replacement can retire them. */
interface PanelContextNode {
  contributions: Partial<Record<MessageKind, number>>
}

/** Kept per session with the panel's event cursor. */
export interface PanelContextState {
  /** Every retained message's contributions, by the sequence its surface entry carries. */
  nodes: Map<number, PanelContextNode>
  /** Running totals per message kind, so publishing never walks the messages. */
  sums: Record<MessageKind, number>
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
    sums: { system: 0, skills: 0, conversation: 0, reasoning: 0, 'tool-call': 0, 'tool-result': 0, attachment: 0, injection: 0 },
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

/** The source whose text a message's non-attachment blocks route to (D104). */
type SourceKind = 'system' | 'assistant' | 'skills' | 'tool-result' | 'injection' | 'conversation'

/**
 * The source kind of one event's message, or null when the event carries no model-visible
 * message. The producer attribution decides: a skill catalog entry, a skill invocation and a
 * skill body are skills; an instruction file and any other attributed injection (a runtime
 * context, a subagent relay, a job notice) are injection; what carries no attribution is the
 * conversation. The assistant is split by block form rather than routed as one source.
 */
function kindOf(event: PanelEvent, message: { content?: unknown, source?: { kind?: string, form?: string } }): SourceKind | null {
  switch (event.type) {
    case 'system/message':
      return 'system'
    case 'assistant/message':
      return 'assistant'
    case 'tool/result':
      return opensSkill(message.content) ? 'skills' : 'tool-result'
    case 'developer/message':
      return 'injection'
    case 'user/message': {
      const source = message.source
      if (source?.kind === 'skill-catalog' || source?.kind === 'skill-invocation') return 'skills'
      // A real user turn carries either no attribution or the host's own `user` kind.
      if (source?.kind !== undefined && source.kind !== '' && source.kind !== 'user') return 'injection'
      if (source?.form !== undefined) return 'injection'
      return 'conversation'
    }
    default:
      return null
  }
}

/**
 * One message's contributions by context kind (D104). Attachments are extracted first from
 * any carrier; the assistant's text, calls and reasoning residual split apart; every other
 * carrier's remaining text (including any unknown blocks) routes to its source kind.
 */
function contributionsOf(event: PanelEvent, message: { content?: unknown, source?: { kind?: string, form?: string } }): Partial<Record<MessageKind, number>> | null {
  const source = kindOf(event, message)
  if (source === null) return null
  const parts = messageBlockParts(message)
  const out: Partial<Record<MessageKind, number>> = {}
  const add = (kind: MessageKind, tokens: number) => { if (tokens > 0) out[kind] = (out[kind] ?? 0) + tokens }
  add('attachment', parts.attachment)
  if (source === 'assistant') {
    add('conversation', parts.text)
    add('tool-call', parts.toolCall)
    add('reasoning', parts.reasoning + parts.other)
  } else {
    add(source, parts.text + parts.reasoning + parts.toolCall + parts.other)
  }
  return out
}

/** Retire every contribution a replacement covers. */
function retire(state: PanelContextState, startSeq: number, endSeq: number) {
  for (const [seq, node] of state.nodes) {
    if (seq < startSeq || seq > endSeq) continue
    for (const kind of Object.keys(node.contributions) as MessageKind[]) {
      state.sums[kind] -= node.contributions[kind] ?? 0
    }
    state.nodes.delete(seq)
  }
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
    const contributions = contributionsOf(event, message)
    if (contributions === null) continue
    const existing = state.nodes.get(event.seq)
    if (existing !== undefined) retire(state, event.seq, event.seq)
    state.nodes.set(event.seq, { contributions })
    for (const kind of Object.keys(contributions) as MessageKind[]) {
      state.sums[kind] += contributions[kind] ?? 0
    }
  }
}

/**
 * Publish the composition against the provider's own occupancy reading.
 *
 * The occupancy and the window are the provider's figures; the parts are this fold's
 * prices, which the browser half divides into the occupancy in proportion (D106).
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
    system: state.sums.system,
    tools: state.tools,
    mcp: state.mcp,
    skills: state.sums.skills,
    conversation: state.sums.conversation,
    reasoning: state.sums.reasoning,
    'tool-call': state.sums['tool-call'],
    'tool-result': state.sums['tool-result'],
    attachment: state.sums.attachment,
    injection: state.sums.injection,
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