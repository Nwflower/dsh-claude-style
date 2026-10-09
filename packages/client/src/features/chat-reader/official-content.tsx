import { useCallback, useState } from 'react'
import type { ReactNode } from 'react'
import { createSnapshotStore } from '@deepseek-ai/dsh-client-store'
import type { AssistantActionOwnerProps, ChatConversationViewNode, ChatNodeOwnerProps, OpenFileOptions, TurnTailOwnerProps, UseDisclosure } from '@deepseek-ai/dsh-client-ui-chat/client'
import type { MessageImageLoader, RenderMessageImages, ToolCallBlock } from '@deepseek-ai/dsh-client-ui-conversation/client'
import type { MarkdownFileMentions } from '@deepseek-ai/dsh-client-ui-primitives'
import { OFFICIAL_SEATS } from './official-slots'

/**
 * The host's own controls in the reading view (D57): composed through the
 * mirrored seats (official-slots.ts), never reimplemented. Each component only
 * hands the host's renderer the owner props it expects.
 */

/** Renders one seat; type-erased because the seats are a runtime composition. */
type RenderSeat = (key: string, owner: object, options?: object) => ReactNode

/** What the official controls need from the view. */
export interface Official {
  renderSlot: RenderSeat
  loadImage: MessageImageLoader
  fileMentions: (owner: TurnTailOwnerProps) => MarkdownFileMentions | undefined
  previewFile: (path: string) => void
  openFile: (path: string, options?: OpenFileOptions) => void
  openSkill: ChatNodeOwnerProps['openSkill']
  inspectCall: ChatNodeOwnerProps['inspectCall']
  forkAt: (seq: number) => void
  home: string | undefined
  cwd: string | undefined
}

/** The host's image gallery for one group of images. */
export function officialImages(official: Official): RenderMessageImages {
  return owner => official.renderSlot(OFFICIAL_SEATS.images, { ...owner, loadImage: official.loadImage })
}

/** Actions other plugins add to a finished answer (the host's feedback among them). */
export function OfficialActions({ official, messageId }: { official: Official, messageId: AssistantActionOwnerProps['messageId'] | undefined }) {
  if (messageId === undefined) return null
  return <span className="dsh-claude-reader-official-actions">{official.renderSlot(OFFICIAL_SEATS.actions, { messageId })}</span>
}

/** Each tool view keeps its own disclosure through this stable hook. */
const useToolDisclosure: UseDisclosure = () => {
  const [expanded, setExpanded] = useState(false)
  const toggle = useCallback(() => setExpanded(previous => !previous), [])
  return { expanded, setExpanded, toggle }
}

/** The host's own detail view of one call, keyed by its tool name; `fallback` when no view claims the tool. */
export function OfficialTool({ official, block, toolName, fallback }: { official: Official, block: ToolCallBlock, toolName: string, fallback: ReactNode }) {
  const inspectCall = official.inspectCall
  const owner = {
    callId: block.callId,
    toolName,
    phase: 'kind' in block ? 'result' : block.phase,
    block,
    cwd: official.cwd,
    home: official.home,
    openFile: official.openFile,
    loadImage: official.loadImage,
    useDisclosure: useToolDisclosure,
    inspect: inspectCall === undefined ? undefined : () => inspectCall(block.callId),
  }
  return <div className="dsh-claude-reader-official-tool">
    {official.renderSlot(OFFICIAL_SEATS.tools, owner, { entryKey: toolName, hookContext: { callId: block.callId, assistant: undefined }, fallback })}
  </div>
}

/** A node kind the view does not present itself, rendered by the host's own renderer for it. */
export function OfficialNode({ official, node, fallback }: { official: Official, node: ChatConversationViewNode, fallback: ReactNode }) {
  const [disclosureReset] = useState(() => createSnapshotStore(0))
  const owner: ChatNodeOwnerProps = {
    cwd: official.cwd,
    openFile: official.openFile,
    openSkill: official.openSkill,
    forkAt: official.forkAt,
    inspectCall: official.inspectCall,
    loadImage: official.loadImage,
    renderMessageImages: officialImages(official),
    fileMentions: official.fileMentions,
  }
  const turn = node.location.kind === 'turn' || node.location.kind === 'step' ? node.location.turn : undefined
  return <div className="dsh-claude-reader-official-node">
    {official.renderSlot(OFFICIAL_SEATS.nodes, { ...owner, node }, { entryKey: node.kind, hookContext: { turnData: turn?.data, disclosureReset }, fallback })}
  </div>
}

/** What other plugins add under a finished turn: produced files, presented artifacts. */
export function OfficialTail({ official, owner }: { official: Official, owner: TurnTailOwnerProps | undefined }) {
  if (owner === undefined) return null
  return <div className="dsh-claude-reader-official-tail">{official.renderSlot(OFFICIAL_SEATS.tail, { ...owner, openFile: official.previewFile })}</div>
}
