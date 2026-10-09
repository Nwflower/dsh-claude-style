import { memo, useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode, RefObject } from 'react'
import type { AssistantChatData, ChatConversationViewNode, ChatSnapshot, ToolChatData, TurnProcessChatData, TurnTailChatData, TurnTailOwnerProps, UseChat } from '@deepseek-ai/dsh-client-ui-chat/client'
import type { UseSessionStatus } from '@deepseek-ai/dsh-client-ui-session/client'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import { readerCopy } from '../../core/i18n'
import { BlockBoundary } from './blocks'
import type { BlockContext } from './blocks'
import { ChoreographedFlow, useFlowChat } from './fold-flow'
import type { PresentationFrame } from './fold-flow'
import { FoldSummary } from './fold-summary'
import { foldSummary, presentLiveTurn, readerFlow, segmentLiveTurn } from './live-turn'
import type { LiveStep, ReaderFlowEntry } from './live-turn'
import { Disclosure, ProcessFragment, StatusText } from './motion'
import { OfficialTail } from './official-content'
import type { Official } from './official-content'
import { boundaryOf, forkAnchorSeq, hasProcessContent, isEarlierNarration, processChoiceKey, processExpanded, terminalLabel } from './projection'
import type { ReaderGroup, TurnBoundary } from './projection'
import { AnswerActions, AssistantNode, MainNode, ProcessNode, chatRowProps } from './reader-nodes'
import { useChoice, useCopyRevision, useStepDisplay } from './reader-state'
import { preparingLabel } from './tool-activity'
import { ToolMedia, ToolRow } from './tool-row'

/**
 * One turn of the reading view (D57), ported from dsh-better-display's
 * TurnGroup (MIT): the reader's message, the status line that opens and closes
 * the turn's process, the live fold over the steps, and what the host adds
 * under a finished turn.
 */

/** Sub-agents the turn dispatched, as the host's own process row counts them. */
function subagentCount(snapshot: ChatSnapshot, keys: readonly string[]): number {
  for (const key of keys) {
    const node = snapshot.nodes.get(key)
    if (node?.kind !== 'turn-process') continue
    const count = (node.data as TurnProcessChatData).subagentCount
    if (count > 0) return count
  }
  return 0
}

function elapsedLabel(ms: number): string {
  const seconds = Math.max(0, Math.round(ms / 1000))
  return seconds < 60
    ? readerCopy('tookSeconds', 'Took {seconds}s', { seconds })
    : readerCopy('tookMinutes', 'Took {minutes}m {seconds}s', { minutes: Math.floor(seconds / 60), seconds: seconds % 60 })
}

/** What the turn is doing now, or how long it took once it completed. */
export function groupStatus(snapshot: ChatSnapshot, group: ReaderGroup, waiting: boolean): string {
  const turn = group.turn === null ? undefined : snapshot.timeline.turns.get(group.turn)
  if (turn?.status === 'closed') {
    if (turn.end?.data.reason.kind !== 'completed' || turn.start === undefined) return readerCopy('statusProcess', 'Process')
    return elapsedLabel(turn.end.time - turn.start.time)
  }
  if (turn?.status !== 'open') return readerCopy('statusProcess', 'Process')
  if (waiting) return readerCopy('statusWaiting', 'Waiting for you')
  const current = turn.steps.at(-1)?.data.get('assistant-step')
  const last = current?.blocks.at(-1)
  if (current?.status === 'running' && last?.kind === 'tool-call') {
    const spawned = subagentCount(snapshot, group.keys)
    return spawned > 0 ? readerCopy('statusSubagents', '{label} · {count} sub-agents', { label: preparingLabel(last.name), count: spawned }) : preparingLabel(last.name)
  }
  for (let index = group.keys.length - 1; index >= 0; index -= 1) {
    const node = snapshot.nodes.get(group.keys[index]!)
    if (node === undefined) continue
    if (node.kind === 'tool-call' && !('kind' in (node.data as ToolChatData).root)) return readerCopy('statusTool', 'Using a tool')
    if (node.kind === 'assistant-step') {
      const data = node.data as AssistantChatData
      if (data.status !== 'running') continue
      const tail = data.blocks.at(-1)?.kind
      return tail === 'reasoning' ? readerCopy('statusThinking', 'Thinking') : tail === 'text' ? readerCopy('statusWriting', 'Writing') : readerCopy('statusPreparing', 'Preparing a reply')
    }
  }
  return readerCopy('statusWorking', 'Working')
}

type NodeReader = (key: string) => ChatConversationViewNode | undefined

function flowHasProcess(flow: readonly ReaderFlowEntry[], get: NodeReader, boundary: TurnBoundary): boolean {
  return flow.some(entry => entry.kind === 'tool' || hasProcessContent(get(entry.nodeKey), boundary))
}

/** Whether a group holds process beside its answer and opening message, which a status line opens and closes. */
export function turnHasProcess(group: ReaderGroup, get: NodeReader, boundary: TurnBoundary): boolean {
  const main = get(group.keys[0]!)?.kind === 'user' ? { ...group, keys: group.keys.slice(1) } : group
  return flowHasProcess(readerFlow(main, get), get, boundary)
}

/** The id of a group's process flow, which its status line controls. */
export function flowIdOf(groupKey: string): string {
  return `dsh-claude-reader-flow-${encodeURIComponent(groupKey)}`
}

function GroupStatus({ group, useChat, waiting, motion }: { group: ReaderGroup, useChat: UseChat, waiting: boolean, motion: boolean }) {
  const text = useChat(snapshot => groupStatus(snapshot, group, waiting))
  const busy = useChat(snapshot => group.turn !== null && snapshot.timeline.turns.get(group.turn)?.status === 'open' && !waiting)
  return <StatusText text={text} motion={motion} shimmer={busy} />
}

/**
 * The status line, sticky at the top of its turn. It publishes its real height
 * on the turn, so a wrapped label never runs into the rows under it.
 */
function StatusLane({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const element = ref.current
    const turn = element?.closest<HTMLElement>('.dsh-claude-reader-turn')
    if (element === null || element === undefined || turn === null || turn === undefined) return
    const update = () => turn.style.setProperty('--dsh-claude-reader-status-height', `${element.getBoundingClientRect().height}px`)
    update()
    const observer = new ResizeObserver(update)
    observer.observe(element)
    return () => {
      observer.disconnect()
      turn.style.removeProperty('--dsh-claude-reader-status-height')
    }
  }, [])
  return <div ref={ref} className="dsh-claude-reader-status-lane">{children}</div>
}

/** The steps a closed turn's summary counts: everything but the reader's messages and the final answer. */
function closedProcessSteps(steps: readonly LiveStep[], get: (key: string) => ChatConversationViewNode | undefined, boundary: TurnBoundary): readonly LiveStep[] {
  return steps.filter(step => {
    if (step.kind === 'user') return false
    if (step.kind !== 'body') return true
    const node = get(step.nodeKey)
    if (node?.kind !== 'assistant-step') return false
    const data = node.data as AssistantChatData
    return isEarlierNarration(data, boundary) || data.blocks.some(block => block.kind === 'tool-call') || (boundary.latestStep > 0 && data.step < boundary.latestStep)
  })
}

export const TurnGroup = memo(function TurnGroup({ group, sessionId, useChat, useSessionStatus, running, statusButton, motion, pinnedKeys, selectedProcessKeys, official, context }: {
  group: ReaderGroup
  sessionId: SessionId
  useChat: UseChat
  useSessionStatus: UseSessionStatus
  running: boolean
  /** The conversation's live status line (turn-status.tsx), which opens and closes a running turn's process. */
  statusButton: RefObject<HTMLButtonElement>
  motion: boolean
  pinnedKeys: readonly string[]
  selectedProcessKeys: readonly string[]
  official: Official
  context: BlockContext
}) {
  // The fold figures are text: a copy change computes them again.
  const copy = useCopyRevision()
  // The host's work-details mode shapes this turn's process (core/step-display.ts).
  const mode = useStepDisplay()
  const verbose = mode === 'verbose'
  const snapshot = useChat(value => value)
  const nodes = snapshot.nodes
  const get = useCallback((key: string) => nodes.get(key), [nodes])
  const turn = group.turn === null ? undefined : snapshot.timeline.turns.get(group.turn)
  const interaction = useSessionStatus(status => status.get(sessionId)?.pendingInteraction)
  const boundary = useMemo(() => boundaryOf(turn), [turn])
  const [choice, setChoice] = useChoice(sessionId, processChoiceKey(group.key, boundary))
  const flowId = flowIdOf(group.key)
  const laneButton = useRef<HTMLButtonElement>(null)
  // A running turn opens and closes from the live status line; any other from its own line.
  const processButton = boundary.status === 'open' ? statusButton : laneButton
  const pinProcess = useCallback(() => setChoice(true), [setChoice])
  const startsWithUser = get(group.keys[0]!)?.kind === 'user'
  const mainGroup = useMemo(() => startsWithUser ? { ...group, keys: group.keys.slice(1) } : group, [group, startsWithUser])
  const flow = useMemo(() => readerFlow(mainGroup, get), [mainGroup, get])
  const steps = useMemo(() => segmentLiveTurn(flow, get), [flow, get])
  const liveItems = useMemo(() => presentLiveTurn(steps, boundary, false, mode), [steps, boundary, mode, copy])
  const hasProcess = flowHasProcess(flow, get, boundary)
  // Only a live text selection holds the fold; a click, a focus or a scroll does not.
  const holdingSelection = selectedProcessKeys.some(key => flow.some(entry => entry.key === key)
    || liveItems.some(item => item.kind === 'fold'
      ? item.key === key || item.steps.some(step => step.key === key || ('nodeKey' in step && step.nodeKey === key))
      : item.key === key || ('nodeKey' in item.step && item.step.nodeKey === key)))
  const expanded = holdingSelection || processExpanded(choice, boundary)
  const [foldOpen, setFoldOpen] = useState<Readonly<Record<string, boolean>>>({})
  const tail = useMemo(() => {
    for (const key of group.keys) {
      const node = get(key)
      if (node?.kind === 'turn-tail') return { key, data: node.data as TurnTailChatData }
    }
    return undefined
  }, [group.keys, get])
  const tailOwner = useMemo((): TurnTailOwnerProps | undefined => turn !== undefined && tail !== undefined
    ? { turn, seq: tail.data.closing?.finalNode.seq ?? tail.data.seq, openFile: official.previewFile }
    : undefined, [turn, tail, official.previewFile])
  const turnContext = useMemo((): BlockContext => ({ ...context, fileMentions: tailOwner === undefined ? undefined : official.fileMentions(tailOwner) }), [context, tailOwner, official])
  // The fork anchor is the turn's durable closing message, as the host's own
  // turn tail uses; without one the fork would take the whole session.
  const forkSeq = tail?.data.branchUnavailable === true ? undefined : forkAnchorSeq([tail?.data.closing?.finalNode])
  const presentation = useMemo((): PresentationFrame => {
    // The store's readers are live; the frame keeps this turn's nodes as they are now.
    const captured = new Map(group.keys.flatMap(key => {
      const node = nodes.get(key)
      return node === undefined ? [] : [[key, node] as const]
    }))
    return {
      items: holdingSelection ? presentLiveTurn(steps, boundary, true, mode) : liveItems,
      snapshot: { ...snapshot, nodes: { ...nodes, get: (key: string) => captured.get(key), values: () => [...captured.values()] } },
    }
  }, [snapshot, nodes, group, steps, boundary, liveItems, holdingSelection, mode, copy])
  const hasTurnError = flow.some(entry => entry.kind === 'node' && get(entry.nodeKey)?.kind === 'turn-error')
  const terminal = terminalLabel(boundary.reason)
  const stopped = boundary.reason === 'interrupted' || boundary.reason === 'aborted'
  // A stopped turn stays quiet, unless it produced no answer at all and would read as lost.
  const answered = steps.some(step => step.kind === 'body' && step.blocks.some(block => block.kind === 'text' && block.text.trim() !== ''))
  const showTerminal = terminal !== null && !hasTurnError && (!stopped || !answered)
  const node = { useChat: useFlowChat, official, context: turnContext }
  const renderStep = (step: LiveStep, folded: boolean) => {
    const processOpen = folded || expanded
    switch (step.kind) {
      case 'reasoning':
      case 'body':
        return <BlockBoundary>
          <AssistantNode {...node} nodeKey={step.nodeKey} boundary={boundary} partStart={step.start} processOpen={processOpen} folded={folded} verbose={verbose}
            pinned={pinnedKeys.includes(step.nodeKey)} motion={motion} onRead={pinProcess} returnFocusTo={processButton} />
        </BlockBoundary>
      case 'tool':
        return <BlockBoundary>
          <ProcessFragment open={processOpen} motion={motion} onRead={pinProcess} returnFocusTo={processButton} nodeKey={step.key} framed>
            <ToolRow entry={step.entry} turnClosed={boundary.status === 'closed'} motion={motion} onRead={pinProcess} official={official} context={turnContext} />
          </ProcessFragment>
          <ToolMedia block={step.entry.block} context={turnContext} />
        </BlockBoundary>
      case 'user':
        return <BlockBoundary><MainNode {...node} nodeKey={step.nodeKey} /></BlockBoundary>
      case 'other':
        return <>
          <BlockBoundary><ProcessNode useChat={useFlowChat} official={official} nodeKey={step.nodeKey} open={processOpen} motion={motion} onRead={pinProcess} returnFocusTo={processButton} /></BlockBoundary>
          <BlockBoundary><MainNode {...node} nodeKey={step.nodeKey} /></BlockBoundary>
        </>
    }
  }
  const closedSteps = boundary.status === 'closed' && hasProcess ? closedProcessSteps(steps, get, boundary) : []
  return <section className="dsh-claude-reader-turn" data-dsh-claude-reader-turn={boundary.status} data-dsh-claude-reader-result={boundary.reason ?? undefined}
    data-chat-turn={group.turn ?? undefined}>
    {startsWithUser && <BlockBoundary><MainNode useChat={useChat} official={official} context={turnContext} nodeKey={group.keys[0]!} /></BlockBoundary>}
    {hasProcess && boundary.status !== 'open' && <StatusLane>
      <Disclosure open={expanded} onChange={setChoice} controls={flowId} buttonRef={laneButton}
        label={<GroupStatus group={group} useChat={useChat} waiting={interaction !== undefined} motion={motion} />} />
    </StatusLane>}
    {closedSteps.length > 0 && <FoldSummary kind="closed" summary={foldSummary(closedSteps)} steps={closedSteps} open={expanded} onChange={setChoice} motion={false} controls={flowId} />}
    <ChoreographedFlow id={flowId} frame={presentation} motion={motion} enabled={boundary.status === 'open' && !holdingSelection}
      urgent={hasTurnError || interaction !== undefined || !running} open={foldOpen} processOpen={expanded}
      onOpenChange={(key, value) => {
        pinProcess()
        setFoldOpen(current => ({ ...current, [key]: value }))
      }} renderStep={renderStep} />
    {boundary.status === 'closed' && tail !== undefined && <div className="dsh-claude-reader-tail" {...chatRowProps('turn-tail', tail.key)}>
      {tail.data.closing !== null && <AnswerActions blocks={tail.data.closing.blocks.filter(block => block.kind !== 'reasoning' && block.kind !== 'tool-call')}
        onFork={forkSeq === undefined ? undefined : () => official.forkAt(forkSeq)}
        official={official} messageId={tail.data.closing.finalNode.messageId} endedAt={tail.data.closing.finalNode.time} />}
      <BlockBoundary><OfficialTail official={official} owner={tailOwner} /></BlockBoundary>
    </div>}
    {showTerminal && <div className="dsh-claude-reader-notice">{terminal}</div>}
  </section>
})
