import * as React from 'react'
import * as primitives from '@deepseek-ai/dsh-client-ui-primitives'
import { tooltipAnchor } from '../../shared/host-tooltip'
import { copy } from './copy'

const h = React.createElement

/** Each section owns a native disclosure (D94): its children stay mounted so
 * folding preserves list expansion and an opened job's output. An unchanged
 * `open` prop lets the browser keep the reader's choice across data refreshes.
 * A `folded` section starts closed, with its reading beside the heading.
 */
export function Section({ title, summary, folded, children, kind }: { title: string, summary?: React.ReactNode, folded?: boolean, children?: React.ReactNode, kind?: string }) {
  return h('details', { className: ['dsh-claude-panel-section', kind].filter(Boolean).join(' '), open: folded !== true },
    h('summary', { className: 'dsh-claude-panel-section-toggle' },
      h('h2', { className: 'dsh-claude-panel-heading' },
        h('span', { className: 'dsh-claude-panel-section-title' }, title),
        h('span', { className: 'dsh-claude-panel-section-chevron', 'aria-hidden': true },
          h(primitives.IconChevronRightOutlineRegular, { size: 12 })),
        summary === undefined ? null : h('span', { className: 'dsh-claude-panel-section-reading' }, summary))),
    h('div', { className: 'dsh-claude-panel-section-content' }, children))
}

/** How many rows a section or a background category shows before folding the rest behind its own control. */
const FOLD_LIMIT = 2

/**
 * One section's rows, folded after two while the reader has not asked for the
 * rest: the panel is a summary, and a long list would push every section after
 * it out of the column. A row opened in place (a job's output) folds with the
 * rows it belongs to.
 */
export function FoldedList({ rows }: { rows: readonly React.ReactNode[] }) {
  const [expanded, setExpanded] = React.useState(false)
  if (rows.length <= FOLD_LIMIT) return h('div', { className: 'dsh-claude-panel-list' }, rows)
  return h('div', { className: 'dsh-claude-panel-list' },
    expanded ? rows : rows.slice(0, FOLD_LIMIT),
    h('button', {
      type: 'button',
      className: 'dsh-claude-panel-more',
      'aria-expanded': expanded,
      onClick() { setExpanded(!expanded) },
    }, expanded ? copy('showLess') : copy('showMore', { count: rows.length - FOLD_LIMIT })))
}

/**
 * One row on one line: a mark, a title with its detail after it, and a trailing
 * side. What the line cannot say — an output's full path, a job's progress, a
 * title it cut short — stands in the host's own tooltip bubble on hover and on
 * keyboard focus, portaled to the body so the scrolling rail never cuts it.
 */
export function Row(props: { mark?: React.ReactNode, title: string, detail?: string, hint?: string, kind?: string, side?: React.ReactNode, href?: string, onClick?: () => void, expanded?: boolean }) {
  const detail = props.detail === undefined || props.detail === '' ? null : props.detail
  const content = [
    props.mark === undefined ? null : h('span', { key: 'mark', className: 'dsh-claude-panel-mark', 'aria-hidden': true }, props.mark),
    h('span', { key: 'main', className: 'dsh-claude-panel-main' },
      h('span', { className: 'dsh-claude-panel-title' }, props.title),
      detail === null ? null : h('span', { className: 'dsh-claude-panel-detail' }, detail)),
    props.side === undefined ? null : h('span', { key: 'side', className: 'dsh-claude-panel-side' }, props.side),
  ]
  const rowClass = props.kind === undefined ? 'dsh-claude-panel-row' : `dsh-claude-panel-row ${props.kind}`
  const row = props.href !== undefined
    ? h('a', { className: `${rowClass} is-link`, href: props.href, target: '_blank', rel: 'noreferrer' }, content)
    : props.onClick !== undefined
      ? h('button', {
        type: 'button',
        className: `${rowClass} is-button`,
        onClick: props.onClick,
        ...(props.expanded === undefined ? {} : { 'aria-expanded': props.expanded }),
      }, content)
      : h('div', { className: rowClass }, content)
  // A row whose reading carries more than its own words — a full path, a job's
  // progress — says it on any hover; a row whose line already says all of it
  // raises the bubble only where the line cut a word off.
  const line = detail === null ? props.title : `${props.title} · ${detail}`
  const hint = props.hint === undefined || props.hint === '' ? null : props.hint
  const reading = hint ?? line
  return h(primitives.Tooltip, {
    label: reading,
    side: 'bottom',
    portal: true,
    onlyWhenClipped: reading === line,
    children: tooltipAnchor(row),
  })
}

/** One trailing state word. */
export function Chip({ text, tone }: { text: string, tone?: 'success' | 'failure' | 'pending' }) {
  return h('span', { className: tone === undefined ? 'dsh-claude-panel-chip' : `dsh-claude-panel-chip is-${tone}` }, text)
}

