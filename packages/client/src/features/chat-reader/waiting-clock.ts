import type { PendingSubmission } from '@deepseek-ai/dsh-api-session-controller/client'
import type { ChatConversationViewNode, ChatNode, ChatNodeKind } from '@deepseek-ai/dsh-client-ui-chat/client'

/**
 * When the current wait for the model began (D57), ported from
 * dsh-better-display's waiting clock (MIT). The clock counts from the last node
 * that handed the move back to the model, not from the turn's first message:
 * anchoring on the message alone counted the minutes the tools had already spent.
 */

export interface WaitingAnchor {
  key: string
  time: number | null
}

/** The chat kinds that can hand the move back; `satisfies` refuses a kind the host does not register. */
export const HANDOVER_KINDS = ['user', 'steering', 'context', 'model-retry', 'tool-call', 'command'] as const satisfies readonly ChatNodeKind[]

/** A node's payload once its kind is known. */
function dataOf<Kind extends ChatNodeKind>(node: ChatConversationViewNode, kind: Kind): ChatNode<Kind>['data'] | undefined {
  return node.kind === kind ? node.data as ChatNode<Kind>['data'] : undefined
}

/**
 * The instant a node handed the move back to the model, or undefined when it
 * did not. A running tool or command is the one working, so only its settled
 * form hands over: a call settles as a `tool-result`, a command with an outcome.
 */
export function handoverTime(node: ChatConversationViewNode): number | undefined {
  const user = dataOf(node, 'user') ?? dataOf(node, 'steering') ?? dataOf(node, 'context')
  if (user !== undefined) return user.time
  const retry = dataOf(node, 'model-retry')
  if (retry !== undefined) return retry.current.time
  const tool = dataOf(node, 'tool-call')
  if (tool !== undefined) return 'kind' in tool.root ? tool.root.time : undefined
  const command = dataOf(node, 'command')
  if (command !== undefined) return command.outcome === null ? undefined : command.time
  return undefined
}

export function handsBackToModel(node: ChatConversationViewNode): boolean {
  return handoverTime(node) !== undefined
}

const timestamp = (value: number | undefined): number | null => typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null

/**
 * The wait's anchor: the last node that handed over, unless a newer local
 * echo of the reader's own message is still on its way. A queued echo belongs
 * to a later turn and an echo older than the anchor is stale; neither moves it.
 */
export function waitingAnchor(order: readonly string[], get: (key: string) => ChatConversationViewNode | undefined, pending: readonly PendingSubmission[] = []): WaitingAnchor {
  let anchor: WaitingAnchor = { key: 'unresolved', time: null }
  for (let index = order.length - 1; index >= 0; index -= 1) {
    const node = get(order[index]!)
    if (node === undefined) continue
    const time = handoverTime(node)
    if (time === undefined) continue
    anchor = { key: order[index]!, time: timestamp(time) }
    break
  }
  for (let index = pending.length - 1; index >= 0; index -= 1) {
    const input = pending[index]!
    if (input.placement === 'queued') continue
    const time = timestamp(input.time)
    if (time === null || anchor.time === null || time >= anchor.time) return { key: `pending:${input.requestId}`, time }
    break
  }
  return anchor
}
