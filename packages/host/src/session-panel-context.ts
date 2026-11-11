/** Source-attributed context parts for the details rail (D43, D94).
 * The request header owns tool schemas; retained surface messages own injected
 * instructions and skills. Only source metadata classifies content. Replacement
 * ranges retire the contributions they cover, including after compaction.
 */
import type { PanelContext, PanelContextKind, PanelContextPart, PanelContextProjections } from '@dsh-claude-style/contracts/session-panel'
import type { PanelEvent, PanelMessage } from './session-panel-log.js'

/** The host meter's own message estimator, shared with its context projection. */
export interface PanelTokenMeter {
  estimateMessage(message: PanelMessage): number
}

/** Kept per session with the panel's event cursor; only attributed nodes survive. */
export interface PanelContextState {
  nodes: Map<number, PanelContextPart>
  mcpShare: number
}

export function createPanelContext(): PanelContextState {
  return { nodes: new Map(), mcpShare: 0 }
}

export function foldPanelContext(state: PanelContextState, events: readonly PanelEvent[], meter: PanelTokenMeter | null | undefined) {
  for (const event of events) {
    if (event.type === 'request/header') {
      const tools = event.data?.header?.tools ?? []
      let total = 0
      let mcp = 0
      for (const tool of tools) {
        const weight = JSON.stringify(tool).length
        total += weight
        // The host's MCP proxy declares this model-facing name (D43).
        if (tool.name.startsWith('mcp__')) mcp += weight
      }
      state.mcpShare = total === 0 ? 0 : mcp / total
    }
    const operation = event.surfaceOp
    if (operation !== undefined && operation !== 'append') {
      for (const seq of state.nodes.keys()) {
        if (seq >= operation.startSeq && seq <= operation.endSeq) state.nodes.delete(seq)
      }
    }
    const message = event.data
    if (event.type !== 'user/message' || message === undefined || event.seq === undefined) continue
    const source = message.source
    let kind: PanelContextKind
    if (source?.kind === 'skill-catalog' || source?.kind === 'skill-invocation') kind = 'skills'
    else if (source?.form === 'instructions') kind = 'memory'
    else if (source?.kind === 'runtime-context') kind = 'other'
    else continue
    // A host without the estimator supplies only its aggregate projection.
    // No attributed count can be stated on that host (D94).
    if (meter === null || meter === undefined) continue
    state.nodes.set(event.seq, { kind, tokens: meter.estimateMessage(message) })
  }
}

export function panelContextOf(projections: PanelContextProjections, state: PanelContextState): PanelContext | null {
  const pressure = projections.contextPressure
  const used = pressure?.projectedTokens ?? pressure?.pressureTokens
  const window = pressure?.contextWindow
  if (used === undefined || window === undefined || window <= 0) return null
  const breakdown = projections.contextBreakdown
  const system = breakdown?.systemTokens ?? 0
  const tools = breakdown?.toolsTokens ?? 0
  const messages = breakdown?.messageTokens ?? 0
  const attributed = new Map<PanelContextKind, number>()
  for (const node of state.nodes.values()) attributed.set(node.kind, (attributed.get(node.kind) ?? 0) + node.tokens)
  const injected = [...attributed.values()].reduce((sum, tokens) => sum + tokens, 0)
  const scale = injected > messages ? messages / injected : 1
  const mcp = tools * state.mcpShare
  return {
    used, window, system, tools, messages,
    parts: [
      { kind: 'messages', tokens: Math.max(0, messages - injected) },
      { kind: 'tools', tokens: tools - mcp },
      { kind: 'mcp', tokens: mcp },
      { kind: 'system', tokens: system },
      ...[...attributed].map(([kind, tokens]) => ({ kind, tokens: tokens * scale })),
    ],
  }
}
