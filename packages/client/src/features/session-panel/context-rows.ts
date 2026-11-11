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

export function contextRows(context: PanelContext) {
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
