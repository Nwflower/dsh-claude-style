import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { DiffBlock, diffTotals } from '@deepseek-ai/dsh-client-ui-primitives'
import type { DiffBlockLabels } from '@deepseek-ai/dsh-client-ui-primitives'
import { readerCopy } from '../../core/i18n'
import { FOLD_TIMING } from './fold-choreography'
import type { LiveStep, LiveStepList } from './live-turn'
import { Disclosure } from './motion'
import { layoutEnd, layoutStart } from './reader-follow'
import { callDiffHunks } from './tool-activity'

/**
 * The fold summary rows (D57), after dsh-better-display's LiveFold, DiffPanel
 * and ClosedProcessSummary (MIT): the figures, each number rolling as it
 * changes, and the lines the calls changed, which open the host's diff card one
 * file at a time.
 */

/** A figure that rolls to its new value: the old one leaves upward as the new one rises (160 ms). */
function NumberRoll({ value, motion }: { value: number, motion: boolean }) {
  const [outgoing, setOutgoing] = useState<number | null>(null)
  const previous = useRef(value)
  useLayoutEffect(() => {
    if (value === previous.current) return
    const old = previous.current
    previous.current = value
    if (!motion) {
      setOutgoing(null)
      return
    }
    setOutgoing(old)
    const timer = window.setTimeout(() => setOutgoing(null), FOLD_TIMING.count)
    return () => window.clearTimeout(timer)
  }, [value, motion])
  return <span className="dsh-claude-reader-roll" aria-hidden="true">
    <span className="dsh-claude-reader-roll-sizer">{value}</span>
    {outgoing !== null && <span key={`out-${outgoing}`} className="dsh-claude-reader-roll-digit" data-dsh-claude-reader-roll="exit">{outgoing}</span>}
    <span key={`in-${value}`} className="dsh-claude-reader-roll-digit" data-dsh-claude-reader-roll={outgoing !== null ? 'enter' : 'settled'}>{value}</span>
  </span>
}

/** The fold's figures, the words kept and each number rolling on its own. */
function FoldFigures({ summary, motion }: { summary: string, motion: boolean }) {
  const parts = useMemo(() => {
    const result: { text: string, number?: number }[] = []
    let end = 0
    for (const match of summary.matchAll(/([^\d]+)(\d+)/g)) {
      result.push({ text: match[1]!, number: Number(match[2]) })
      end = match.index + match[0].length
    }
    if (end < summary.length) result.push({ text: summary.slice(end) })
    return result
  }, [summary])
  return <span className="dsh-claude-reader-fold-figures" aria-label={summary}>
    {parts.map(part => <span key={part.text} className="dsh-claude-reader-fold-part">
      <span>{part.text}</span>
      {part.number !== undefined && <NumberRoll value={part.number} motion={motion} />}
    </span>)}
  </span>
}

/** The diff card's chrome in the reader's language. */
function diffLabels(): DiffBlockLabels {
  return {
    codeLabel: readerCopy('diffCode', 'Code'),
    wrapLabel: readerCopy('diffWrap', 'Wrap lines'),
    unwrapLabel: readerCopy('diffUnwrap', 'No wrap'),
    copy: readerCopy('diffCopy', 'Copy'),
    copied: readerCopy('diffCopied', 'Copied'),
    collapseAria: readerCopy('diffCollapse', 'Collapse'),
    collapse: readerCopy('diffCollapse', 'Collapse'),
    expandAria: hidden => readerCopy('diffExpand', 'Show {hidden} more lines', { hidden }),
    expand: hidden => readerCopy('diffExpand', 'Show {hidden} more lines', { hidden }),
  }
}

/** Opens and closes its child on the real height, so the column grows and the follow measures it. */
function MorphPanel({ open, children, onClosed }: { open: boolean, children: ReactNode, onClosed: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const element = ref.current
    if (element === null) return
    layoutStart(element)
    const height = element.scrollHeight
    const frames = open
      ? [{ height: '0px', opacity: 0, transform: 'translateY(-6px)' }, { height: `${height}px`, opacity: 1, transform: 'translateY(0)' }]
      : [{ height: `${height}px`, opacity: 1 }, { height: '0px', opacity: 0 }]
    const duration = FOLD_TIMING.reveal + FOLD_TIMING.settle
    const animation = element.animate(frames, { duration, easing: 'cubic-bezier(.4,0,.2,1)' })
    let settled = false
    const settle = () => {
      if (settled) return
      settled = true
      layoutEnd(element)
      if (open) {
        element.style.height = 'auto'
        element.style.overflow = 'visible'
      } else onClosed()
    }
    animation.onfinish = settle
    const deadline = window.setTimeout(settle, duration + FOLD_TIMING.watchdogSlack)
    return () => {
      window.clearTimeout(deadline)
      animation.cancel()
      if (!settled) {
        settled = true
        layoutEnd(element)
      }
    }
  }, [open])
  return <div ref={ref} className="dsh-claude-reader-diff-panel">{children}</div>
}

/** Every file a fold's calls changed, as counts that open the diff; nothing when no file changed. */
function FoldDiff({ steps, label }: { steps: LiveStepList, label: string }) {
  const hunks = useMemo(() => steps.flatMap(step => step.kind === 'tool' ? callDiffHunks(step.entry.block) : []), [steps])
  const [open, setOpen] = useState(false)
  const [visible, setVisible] = useState(false)
  const [active, setActive] = useState(0)
  if (hunks.length === 0) return null
  const totals = diffTotals(hunks)
  const current = hunks[Math.min(active, hunks.length - 1)]!
  return <>
    <button type="button" className="dsh-claude-reader-diff-button" aria-expanded={open}
      aria-label={readerCopy('foldDiffLabel', '{label} · {added} lines added, {removed} removed', { label, added: totals.added, removed: totals.removed })}
      onClick={event => {
        event.stopPropagation()
        if (open) {
          setOpen(false)
          return
        }
        setVisible(true)
        setOpen(true)
      }}>
      {totals.added > 0 && <span className="dsh-claude-reader-diff-added">+{totals.added}</span>}
      {totals.removed > 0 && <span className="dsh-claude-reader-diff-removed">-{totals.removed}</span>}
    </button>
    {visible && <div className="dsh-claude-reader-diff-row">
      <MorphPanel open={open} onClosed={() => setVisible(false)}>
        {hunks.length > 1 && <div className="dsh-claude-reader-diff-tabs">
          {hunks.map((hunk, index) => <button key={`${hunk.path}:${index}`} type="button" className="dsh-claude-reader-diff-tab"
            data-dsh-claude-reader-active={index === active ? '' : undefined} onClick={() => setActive(index)} title={hunk.path}>
            {hunk.path.split(/[/\\]+/).filter(Boolean).at(-1) ?? hunk.path}
          </button>)}
        </div>}
        <DiffBlock diffs={[current]} maxLines={36} labels={diffLabels()} />
      </MorphPanel>
    </div>}
  </>
}

/**
 * A summary row: the disclosure with its figures, and what the summarized calls
 * changed. A live fold stands among the steps it holds; a closed turn's summary
 * keeps the counts discoverable once the live folds retire.
 */
export function FoldSummary({ kind, summary, steps, open, onChange, motion, controls }: {
  kind: 'live' | 'closed'
  summary: string
  steps: LiveStepList
  open: boolean
  onChange: (open: boolean) => void
  motion: boolean
  controls?: string
}) {
  const button = useRef<HTMLButtonElement>(null)
  return <div className="dsh-claude-reader-fold" data-dsh-claude-reader-fold={kind} data-dsh-claude-reader-open={open ? '' : undefined}>
    <div className="dsh-claude-reader-fold-row">
      <Disclosure open={open} onChange={onChange} controls={controls} buttonRef={button} label={<FoldFigures summary={summary} motion={motion} />} />
      <FoldDiff steps={steps} label={summary} />
    </div>
  </div>
}
