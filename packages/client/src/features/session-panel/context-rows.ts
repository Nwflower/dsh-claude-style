/** The context bar and legend share priced parts and ordering (D106, D104).
 * Provider occupancy is authoritative; the host's source-attributed prices divide
 * that occupancy. Integer allocation keeps their sum exact. The fold's granular
 * tool, MCP and skill parts merge into one capability row whose label names whichever
 * of the three are present.
 */
import type { PanelContext } from '@dsh-claude-style/contracts/session-panel'
import type { CopyKey } from './copy'

/** The legend's display categories (D104): tools, MCP and skills share the capability row. */
export type ContextDisplayKind =
  | 'system' | 'capability' | 'conversation' | 'reasoning'
  | 'tool-call' | 'tool-result' | 'attachment' | 'injection'

/** The order the categories are allocated in before the rows sort largest first. */
const DISPLAY_ORDER: readonly ContextDisplayKind[] = ['system', 'capability', 'conversation', 'reasoning', 'tool-call', 'tool-result', 'attachment', 'injection']

const DISPLAY_LABELS: Record<ContextDisplayKind, CopyKey> = {
  system: 'systemTokens', capability: 'capabilityTokens', conversation: 'conversationTokens',
  reasoning: 'reasoningTokens', 'tool-call': 'toolCallTokens', 'tool-result': 'toolResultTokens',
  attachment: 'attachmentTokens', injection: 'injectionTokens',
}

/** One occupancy reading: how much of the session's window stands used. */
export interface ContextOccupancy {
  used: number
  window: number
}

/** The overview's two figures, in tokens: what the section states before its parts. */
export type ContextOverview = ContextOccupancy

/** One context category's share of the window, as the bar and the legend print it. */
export interface ContextRow {
  kind: ContextDisplayKind
  label: CopyKey
  tokens: number
  share: number
}

/**
 * The context section's overview, known before its composition (D106).
 *
 * The occupancy is the provider's own reading and arrives as a projection frame,
 * so the section can state the percentage, the used/window figures and the room
 * left on the frame the rail mounts; the parts under it are the host's fold, and
 * they take their place when that answers. The live reading decides while it
 * answers, since it is the same projection the route's fold carries.
 * @param occupancy - the live occupancy for the session, or null before it answers.
 * @param context - the route's context reading, or null before it answers.
 */
export function contextOverview(occupancy: ContextOccupancy | null, context: PanelContext | null): ContextOverview | null {
  const used = occupancy?.used ?? context?.used
  const window = occupancy?.window ?? context?.window
  if (used === undefined || window === undefined || !(window > 0)) return null
  return { used: Math.max(0, Math.min(window, used)), window }
}

/**
 * The composition's rows: every priced category, largest first, each with the tokens the
 * occupancy assigns it and its share of the whole window. The tool, MCP and skill parts
 * merge into the capability row, labelled by whichever of the three are present (D104).
 *
 * The occupancy is divided in the categories' own reading order, then the rows are put
 * largest first so the bar reads left to right by weight. The sort is stable, so equal
 * parts keep that reading order. The room left is not one of these rows: the section
 * states it after them.
 * @param context - the host's composition for the session.
 * @returns the rows, the empty ones left out.
 */
export function contextRows(context: PanelContext): ContextRow[] {
  const total = context.parts.reduce((sum, part) => sum + part.tokens, 0)
  const used = Math.max(0, Math.round(context.used))
  // A provider reading without composition remains explicitly unattributed.
  const parts = total > 0 ? context.parts : [{ kind: 'injection' as const, tokens: 1 }]
  const weights: Record<ContextDisplayKind, number> = {
    system: 0, capability: 0, conversation: 0, reasoning: 0,
    'tool-call': 0, 'tool-result': 0, attachment: 0, injection: 0,
  }
  let hasMcp = false
  let hasSkills = false
  for (const part of parts) {
    if (part.kind === 'tools') weights.capability += part.tokens
    else if (part.kind === 'mcp') { weights.capability += part.tokens; hasMcp = true }
    else if (part.kind === 'skills') { weights.capability += part.tokens; hasSkills = true }
    else weights[part.kind] += part.tokens
  }
  const capabilityLabel: CopyKey = hasMcp && hasSkills ? 'capabilityTokens'
    : hasMcp ? 'capabilityToolsMcp' : hasSkills ? 'capabilityToolsSkills' : 'capabilityToolsOnly'
  const weightTotal = DISPLAY_ORDER.reduce((sum, kind) => sum + weights[kind], 0)
  let allocated = 0
  let cumulative = 0
  const rows = DISPLAY_ORDER.flatMap(kind => {
    const weight = weights[kind]
    if (weight <= 0) return []
    cumulative += weight
    const next = Math.round(used * cumulative / (weightTotal || 1))
    const amount = next - allocated
    allocated = next
    const label = kind === 'capability' ? capabilityLabel : DISPLAY_LABELS[kind]
    return [{ kind, label, tokens: amount, share: amount / context.window * 100 }]
  })
  return rows.sort((left, right) => right.tokens - left.tokens)
}