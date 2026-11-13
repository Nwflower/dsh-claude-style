/** The context bar and legend share calibrated parts and ordering (D94).
 * Provider occupancy is authoritative; the host meter's source-attributed
 * estimates divide that occupancy. Integer allocation keeps their sum exact.
 */
import type { PanelContext, PanelContextKind } from '@dsh-claude-style/contracts/session-panel'
import type { CopyKey } from './copy'

const LABELS: Record<PanelContextKind, CopyKey> = {
  messages: 'messageTokens', tools: 'toolTokens', mcp: 'mcpTokens',
  system: 'systemTokens', memory: 'memoryTokens', skills: 'skillTokens', other: 'otherContextTokens',
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
 * The context section's overview, known before its breakdown (D94).
 *
 * The occupancy is the provider's own reading and arrives as a projection frame,
 * so the section can state the percentage, the used/window figures and the room
 * left on the frame the rail mounts; the breakdown under it is the host's fold,
 * and it takes its place when that answers. The live reading decides while it
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

export function contextRows(context: PanelContext): ContextRow[] {
  const parts = context.parts ?? [
    { kind: 'messages', tokens: context.messages },
    { kind: 'tools', tokens: context.tools },
    { kind: 'system', tokens: context.system },
  ]
  const total = parts.reduce((sum, part) => sum + part.tokens, 0)
  const used = Math.max(0, Math.round(context.used))
  // A provider reading without composition remains explicitly unattributed.
  const source = total > 0 ? parts : [{ kind: 'other' as const, tokens: 1 }]
  let allocated = 0
  let weight = 0
  return (Object.keys(LABELS) as PanelContextKind[]).flatMap(kind => {
    const tokens = source.filter(part => part.kind === kind).reduce((sum, part) => sum + part.tokens, 0)
    if (tokens <= 0) return []
    weight += tokens
    const next = Math.round(used * weight / (total || 1))
    const amount = next - allocated
    allocated = next
    return [{ kind, label: LABELS[kind], tokens: amount, share: amount / context.window * 100 }]
  })
}
