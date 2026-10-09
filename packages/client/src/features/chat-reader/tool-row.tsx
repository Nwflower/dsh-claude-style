import { memo, useEffect, useId, useMemo, useRef, useState } from 'react'
import type { ToolCallBlock } from '@deepseek-ai/dsh-client-ui-conversation/client'
import { DisclosureRow, IconApiOutlineRegular, IconBrowseOutlineRegular, IconCodeOutlineRegular, IconEditOutlineRegular, IconSearchOutlineRegular, IconSkillOutlineRegular, IconSparkleRegular, JsonBlock, diffTotals } from '@deepseek-ai/dsh-client-ui-primitives'
import { readerCopy } from '../../core/i18n'
import { Blocks, contentBlocks, truncatedJsonLabel } from './blocks'
import type { BlockContext } from './blocks'
import { ProcessFragment } from './motion'
import { useCopyRevision } from './reader-state'
import { OfficialTool } from './official-content'
import type { Official } from './official-content'
import { activityPhase, activitySummary, argText, callArgs, callDiffHunks, callStartTime, executionFacts, toolName } from './tool-activity'
import type { ToolActivityEntry, ToolCategory, ToolPhase } from './tool-activity'

/**
 * One tool call in the reading view (D57), after dsh-better-display's
 * ToolActivity (MIT): a compact row naming what the call does, how long a slow
 * one has been running, the lines it changed and its state; opened, the host's
 * own tool view, the call's input and the raw record. Nested calls hang under
 * their parent.
 */

const ICONS = {
  write: IconEditOutlineRegular,
  read: IconBrowseOutlineRegular,
  terminal: IconApiOutlineRegular,
  search: IconSearchOutlineRegular,
  web: IconSearchOutlineRegular,
  code: IconCodeOutlineRegular,
  other: IconSparkleRegular,
} satisfies Record<ToolCategory, unknown>

/** The host's own row titles, which it keeps as design literals. */
function rowTitle(name: string, category: ToolCategory): string {
  if (name === 'skill') return 'Skill'
  if (name === 'pwsh') return 'Pwsh'
  switch (category) {
    case 'write': return name === 'write' ? 'Write' : 'Edit'
    case 'read': return 'Read'
    case 'terminal': return 'Bash'
    case 'search': return 'Search'
    case 'web': return name === 'web_fetch' ? 'Read' : 'Search'
    case 'code': return 'Code'
    case 'other': return name === '' ? readerCopy('toolUnnamed', 'Tool call') : name
  }
}

/** A call past this reads as slow: its time stays on the row after it returns. */
const SLOW_TOOL_MS = 10_000
/** Nesting deeper than this is left to the host's own view. */
const MAX_DEPTH = 6
const number = new Intl.NumberFormat()

function phaseLabel(phase: ToolPhase): string {
  switch (phase) {
    case 'preparing': return readerCopy('toolPhasePreparing', 'Writing input')
    case 'running': return readerCopy('toolPhaseRunning', 'Running')
    case 'returned': return readerCopy('toolPhaseReturned', 'Returned')
    case 'succeeded': return readerCopy('toolPhaseSucceeded', 'Done')
    case 'failed': return readerCopy('toolPhaseFailed', 'Failed')
    case 'interrupted': return readerCopy('toolPhaseInterrupted', 'Stopped')
  }
}

/** The call's arguments as far as they have arrived, for the input tab. */
function inputPayload(block: ToolCallBlock): Record<string, string> {
  const fields: Record<string, string> = {}
  const args = callArgs(block)
  for (const key of args.keys()) {
    const text = args.text(key)
    fields[key] = text ?? '…'
  }
  return fields
}

/** The raw input text, when the host kept it. */
function rawInput(block: ToolCallBlock): string {
  if ('kind' in block) return block.call?.argsRaw ?? ''
  return block.phase === 'start' ? block.argsRaw : ''
}

/** The result's own text, for the fallback when no host view claims the tool. */
function ResultFallback({ block, phase, context }: { block: ToolCallBlock, phase: ToolPhase, context: BlockContext }) {
  if (!('kind' in block)) {
    return <p className="dsh-claude-reader-tool-note">{phase === 'interrupted'
      ? readerCopy('toolNoteInterrupted', 'Stopped before a result; the input is kept.')
      : phase === 'preparing' ? readerCopy('toolNotePreparing', 'The model is still writing the input; the tool has not started.')
        : readerCopy('toolNoteRunning', 'The tool is running; waiting for its result.')}</p>
  }
  const text = contentBlocks(block.content).filter(item => item.kind === 'text')
  if (text.length > 0) return <Blocks blocks={text} source="tool" streaming={false} context={context} />
  return <p className="dsh-claude-reader-tool-note">{readerCopy('toolNoteEmpty', 'The tool returned nothing to show.')}</p>
}

/** The elapsed clock of a call still running, from its stamped start; null once it returned. */
function useRunningClock(block: ToolCallBlock, running: boolean): number | null {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!running) return
    const timer = window.setInterval(() => setNow(Date.now()), 200)
    return () => window.clearInterval(timer)
  }, [running])
  const start = callStartTime(block)
  return running && start !== null ? Math.max(0, now - start) : null
}

export const ToolRow = memo(function ToolRow({ entry, turnClosed, motion, onRead, official, context, depth = 0 }: {
  entry: ToolActivityEntry
  turnClosed: boolean
  motion: boolean
  onRead: () => void
  official: Official
  context: BlockContext
  depth?: number
}) {
  // A memoized row: copy changes re-render it (reader-state.ts).
  useCopyRevision()
  // The host's work-details mode never opens a call on its own: a tool's details
  // stand shut until the reader presses its row.
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<'result' | 'input' | 'raw'>('result')
  const control = useRef<HTMLElement | null>(null)
  const detailId = useId()
  const block = entry.block
  const model = activitySummary(block)
  const phase = activityPhase(block, turnClosed)
  const running = phase === 'preparing' || phase === 'running'
  const liveMs = useRunningClock(block, running)
  const elapsed = 'kind' in block && block.callTime !== null ? Math.max(0, block.time - block.callTime) : null
  const shownMs = liveMs ?? (elapsed !== null && elapsed >= SLOW_TOOL_MS ? elapsed : null)
  const hunks = useMemo(() => callDiffHunks(block), [block])
  const totals = hunks.length === 0 ? null : diffTotals(hunks)
  const name = toolName(block)
  const Icon = name === 'skill' ? IconSkillOutlineRegular : ICONS[model.category]
  const summary = phase === 'interrupted' ? readerCopy('toolSummaryStopped', 'Stopped · the call is kept')
    : name === 'skill' ? argText(callArgs(block), ['name'])?.split('\n')[0] ?? ''
      : model.target ?? model.description ?? model.title
  const facts = executionFacts(block)
  const tabs = [
    ['result', phase === 'preparing' ? readerCopy('toolTabPreview', 'Preview') : readerCopy('toolTabResult', 'Result')],
    ['input', readerCopy('toolTabInput', 'Input')],
    ['raw', readerCopy('toolTabRaw', 'Raw')],
  ] as const
  if (depth > MAX_DEPTH) return <p className="dsh-claude-reader-meta">{readerCopy('toolTooDeep', 'Deeper calls are in the host\'s own view.')}</p>
  const raw = rawInput(block)
  return <div ref={element => { control.current = element?.querySelector<HTMLElement>('[data-disclosure-row]') ?? null }}
    className="dsh-claude-reader-tool" data-dsh-claude-reader-tool-phase={phase} data-dsh-claude-reader-tool-category={model.category}>
    <DisclosureRow icon={<Icon size={14} />} title={rowTitle(name, model.category)} open={open} expandable expandOnRowClick keepContentWhenOpen running={running}
      onToggle={() => {
        onRead()
        setOpen(value => !value)
      }}
      rowClassName="dsh-claude-reader-tool-row"
      collapsedContent={<>
        <span className="dsh-claude-reader-tool-separator" aria-hidden="true" />
        <span className="dsh-claude-reader-tool-summary" title={summary}>{summary}</span>
        {shownMs !== null && <span className="dsh-claude-reader-tool-elapsed" data-dsh-claude-reader-slow={shownMs >= SLOW_TOOL_MS ? '' : undefined}>{(shownMs / 1000).toFixed(shownMs < 10000 ? 1 : 0)}s</span>}
        {totals !== null && <span className="dsh-claude-reader-diff-stat">
          {totals.added > 0 && <span className="dsh-claude-reader-diff-added">+{number.format(totals.added)}</span>}
          {totals.removed > 0 && <span className="dsh-claude-reader-diff-removed">-{number.format(totals.removed)}</span>}
        </span>}
        {(running || phase === 'failed' || phase === 'interrupted') && <span className="dsh-claude-reader-tool-state" data-dsh-claude-reader-tool-phase={phase}>{phaseLabel(phase)}</span>}
      </>} />
    <ProcessFragment open={open} motion={motion} onRead={onRead} returnFocusTo={control} nodeKey={`${entry.key}:detail`} framed>
      <div className="dsh-claude-reader-tool-details">
        <div className="dsh-claude-reader-tool-ledger">
          <span>{readerCopy('toolLedgerName', 'Tool · {name}', { name })}</span>
          {facts.exitCode !== undefined && <span>{readerCopy('toolLedgerExit', 'Exit code {code}', { code: facts.exitCode })}</span>}
          {facts.signal !== undefined && <span>{readerCopy('toolLedgerSignal', 'Signal {signal}', { signal: facts.signal })}</span>}
        </div>
        <div className="dsh-claude-reader-tool-tabs" role="tablist">
          {tabs.map(([id, title]) => <button key={id} type="button" role="tab" id={`${detailId}-${id}`} aria-selected={tab === id} aria-controls={`${detailId}-panel`} tabIndex={tab === id ? 0 : -1} onClick={() => setTab(id)}>{title}</button>)}
        </div>
        <div id={`${detailId}-panel`} className="dsh-claude-reader-tool-panel" role="tabpanel" aria-labelledby={`${detailId}-${tab}`}>
          {tab === 'result' && <OfficialTool official={official} block={block} toolName={name} fallback={<ResultFallback block={block} phase={phase} context={context} />} />}
          {tab === 'input' && <JsonBlock label={readerCopy('toolInput', 'Tool input')} payload={inputPayload(block)} defaultOpen truncatedLabel={truncatedJsonLabel} />}
          {tab === 'raw' && <>
            <h4 className="dsh-claude-reader-tool-raw-label">{readerCopy('toolRawInput', 'Tool input')}</h4>
            <pre className="dsh-claude-reader-tool-raw">{raw === '' ? readerCopy('toolRawPending', 'The input has not arrived yet.') : raw}</pre>
            {'kind' in block && <>
              <h4 className="dsh-claude-reader-tool-raw-label">{readerCopy('toolRawResult', 'Tool result')}</h4>
              <pre className="dsh-claude-reader-tool-raw">{JSON.stringify({ content: block.content, isError: block.isError, meta: block.meta }, null, 2)}</pre>
            </>}
          </>}
        </div>
      </div>
    </ProcessFragment>
    {block.subCalls.length > 0 && <div className="dsh-claude-reader-tool-children">
      {block.subCalls.map((child, index) => <ToolRow key={child.callId}
        entry={{ kind: 'tool', key: `reader-tool:${child.callId}`, callId: child.callId, step: entry.step, order: index, block: child }}
        turnClosed={turnClosed} motion={motion} onRead={onRead} official={official} context={context} depth={depth + 1} />)}
    </div>}
  </div>
})

/** Images and other media a call returned, shown outside the folded detail. */
export function ToolMedia({ block, context, depth = 0 }: { block: ToolCallBlock, context: BlockContext, depth?: number }) {
  if (depth > MAX_DEPTH) return null
  const media = 'kind' in block ? contentBlocks(block.content).filter(item => item.kind === 'image') : []
  return <>
    {media.length > 0 && <Blocks blocks={media} source="tool" streaming={false} context={context} />}
    {block.subCalls.map(child => <ToolMedia key={child.callId} block={child} context={context} depth={depth + 1} />)}
  </>
}
