import { Component, memo, useEffect, useLayoutEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import type { AssistantBlock, RenderMessageImages, UserMessageNode } from '@deepseek-ai/dsh-client-ui-conversation/client'
import { JsonBlock, MarkdownText } from '@deepseek-ai/dsh-client-ui-primitives'
import type { MarkdownFileMentions, MarkdownLabels } from '@deepseek-ai/dsh-client-ui-primitives'
import { readerCopy } from '../../core/i18n'
import { useCopyRevision } from './reader-state'
import { useStreamingText } from './streaming'
import { WordFade } from './word-fade'

/**
 * One message's content blocks in the reading view (D57). Body text is the
 * host's own Markdown, paced by the stream buffer and faded word by word over
 * the host's DOM; thinking is the literal text; images go to the host's image
 * gallery; anything else stays inspectable as JSON.
 */

/** What a block needs from the view around it. */
export interface BlockContext {
  labels: MarkdownLabels
  renderImages: RenderMessageImages
  fileMentions?: MarkdownFileMentions | undefined
}

/** A JSON preview's footer once the body passes the character cap. */
export const truncatedJsonLabel = (total: number) => readerCopy('jsonTruncated', 'Truncated ({total} characters in all)', { total })

/**
 * Keeps one block's failure inside that block (D12): the rest of the
 * conversation renders, and the error is reported where it can be read.
 */
export class BlockBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  override state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  override componentDidCatch(error: unknown) {
    reportError(error)
  }

  override render() {
    return this.state.failed
      ? <div className="dsh-claude-reader-notice">{readerCopy('blockFailed', 'This content cannot be shown here; the conversation\'s record is unaffected.')}</div>
      : this.props.children
  }
}

/** A user message's content as assistant-shaped blocks, so one renderer serves both. */
export function contentBlocks(content: UserMessageNode['content']): AssistantBlock[] {
  return content.map((block): AssistantBlock => {
    if (block.type === 'text') return { kind: 'text', text: block.text }
    if (block.type === 'image') return { kind: 'image', attachment: block.attachment }
    return { kind: 'other', block }
  })
}

/** A container whose newly rendered words fade in; the first text it holds is history. */
function FadingText({ fades, className, children }: { fades: boolean, className: string, children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null)
  const fade = useRef<WordFade | null>(null)
  useLayoutEffect(() => {
    if (fade.current === null && root.current !== null) fade.current = new WordFade(root.current)
    fade.current?.observe(fades)
  })
  useEffect(() => () => fade.current?.dispose(), [])
  return <div ref={root} className={className}>{children}</div>
}

interface TextPresentation {
  streaming: boolean
  /** When the step began: text older than the view is history. */
  startedAt?: number | undefined
  interrupted?: boolean | undefined
  /** The reader is selecting inside this text: it settles and holds still. */
  selected?: boolean | undefined
}

function ReadingMarkdown({ text, streaming, startedAt, interrupted = false, selected = false, context }: TextPresentation & { text: string, context: BlockContext }) {
  const presentation = useStreamingText(text, streaming, { startedAt, interrupted, selected })
  return <FadingText fades={presentation.fades} className="dsh-claude-reader-text">
    <MarkdownText text={presentation.text} streaming={streaming || presentation.pending} labels={context.labels} fileMentions={context.fileMentions} />
  </FadingText>
}

function ReadingThought({ text, streaming, startedAt, interrupted = false, selected = false }: TextPresentation & { text: string }) {
  const presentation = useStreamingText(text, streaming, { startedAt, interrupted, selected })
  return <FadingText fades={presentation.fades} className="dsh-claude-reader-text dsh-claude-reader-thought-text">{presentation.text}</FadingText>
}

/** One block's view. A user's or a tool's text was never streamed: it renders as it is. */
function renderBlock(block: AssistantBlock, source: 'assistant' | 'user' | 'tool', presentation: TextPresentation, context: BlockContext): ReactNode {
  switch (block.kind) {
    case 'text':
      return source === 'assistant'
        ? <ReadingMarkdown text={block.text} {...presentation} context={context} />
        : <MarkdownText text={block.text} labels={context.labels} fileMentions={context.fileMentions} />
    case 'reasoning':
      return <ReadingThought text={block.text} {...presentation} />
    case 'image':
      return context.renderImages({ images: [{ attachment: block.attachment }], align: source === 'user' ? 'end' : 'start' })
    case 'tool-call':
      return <JsonBlock label={readerCopy('toolArguments', 'Tool arguments · {name}', { name: block.name })} payload={block.argsRaw} truncatedLabel={truncatedJsonLabel} />
    case 'other':
      return <div className="dsh-claude-reader-unknown">
        <p>{readerCopy('unknownBlock', 'This kind of content is not shown here yet; it is kept as recorded.')}</p>
        <JsonBlock label={readerCopy('rawContent', 'Raw content')} payload={block.block} truncatedLabel={truncatedJsonLabel} />
      </div>
  }
}

export const Blocks = memo(function Blocks({ blocks, source = 'assistant', context, ...presentation }: TextPresentation & {
  blocks: readonly AssistantBlock[]
  source?: 'assistant' | 'user' | 'tool'
  context: BlockContext
}) {
  // A memoized row: copy changes re-render it (reader-state.ts).
  useCopyRevision()
  return <div className="dsh-claude-reader-blocks">
    {blocks.map((block, index) => <BlockBoundary key={block.kind === 'image' ? `image:${block.attachment.attachmentId}:${index}` : `${index}:${block.kind}`}>
      {renderBlock(block, source, presentation, context)}
    </BlockBoundary>)}
  </div>
})
