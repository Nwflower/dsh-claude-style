/** The host's compaction answer, read for the rail's context section (D100).
 *
 * Two questions live here. Where does automatic compaction fire: the threshold is the
 * backend's policy scaled to the session's own window and output reservation, and the
 * backend's own defaults stand in where a host keeps that policy to itself. And can a
 * reader ask for it now: the rail runs the host's own `/compact` command through the
 * command registry, so one press goes through the seam's own admission, lock and
 * summary rather than imitating any of it.
 *
 * The compaction backend is loaded inside an isolated scope on a profile that groups
 * it, which is why the command registry — not `ctx.compaction` — is what a plugin can
 * reach. Both readings are feature-detected: a host without the command leaves the
 * section as it was.
 */
import { DEFAULT_COMPACTION_POLICY, compactionThreshold } from '@dsh-claude-style/contracts/compaction'
import type { CompactionPolicy, PanelCompactAnswer } from '@dsh-claude-style/contracts/compaction'
import type { DshContext } from '@dsh-claude-style/engine/node/dsh'
import type { PanelContextState } from './session-panel-context.js'

/** The backend members a host that publishes its policy exposes. */
interface CompactionSeam {
  config?: unknown
}

/** The registry that answers a session's live agent. */
interface AgentLookup {
  get?(id: string): unknown
}

/** One command's outcome, as the registry reports it. */
interface CommandExecution {
  result?: { kind?: string, text?: string }
}

/** The command registry, in the members this module drives. */
interface CommandRegistry {
  execute?(agent: unknown, line: string, attachments: readonly unknown[], signal: AbortSignal): Promise<CommandExecution | undefined>
}

/** A context that can answer a service by name. */
interface ServiceScope {
  get?(name: string): unknown
}

/** The command a reader's press runs, spelled as the reader would type it. */
const COMPACT_COMMAND = '/compact'

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object'

/**
 * The policy the backend states for one routed model, over the defaults it would
 * apply when it states nothing.
 *
 * @param config - the backend's resolved configuration, when its scope is readable.
 * @param provider - the provider the latest request was sent to.
 * @param model - the model the latest request named.
 * @returns the merged policy.
 */
function policyOf(config: unknown, provider: string, model: string): CompactionPolicy {
  if (!isRecord(config)) return DEFAULT_COMPACTION_POLICY
  const overrides = Array.isArray(config.modelPolicies) ? config.modelPolicies : []
  const match = overrides.find(entry => isRecord(entry) && entry.provider === provider && entry.model === model)
  const stated = isRecord(match) ? match : {}
  return {
    thresholdRatio: stated.thresholdRatio ?? config.thresholdRatio ?? DEFAULT_COMPACTION_POLICY.thresholdRatio,
    headroomTokens: stated.headroomTokens ?? config.headroomTokens ?? DEFAULT_COMPACTION_POLICY.headroomTokens,
    maxTokens: stated.maxTokens ?? config.maxTokens ?? DEFAULT_COMPACTION_POLICY.maxTokens,
  }
}

/** The backend's published configuration, when the host lets a plugin see it. */
function backendConfigOf(ctx: DshContext, agent: unknown): unknown {
  const agentScope = (agent as { ctx?: ServiceScope } | null | undefined)?.ctx
  const fromAgent = agentScope?.get?.('compaction')
  if (isRecord(fromAgent)) return fromAgent.config
  const fromRoot = (ctx as unknown as ServiceScope).get?.('compaction')
  return isRecord(fromRoot) ? fromRoot.config : undefined
}

/**
 * Where automatic compaction fires for one session.
 *
 * @param ctx - host plugin context.
 * @param agents - the registry that answers the session's live agent.
 * @param sessionId - the session the rail shows.
 * @param state - the session's folded context state, read for its route and reservation.
 * @param window - the route's context window in tokens.
 * @returns the threshold, or null while the session has no window.
 */
export function compactionThresholdOf(
  ctx: DshContext,
  agents: AgentLookup | null | undefined,
  sessionId: string,
  state: PanelContextState,
  window: number | undefined,
): number | null {
  const policy = policyOf(backendConfigOf(ctx, agents?.get?.(sessionId)), state.provider, state.model)
  return compactionThreshold({ contextWindow: window, reservedOutput: state.reservedOutput, policy })
}

/**
 * Compact one session's history through the host's own command.
 *
 * @param ctx - host plugin context.
 * @param sessionId - the session to compact.
 * @returns the host's own sentence about the attempt, or the reason it never ran.
 *   A registry fault propagates to the route's 500 answer.
 */
export async function compactSession(ctx: DshContext, sessionId: string): Promise<PanelCompactAnswer> {
  const agent = (ctx.get('agents') as AgentLookup | null | undefined)?.get?.(sessionId)
  if (agent === undefined) return { ok: false, code: 'no-agent' }
  const commands = ctx.get('commands') as CommandRegistry | null | undefined
  if (typeof commands?.execute !== 'function') return { ok: false, code: 'unavailable' }
  const execution = await commands.execute(agent, COMPACT_COMMAND, [], new AbortController().signal)
  // A command the host never registered leaves no execution: nothing was admitted.
  if (execution === undefined) return { ok: false, code: 'unavailable' }
  const result = execution.result ?? {}
  const text = typeof result.text === 'string' && result.text !== '' ? result.text : undefined
  return result.kind === 'success'
    ? { ok: true, ...(text === undefined ? {} : { text }) }
    : { ok: false, ...(text === undefined ? {} : { text }) }
}
