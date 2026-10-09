import { memo, useEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'
import type { AssistantBlock } from '@deepseek-ai/dsh-client-ui-conversation/client'
import type { AssistantActionOwnerProps, ChatConversationViewNode, ChatNode, ChatNodeKind, UseChat } from '@deepseek-ai/dsh-client-ui-chat/client'
import { IconBranchOutlineRegular, IconCheckOutlineRegular, IconCopyOutlineRegular, JsonBlock, writeClipboard } from '@deepseek-ai/dsh-client-ui-primitives'
import { activeLocale, readerCopy } from '../../core/i18n'
import { Blocks, contentBlocks, truncatedJsonLabel } from './blocks'
import type { BlockContext } from './blocks'
import { ProcessFragment, RetiringContent } from './motion'
import { OfficialActions, OfficialNode } from './official-content'
import type { Official } from './official-content'
import { PROCESS_RECORDS, assistantSegments, hasVisibleBody, isEarlierNarration } from './projection'
import type { TurnBoundary } from './projection'
import { useCopyRevision } from './reader-state'
import { ReasoningCard, ThoughtLine } from './reasoning-card'
import { ToolMedia } from './tool-row'

/**
 * The reading view's rows for one node (D57), ported from dsh-better-display's
 * Reader nodes (MIT): the reader's own messages, an assistant step's parts and
 * the answer's actions. Every other kind is drawn by the host's own renderer
 * through the mirrored node seat; process records fold with the turn.
 */

function isNode<Kind extends ChatNodeKind>(node: ChatConversationViewNode, kind: Kind): node is ChatNode<Kind> {
  return node.kind === kind
}

/**
 * The host ChatView's row attributes. Features running in every tier (turn
 * navigation, turn status, the mascot, the composer) and other plugins (rewind's
 * anchor) read them, so the reader's rows carry the same ones.
 */
export function chatRowProps(kind: string, key: string): Record<string, string> {
  return {
    'data-chat-anchor-key': key,
    'data-chat-flow-key': key,
    'data-chat-node-key': key,
    'data-chat-flow-kind': kind,
  }
}

/** A message's local time: the clock today, the date before that, the year once it differs. */
function clockText(time: number, now = Date.now()): string {
  const date = new Date(time)
  const today = new Date(now)
  const sameYear = date.getFullYear() === today.getFullYear()
  const sameDay = sameYear && date.getMonth() === today.getMonth() && date.getDate() === today.getDate()
  const clock = { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' } as const
  const options: Intl.DateTimeFormatOptions = sameDay ? clock : sameYear ? { ...clock, month: 'short', day: 'numeric' } : { ...clock, year: 'numeric', month: 'short', day: 'numeric' }
  return new Intl.DateTimeFormat(activeLocale(), options).format(date)
}

function MessageClock({ time }: { time: number }) {
  return <time className="dsh-claude-reader-clock" dateTime={new Date(time).toISOString()}>{clockText(time)}</time>
}

/** The host's copy feedback: one second of the check mark after a write the clipboard accepted. */
const COPIED_MS = 1000

function CopyButton({ text, label }: { text: string, label: string }) {
  const [copied, setCopied] = useState(false)
  const timer = useRef(0)
  useEffect(() => () => window.clearTimeout(timer.current), [])
  const onCopy = () => {
    if (copied) return
    void writeClipboard(text).then(accepted => {
      if (!accepted) return
      setCopied(true)
      timer.current = window.setTimeout(() => setCopied(false), COPIED_MS)
    })
  }
  return <button type="button" className="dsh-claude-reader-icon-button" aria-label={copied ? readerCopy('copied', 'Copied') : label} title={label} onClick={onCopy}>
    {copied ? <IconCheckOutlineRegular size={14} /> : <IconCopyOutlineRegular size={14} />}
  </button>
}

/** The text a message's text blocks carry, as the reader would copy it. */
function plainText(blocks: readonly AssistantBlock[]): string {
  return blocks.flatMap(block => block.kind === 'text' ? [block.text] : []).join('\n\n')
}

/** Under a finished turn, as the host's turn tail: copy the answer, the actions other plugins add, a fork from here, and when it ended. */
export function AnswerActions({ blocks, onFork, official, messageId, endedAt }: {
  blocks: readonly AssistantBlock[]
  onFork: (() => void) | undefined
  official: Official
  messageId: AssistantActionOwnerProps['messageId'] | undefined
  endedAt: number | undefined
}) {
  const text = plainText(blocks)
  return <div className="dsh-claude-reader-answer-actions">
    {text.trim() !== '' && <CopyButton text={text} label={readerCopy('copyAnswer', 'Copy the answer')} />}
    <OfficialActions official={official} messageId={messageId} />
    {onFork !== undefined && <button type="button" className="dsh-claude-reader-icon-button" aria-label={readerCopy('forkHere', 'Branch a new session from here')}
      title={readerCopy('forkHere', 'Branch a new session from here')} onClick={onFork}>
      <IconBranchOutlineRegular size={14} />
    </button>}
    {endedAt !== undefined && <MessageClock time={endedAt} />}
  </div>
}

function UserActions({ text, time }: { text: string, time: number | undefined }) {
  if (text.trim() === '' && time === undefined) return null
  return <div className="dsh-claude-reader-user-actions">
    {time !== undefined && <MessageClock time={time} />}
    {text.trim() !== '' && <CopyButton text={text} label={readerCopy('copyMessage', 'Copy the message')} />}
  </div>
}

/** A message the reader sent, settled or still on its way. */
export function UserBubble({ blocks, time, steering, context, attributes }: {
  blocks: readonly AssistantBlock[]
  time: number | undefined
  steering: boolean
  context: BlockContext
  attributes: Record<string, string>
}) {
  const images = blocks.filter(block => block.kind === 'image')
  const rest = blocks.filter(block => block.kind !== 'image')
  return <div className="dsh-claude-reader-user" {...attributes}>
    {steering && <p className="dsh-claude-reader-meta">{readerCopy('steering', 'Added while the turn ran')}</p>}
    {images.length > 0 && <div className="dsh-claude-reader-user-images"><Blocks blocks={images} source="user" streaming={false} context={context} /></div>}
    {rest.length > 0 && <div className="dsh-claude-reader-user-bubble"><Blocks blocks={rest} source="user" streaming={false} context={context} /></div>}
    <UserActions text={plainText(rest)} time={time} />
  </div>
}

interface NodeProps {
  useChat: UseChat
  nodeKey: string
  context: BlockContext
  official: Official
}

/** A process record, drawn by the host's renderer inside the turn's process. */
export const ProcessNode = memo(function ProcessNode({ useChat, nodeKey, official, open, motion, onRead, returnFocusTo }: Omit<NodeProps, 'context'> & {
  open: boolean
  motion: boolean
  onRead: () => void
  returnFocusTo: RefObject<HTMLElement>
}) {
  // A memoized row: copy changes re-render it (reader-state.ts).
  useCopyRevision()
  const node = useChat(snapshot => snapshot.nodes.get(nodeKey))
  if (node === undefined || node.visibility === 'hidden' || !PROCESS_RECORDS.has(node.kind)) return null
  return <ProcessFragment open={open} motion={motion} onRead={onRead} returnFocusTo={returnFocusTo} nodeKey={nodeKey} framed>
    <OfficialNode official={official} node={node} fallback={<JsonBlock label={readerCopy('rawRecord', 'Raw record')} payload={node.data} truncatedLabel={truncatedJsonLabel} />} />
  </ProcessFragment>
})

/** One part of an assistant step: a thought, process commentary, or the answer. */
export const AssistantNode = memo(function AssistantNode({ useChat, nodeKey, context, boundary, partStart, processOpen, folded, verbose, pinned, motion, onRead, returnFocusTo }: NodeProps & {
  boundary: TurnBoundary
  partStart: number
  processOpen: boolean
  folded: boolean
  /** The host's work-details mode is `verbose`: a thought in a fold shows its whole text. */
  verbose: boolean
  pinned: boolean
  motion: boolean
  onRead: () => void
  returnFocusTo: RefObject<HTMLElement>
}) {
  // A memoized row: copy changes re-render it (reader-state.ts).
  useCopyRevision()
  const node = useChat(snapshot => snapshot.nodes.get(nodeKey))
  if (node === undefined || node.visibility === 'hidden' || !isNode(node, 'assistant-step')) return null
  const data = node.data
  const parts = assistantSegments(data.blocks)
  const index = parts.findIndex(part => part.start === partStart)
  const part = parts[index]
  if (part === undefined) return null
  const last = index === parts.length - 1
  const earlier = isEarlierNarration(data, boundary)
  const processStep = earlier || folded || data.blocks.some(block => block.kind === 'tool-call') || (boundary.latestStep > 0 && data.step < boundary.latestStep)
  const presentation = { startedAt: data.time, interrupted: data.status === 'interrupted', selected: pinned }
  if (part.kind === 'reasoning') {
    // Inside a fold — a live one or a finished turn's summary — a thought is one line,
    // unless the host's work-details mode asks for the whole text.
    if ((folded || boundary.status === 'closed') && !verbose) {
      const text = part.blocks.flatMap(block => block.kind === 'reasoning' ? [block.text] : []).join('\n\n')
      return <ProcessFragment open={processOpen} motion={motion} onRead={onRead} returnFocusTo={returnFocusTo} nodeKey={nodeKey}>
        <ThoughtLine text={text} motion={motion} onRead={onRead} />
      </ProcessFragment>
    }
    return <ProcessFragment open={processOpen} motion={motion} onRead={onRead} returnFocusTo={returnFocusTo} nodeKey={nodeKey} framed>
      <ReasoningCard active={processOpen && boundary.status === 'open' && data.step === boundary.latestStep} motion={motion} selected={pinned} onRead={onRead}>
        <Blocks blocks={part.blocks} streaming={data.status === 'running' && last && data.blocks.at(-1)?.kind === 'reasoning'} {...presentation} context={context} />
      </ReasoningCard>
    </ProcessFragment>
  }
  if (processStep) {
    return <ProcessFragment open={processOpen} motion={motion} onRead={onRead} returnFocusTo={returnFocusTo} nodeKey={nodeKey}>
      <article className="dsh-claude-reader-commentary">
        <Blocks blocks={part.blocks} streaming={data.status === 'running'} {...presentation} context={context} />
      </article>
    </ProcessFragment>
  }
  if (!hasVisibleBody(part.blocks)) return null
  const answer = !earlier && !folded
  return <RetiringContent visible={pinned || processOpen || answer} motion={motion}>
    <article className="dsh-claude-reader-answer" data-dsh-claude-reader-key={nodeKey} data-dsh-claude-reader-answer={data.status}
      {...(last ? chatRowProps('assistant-step', nodeKey) : {})}>
      <Blocks blocks={part.blocks} streaming={data.status === 'running'} {...presentation} context={context} />
      {last && data.status === 'interrupted' && <span className="dsh-claude-reader-stopped">{readerCopy('stopped', 'Stopped')}</span>}
    </article>
  </RetiringContent>
})

/** A node in the turn's main line: the reader's message, a call's media, a notice, or the host's renderer for the rest. */
export const MainNode = memo(function MainNode({ useChat, nodeKey, context, official }: NodeProps) {
  // A memoized row: copy changes re-render it (reader-state.ts).
  useCopyRevision()
  const node = useChat(snapshot => snapshot.nodes.get(nodeKey))
  if (node === undefined || node.visibility === 'hidden') return null
  if (isNode(node, 'user') || isNode(node, 'steering')) {
    return <UserBubble blocks={contentBlocks(node.data.content)} time={node.data.time} steering={node.kind === 'steering'} context={context} attributes={chatRowProps(node.kind, nodeKey)} />
  }
  if (isNode(node, 'tool-call')) return <ToolMedia block={node.data.root} context={context} />
  if (isNode(node, 'model-retry')) {
    return node.data.current.retryState === 'scheduled'
      ? <div className="dsh-claude-reader-notice" role="status">{readerCopy('retryScheduled', 'The model request failed and is waiting to retry; the details stay in the process.')}</div>
      : null
  }
  if (PROCESS_RECORDS.has(node.kind) || node.kind === 'assistant-step' || node.kind === 'turn-tail' || node.kind === 'turn-process') return null
  return <OfficialNode official={official} node={node} fallback={<div className="dsh-claude-reader-unknown">
    <p>{readerCopy('unknownNode', 'This kind of record is not shown here yet: {kind}', { kind: node.kind })}</p>
    <JsonBlock label={readerCopy('rawRecord', 'Raw record')} payload={node.data} truncatedLabel={truncatedJsonLabel} />
  </div>} />
})
