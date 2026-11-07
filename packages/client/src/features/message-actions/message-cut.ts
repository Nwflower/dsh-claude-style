import {
  CHAT_ANSWER_ROW_SELECTOR,
  CHAT_FLOW_SELECTOR,
  CHAT_NODE_KEY_ATTRIBUTE,
  CHAT_TURN_ATTRIBUTE,
  FLOW_KIND_ATTRIBUTE,
  TURN_TAIL_SELECTOR,
  USER_ROW_KIND,
} from '@dsh-claude-style/contracts/dom'
import type { HostUiWorkspaceService } from '@dsh-claude-style/contracts/services'
import { conversationColumn } from '@dsh-claude-style/engine/chat-dom'
import {
  closestConversationSession,
  conversationSessionId,
  currentSessionId,
  findChatTarget,
  hostConversation,
  hostSessions,
  hostUiWorkspace,
} from '@dsh-claude-style/engine/host'
import type { HostContext } from '@dsh-claude-style/engine/host'

/**
 * 一条读者消息在会话日志里的位置，以及从它前面分岔出去的两种动作。
 *
 * 宿主没有原地截断会话的接口：会话控制器给出的是 `fork`，从某个事件为止的
 * 前缀复制成新会话（宿主自己的分支按钮就走这条路）。所以「撤回」和「编辑」
 * 都是先在消息前一个事件处分岔 —— 原会话一个事件都不动；撤回把原文放回新
 * 会话的输入框，编辑把改过的文字直接在里面发出去。
 */

/** 分岔之后等新会话挂上输入框的上限：宿主要先建会话、再把它的绑定交给页面。 */
const DRAFT_SEED_WAIT_MS = 4000
/** 两次查看绑定之间的间隔。 */
const DRAFT_SEED_POLL_MS = 60

/** 一条读者消息：它所在的会话、它的事件序号、它发出的正文，以及那一轮是否还在跑。 */
export interface ReaderMessage {
  sessionId: string
  /** 消息事件的序号，分岔的边界取它前一个。 */
  seq: number
  /** 消息正文，图片与文件附件不在其中。 */
  text: string
  /**
   * 消息带着图片或文件附件。附件是浏览器为一次发送上传的草稿，正文里只留下
   * 投递凭证，重新放进输入框或重新发出都会丢掉它们，所以这种消息不提供撤回
   * 与编辑。
   */
  attachments: boolean
  /** 那一轮还没结束：撤回与编辑要等它停下。 */
  open: boolean
}

function textOf(content: unknown): string {
  if (!Array.isArray(content)) return ''
  let text = ''
  for (const block of content) {
    if (typeof block !== 'object' || block === null) continue
    const piece = block as { type?: unknown, text?: unknown }
    if (piece.type === 'text' && typeof piece.text === 'string') text += piece.text
  }
  return text
}

/** 是否有正文以外的块：图片、文件，以及宿主将来加的任何一种。 */
function carriesAttachments(content: unknown): boolean {
  if (!Array.isArray(content)) return false
  return content.some((block) => {
    if (typeof block !== 'object' || block === null) return false
    return (block as { type?: unknown }).type !== 'text'
  })
}


/**
 * 读一条消息行对应的会话节点。行的 `data-chat-node-key` 与快照里节点的 key
 * 是同一个 key，节点自己的 `seq` 就是这条消息到达时的事件序号。
 */
export function readerMessageOf(ctx: HostContext, row: Element): ReaderMessage | null {
  const session = closestConversationSession(row)
  const sessionId = conversationSessionId(session) ?? currentSessionId(ctx)
  if (sessionId === null) return null
  const snapshot = findChatTarget(ctx, sessionId)?.getSnapshot()
  if (!snapshot) return null
  const key = row.getAttribute(CHAT_NODE_KEY_ATTRIBUTE)
  if (key === null) return null
  const node = snapshot.nodes?.values?.().find(candidate => candidate.key === key && candidate.kind === USER_ROW_KIND)
  const raw = node?.data?.seq
  if (typeof raw !== 'number' || !Number.isSafeInteger(raw)) return null
  const turn = Number(row.getAttribute(CHAT_TURN_ATTRIBUTE))
  const exchange = Number.isSafeInteger(turn) ? snapshot.timeline.turns.get(turn) : undefined
  return {
    sessionId,
    seq: raw,
    text: textOf(node?.data?.content),
    attachments: carriesAttachments(node?.data?.content),
    open: exchange !== undefined && exchange.end === undefined,
  }
}

/** The answer row itself, or the answer named by a turn-tail's turn. */
export function answerRowOf(row: Element): HTMLElement | null {
  const direct = row.closest<HTMLElement>(CHAT_ANSWER_ROW_SELECTOR)
  if (direct !== null) return direct
  const tail = row.closest<HTMLElement>(TURN_TAIL_SELECTOR)
  const turn = tail?.getAttribute(CHAT_TURN_ATTRIBUTE)
  const flow = tail?.closest(CHAT_FLOW_SELECTOR) ?? conversationColumn()
  if (!turn || !flow) return null
  return flow.querySelector<HTMLElement>(`${CHAT_ANSWER_ROW_SELECTOR}[${CHAT_TURN_ATTRIBUTE}="${CSS.escape(turn)}"]`)
}

/** The user prompt that opened the turn an answer row belongs to. */
export function answerPromptOf(ctx: HostContext, row: Element): ReaderMessage | null {
  const answer = answerRowOf(row)
  if (answer === null) return null
  const turn = answer.getAttribute(CHAT_TURN_ATTRIBUTE)
  const flow = answer.closest(CHAT_FLOW_SELECTOR) ?? conversationColumn()
  if (turn === null || flow === null) return null
  const prompt = flow.querySelector(`[${FLOW_KIND_ATTRIBUTE}="${USER_ROW_KIND}"][${CHAT_TURN_ATTRIBUTE}="${CSS.escape(turn)}"]`)
  return prompt === null ? null : readerMessageOf(ctx, prompt)
}

/**
 * 把 `text` 放进新会话的输入框并等它真的落到那里；`send` 为真时接着用宿主的
 * 提交动作发出去（与编辑器里按 Enter 同一个入口）。
 *
 * 分岔刚返回时会话可能还没绑定到页面，读不到它的输入框；这里按固定间隔再看，
 * 到上限还没有就抛出 —— 分岔已经把消息切掉了，读者的文字不能悄悄不见。
 */
async function seedDraft(ctx: HostContext, sessionId: string, text: string, send: boolean): Promise<void> {
  const deadline = Date.now() + DRAFT_SEED_WAIT_MS
  for (;;) {
    const binding = hostSessions(ctx)?.binding(sessionId)
    const conversation = binding === undefined || binding === null ? null : hostConversation(binding.ctx)
    if (binding !== undefined && binding !== null && conversation !== null) {
      const input = conversation.input.for(binding.ctx)
      input.setDraft(text)
      if (send) {
        if (typeof input.actions?.submit !== 'function') throw new Error('message-actions: the host composer offers no submit action')
        input.actions.submit()
      } else {
        input.focus()
      }
      return
    }
    if (Date.now() >= deadline) throw new Error(`message-actions: the forked session ${sessionId} never bound its composer`)
    await new Promise<void>((resolve) => { setTimeout(resolve, DRAFT_SEED_POLL_MS) })
  }
}

/**
 * 在消息前一个事件处分岔，打开新会话，把 `text` 放进它的输入框；`send` 为真
 * 时直接发出，读者看到的就是这条消息在新会话里重发了一次。
 *
 * 新会话的标题接着原会话（`increaseTitle`），与宿主自己的分支按钮一致。
 */
export async function rewindTo(ctx: HostContext, message: ReaderMessage, text: string, send: boolean): Promise<void> {
  if (message.seq <= 0) throw new Error('message-actions: no event precedes the message to fork at')
  const sessions = hostSessions(ctx)
  if (sessions === null || typeof sessions.fork !== 'function') throw new Error('message-actions: the host sessions service offers no fork')
  const childId = await sessions.fork({ sessionId: message.sessionId, atSeq: message.seq - 1, increaseTitle: true })
  const workspace = hostUiWorkspace(ctx) as HostUiWorkspaceService | null
  if (workspace === null || typeof workspace.openSession !== 'function') throw new Error('message-actions: host uiWorkspace.openSession is unavailable')
  workspace.openSession(childId)
  await seedDraft(ctx, childId, text, send)
}
