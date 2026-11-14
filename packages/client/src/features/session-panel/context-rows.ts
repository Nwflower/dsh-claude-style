/** The context bar and legend share priced parts and ordering (D94, D99).
 * Provider occupancy is authoritative; the host's source-attributed prices divide
 * that occupancy. Integer allocation keeps their sum exact.
 */
import type { PanelContext, PanelContextKind } from '@dsh-claude-style/contracts/session-panel'
import type { CopyKey } from './copy'

const LABELS: Record<PanelContextKind, CopyKey> = {
  system: 'systemTokens', tools: 'toolTokens', mcp: 'mcpTokens',
  user: 'userTokens', assistant: 'assistantTokens', 'tool-result': 'toolResultTokens',
  memory: 'memoryTokens', skills: 'skillTokens', other: 'otherContextTokens',
}

/** One occupancy reading: how much of the session's window stands used. */
export interface ContextOccupancy {
  used: number
  window: number
}

/** The overview's two figures, in tokens: what the section states before its parts. */
export type ContextOverview = ContextOccupancy

/** One context kind's share of the window, as the bar and the legend print it. */
export interface ContextRow {
  kind: PanelContextKind
  label: CopyKey
  tokens: number
  share: number
}

/**
 * The context section's overview, known before its composition (D94).
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
 * The composition's rows: every priced kind, largest first, each with the tokens the
 * occupancy assigns it and its share of the whole window.
 *
 * The occupancy is divided in the labels' own reading order, then the rows are put
 * largest first so the bar reads left to right by weight. The sort is stable, so
 * equal parts keep that reading order. The room left is not one of these rows: the
 * section states it after them.
 * @param context - the host's composition for the session.
 * @returns the rows, the empty ones left out.
 */
export function contextRows(context: PanelContext): ContextRow[] {
  const total = context.parts.reduce((sum, part) => sum + part.tokens, 0)
  const used = Math.max(0, Math.round(context.used))
  // A provider reading without composition remains explicitly unattributed.
  const parts = total > 0 ? context.parts : [{ kind: 'other' as const, tokens: 1 }]
  let allocated = 0
  let weight = 0
  const rows = (Object.keys(LABELS) as PanelContextKind[]).flatMap(kind => {
    const tokens = parts.filter(part => part.kind === kind).reduce((sum, part) => sum + part.tokens, 0)
    if (tokens <= 0) return []
    weight += tokens
    const next = Math.round(used * weight / (total || 1))
    const amount = next - allocated
    allocated = next
    return [{ kind, label: LABELS[kind], tokens: amount, share: amount / context.window * 100 }]
  })
  return rows.sort((left, right) => right.tokens - left.tokens)
}
