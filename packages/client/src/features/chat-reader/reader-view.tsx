import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import type {} from '@deepseek-ai/dsh-agent/types'
import type { PendingSubmission } from '@deepseek-ai/dsh-api-session-controller/client'
import type { ChatConversationViewNode, ChatViewInjected } from '@deepseek-ai/dsh-client-ui-chat/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-session/client'
import type { InjectFace, PropsLocale, PropsRenderSlots, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { MarkdownLabels } from '@deepseek-ai/dsh-client-ui-primitives'
import { readerCopy } from '../../core/i18n'
import { BlockBoundary } from './blocks'
import type { BlockContext } from './blocks'
import { officialImages } from './official-content'
import type { Official } from './official-content'
import type { OfficialSeat } from './official-slots'
import { usePinnedSelection } from './motion'
import { groupNodes } from './projection'
import { useReaderFollow } from './reader-follow'
import { UserBubble } from './reader-nodes'
import { refreshStepDisplay } from '../../core/step-display'
import { useCopyRevision, useMotion } from './reader-state'
import { StreamMotionContext } from './streaming'
import { TurnGroup } from './turn-group'
import { TurnStatus } from './turn-status'
import { handsBackToModel, waitingAnchor } from './waiting-clock'

/**
 * The reading view (D57), ported from dsh-better-display's Reader (MIT): the
 * session's turns, the reader's messages still on their way, the one live
 * status line under them, and the jump back to the end.
 */

/** What the view takes from the host's own Chat registration, so files, forks and history behave as in Chat. */
export type ReaderInjected = Pick<ChatViewInjected, 'openFile' | 'openSkill' | 'loadOlder' | 'loadImage' | 'forkAt' | 'fileMentions'> & {
  /** The host's home directory, for the paths the tool views shorten. */
  home: () => string | undefined
}

export type ReaderViewProps = PropsRuntime<'conversation.view'> & PropsRenderSlots<OfficialSeat> & PropsLocale<'chat'> & InjectFace<ReaderInjected>

/** The rpc ids of the reader's messages the session already holds as durable nodes. */
function observedInputIds(order: readonly string[], get: (key: string) => ChatConversationViewNode | undefined): Set<string> {
  const ids = new Set<string>()
  for (const key of order) {
    const node = get(key)
    if (node === undefined || (node.kind !== 'user' && node.kind !== 'steering')) continue
    const source = (node.data as { source?: { kind?: unknown, rpcId?: unknown } }).source
    if (source?.kind === 'user' && typeof source.rpcId === 'string') ids.add(source.rpcId)
  }
  return ids
}

/** An inbox entry the reader sent while the turn ran, as the agent's inbox records it. */
interface InboxInput {
  source?: { kind?: unknown, rpcId?: unknown }
  content?: readonly { type?: unknown, text?: unknown }[]
}

type PendingInput = { kind: 'submission', submission: PendingSubmission } | { kind: 'inbox', item: InboxInput, index: number }

/**
 * The reader's messages not yet in the session: steering the inbox holds, in
 * its order, each matched to its local echo, then the echoes the inbox has not
 * reached. A queued echo belongs to the composer's queue, not the conversation.
 */
function pendingInputs(inbox: readonly InboxInput[], submissions: readonly PendingSubmission[], observed: ReadonlySet<string>): PendingInput[] {
  const shown = submissions.filter(submission => submission.placement !== 'queued')
  const local = new Map(shown.filter(submission => !observed.has(submission.requestId)).map(submission => [submission.requestId as string, submission]))
  const localIds = new Set<string>(shown.map(submission => submission.requestId))
  const rows: PendingInput[] = []
  inbox.forEach((item, index) => {
    const rpcId = typeof item.source?.rpcId === 'string' ? item.source.rpcId : undefined
    if (rpcId === undefined) {
      rows.push({ kind: 'inbox', item, index })
      return
    }
    const submission = local.get(rpcId)
    if (submission !== undefined) {
      local.delete(rpcId)
      rows.push({ kind: 'submission', submission })
    } else if (!localIds.has(rpcId)) rows.push({ kind: 'inbox', item, index })
  })
  for (const submission of local.values()) rows.push({ kind: 'submission', submission })
  return rows
}

function PendingRow({ input, context }: { input: PendingInput, context: BlockContext }) {
  if (input.kind === 'inbox') {
    const text = (input.item.content ?? []).flatMap(block => block.type === 'text' && typeof block.text === 'string' ? [block.text] : []).join('')
    return <UserBubble blocks={text === '' ? [] : [{ kind: 'text', text }]} time={undefined} steering={false} context={context}
      attributes={{ 'data-pending-steering': '', 'data-submission-echo': '' }} />
  }
  const { submission } = input
  const images = submission.attachments.flatMap(attachment => attachment.type === 'image' ? [attachment.value] : [])
  return <div className="dsh-claude-reader-pending" data-submission-echo="" data-dsh-claude-reader-attachments={submission.attachments.length}>
    {images.length > 0 && <div className="dsh-claude-reader-user-images">
      {images.map((image, index) => <img key={index} className="dsh-claude-reader-pending-image" src={image.previewUrl} alt={image.name ?? readerCopy('sentImage', 'Sent image')}
        style={{ aspectRatio: `${image.width ?? 4} / ${image.height ?? 3}` }} />)}
    </div>}
    <UserBubble blocks={submission.text === '' ? [] : [{ kind: 'text', text: submission.text }]} time={submission.time} steering={false} context={context} attributes={{}} />
  </div>
}

export function ReaderView(props: ReaderViewProps) {
  const { useChat, useSession, useSessionStatus, useProjection, useSessions, sessionId, t } = props
  const root = useRef<HTMLDivElement>(null)
  const statusButton = useRef<HTMLButtonElement>(null)
  const [activatedAt] = useState(() => Date.now())
  const order = useChat(snapshot => snapshot.order)
  const nodes = useChat(snapshot => snapshot.nodes)
  const timeline = useChat(snapshot => snapshot.timeline)
  const running = useSession(snapshot => snapshot.running)
  const openError = useSession(snapshot => snapshot.openError)
  const loading = useSession(snapshot => snapshot.openState === 'loading')
  const hasMore = useSession(snapshot => snapshot.hasMore)
  const loadingOlder = useSession(snapshot => snapshot.loadingOlder)
  const submissions = useSession(snapshot => snapshot.pendingSubmissions)
  const interaction = useSessionStatus(status => status.get(sessionId)?.pendingInteraction)
  const inbox = useProjection('inbox', value => value?.['next-step'])
  const cwd = useSessions(state => state.byId[sessionId]?.cwd)
  const motion = useMotion()
  // The view's own lines (history, waiting, attention) follow copy changes too.
  useCopyRevision()
  const get = (key: string) => nodes.get(key)
  const groups = useMemo(() => groupNodes(order, key => nodes.get(key)), [order, nodes, timeline])
  const observed = useMemo(() => observedInputIds(order, key => nodes.get(key)), [order, nodes])
  // The inbox carries the agent's wire form (JSON); only the reader's own messages are shown.
  const steering = useMemo(() => (inbox ?? []).flatMap(item => typeof item === 'object' && item !== null && !Array.isArray(item)
    && (item as InboxInput).source?.kind === 'user' ? [item as InboxInput] : []), [inbox])
  const inputs = useMemo(() => pendingInputs(steering, submissions, observed), [steering, submissions, observed])
  const anchor = waitingAnchor(order, get, submissions)
  // The live status line says either that the model owes the move or what the running turn is doing.
  const awaitingModel = useMemo(() => {
    // An idle send's local echo: the reader sees the wait from the first millisecond.
    if (!running && submissions.length > 0) return true
    const lastKey = order.at(-1)
    const last = lastKey === undefined ? undefined : nodes.get(lastKey)
    if (last === undefined) return false
    // A step that already carries a block has answered; an empty running one is the request in flight.
    if (last.kind === 'assistant-step') {
      const data = last.data as { status: string, blocks: readonly unknown[] }
      return data.blocks.length === 0 && data.status === 'running'
    }
    // While a tool runs, the tool is the one working.
    if (!handsBackToModel(last)) return false
    const group = groups.at(-1)
    return group?.turn === null || group?.turn === undefined || timeline.turns.get(group.turn)?.status !== 'closed'
  }, [running, submissions, order, nodes, groups, timeline])
  const pinnedKeys = usePinnedSelection(root, '[data-dsh-claude-reader-key]')
  const selectedProcessKeys = usePinnedSelection(root, '[data-dsh-claude-reader-process]')
  const follow = useReaderFollow(root, motion)
  // A turn opening is the outside edge of the reader's turns: the host's
  // work-details setting is read again there, the moment a change would show.
  const turnCount = groups.length
  useLayoutEffect(() => {
    refreshStepDisplay()
  }, [turnCount, running])
  const streamMotion = useMemo(() => ({ enabled: motion, activatedAt }), [motion, activatedAt])
  const labels = useMemo((): MarkdownLabels => ({
    code: {
      copyLabel: t('copy'),
      copiedLabel: t('copied'),
      toolbarLabels: { codeLabel: t('codeBlock.title'), wrapLabel: t('codeBlock.wrap'), unwrapLabel: t('codeBlock.unwrap') },
    },
    footnotes: t('markdown.footnotes'),
  }), [t])
  const home = props.home()
  const official = useMemo((): Official => ({
    // The seats are a runtime composition (official-slots.ts), so their render is type-erased here.
    renderSlot: props.renderSlot as unknown as Official['renderSlot'],
    loadImage: props.loadImage,
    fileMentions: props.fileMentions,
    previewFile: path => void props.openFile(path),
    openFile: (path, options) => void props.openFile(path, options),
    openSkill: props.openSkill,
    inspectCall: props.inspectCall,
    forkAt: props.forkAt,
    home,
    cwd,
  }), [props.renderSlot, props.loadImage, props.fileMentions, props.openFile, props.openSkill, props.inspectCall, props.forkAt, home, cwd])
  const context = useMemo((): BlockContext => ({ labels, renderImages: officialImages(official) }), [labels, official])

  // A message the reader just sent brings the conversation back to its end.
  const lastKey = order.at(-1)
  const lastKind = lastKey === undefined ? undefined : nodes.get(lastKey)?.kind
  const lastSubmission = submissions.at(-1)?.requestId
  const seen = useRef({ lastKey, lastSubmission })
  useLayoutEffect(() => {
    const appendedUser = lastKey !== seen.current.lastKey && (lastKind === 'user' || lastKind === 'steering')
    const appendedSubmission = lastSubmission !== undefined && lastSubmission !== seen.current.lastSubmission
    seen.current = { lastKey, lastSubmission }
    if (appendedUser || appendedSubmission) follow.jump()
  }, [lastKey, lastKind, lastSubmission, follow.jump])

  return <StreamMotionContext.Provider value={streamMotion}>
    <div ref={root} className="dsh-claude-reader" data-dsh-claude-reader-motion={motion ? 'on' : 'off'}>
      {/* The host's ChatView marks its column so; a scrollport without it reads as inspect-only and hides the composer. */}
      <div className="dsh-claude-reader-column" data-chat-flow="">
        {hasMore && <button type="button" className="dsh-claude-reader-history" disabled={loadingOlder} onClick={() => props.loadOlder()}>
          {loadingOlder ? readerCopy('historyLoading', 'Loading earlier messages') : readerCopy('historyLoad', 'Load earlier messages')}
        </button>}
        {openError !== null && <div className="dsh-claude-reader-error" role="alert">{readerCopy('openError', 'This session cannot be read right now: {message}', { message: openError.message })}</div>}
        {loading && groups.length === 0 && <p className="dsh-claude-reader-empty" role="status">{readerCopy('opening', 'Opening the session…')}</p>}
        {groups.map(group => <BlockBoundary key={group.key}>
          <TurnGroup group={group} sessionId={sessionId} useChat={useChat} useSessionStatus={useSessionStatus} running={running}
            statusButton={statusButton} motion={motion} pinnedKeys={pinnedKeys} selectedProcessKeys={selectedProcessKeys}
            official={official} context={context} />
        </BlockBoundary>)}
        {inputs.map(input => <PendingRow key={input.kind === 'submission' ? input.submission.requestId : `inbox:${input.index}`} input={input} context={context} />)}
        <BlockBoundary>
          <TurnStatus group={groups.at(-1)} sessionId={sessionId} useChat={useChat} awaiting={awaitingModel} anchor={anchor} waitingLabel={t('chat.deepDiving')}
            waitingForYou={interaction !== undefined} motion={motion} buttonRef={statusButton} />
        </BlockBoundary>
        {interaction !== undefined && <div className="dsh-claude-reader-attention" role="alert">
          <strong>{interaction.kind === 'question' ? readerCopy('attentionQuestion', 'A question needs your answer') : readerCopy('attentionApproval', 'An action needs your approval')}</strong>
          <span>{readerCopy('attentionWhere', 'Answer it in the panel below; this notice does not fold into the process.')}</span>
        </div>}
        {follow.detached && <div className="dsh-claude-reader-jump-dock">
          <button type="button" className="dsh-claude-reader-jump" aria-label={readerCopy('jumpToEnd', 'Back to the latest')} title={readerCopy('jumpToEnd', 'Back to the latest')} onClick={follow.jump}>
            <svg viewBox="0 0 14 14" width="14" height="14" aria-hidden="true"><path d="M3 5.5 7 9.5 11 5.5" /></svg>
          </button>
        </div>}
      </div>
    </div>
  </StreamMotionContext.Provider>
}
