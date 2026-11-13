import * as React from 'react'
import * as primitives from '@deepseek-ai/dsh-client-ui-primitives'
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
 * side. The line's hint is the row's whole reading, for a title or a detail the
 * line cut short; `hint` replaces it where the row has words of its own to say.
 */
export function Row(props: { mark?: React.ReactNode, title: string, detail?: string, hint?: string, kind?: string, side?: React.ReactNode, href?: string, onClick?: () => void, expanded?: boolean }) {
  const detail = props.detail === undefined || props.detail === '' ? null : props.detail
  const content = [
    props.mark === undefined ? null : h('span', { key: 'mark', className: 'dsh-claude-panel-mark', 'aria-hidden': true }, props.mark),
    h('span', { key: 'main', className: 'dsh-claude-panel-main', title: props.hint ?? (detail === null ? props.title : `${props.title} · ${detail}`) },
      h('span', { className: 'dsh-claude-panel-title' }, props.title),
      detail === null ? null : h('span', { className: 'dsh-claude-panel-detail' }, detail)),
    props.side === undefined ? null : h('span', { key: 'side', className: 'dsh-claude-panel-side' }, props.side),
  ]
  const rowClass = props.kind === undefined ? 'dsh-claude-panel-row' : `dsh-claude-panel-row ${props.kind}`
  if (props.href !== undefined) {
    return h('a', {
      className: `${rowClass} is-link`,
      href: props.href,
      target: '_blank',
      rel: 'noreferrer',
      title: props.title,
    }, content)
  }
  if (props.onClick !== undefined) {
    return h('button', {
      type: 'button',
      className: `${rowClass} is-button`,
      onClick: props.onClick,
      title: props.title,
      ...(props.expanded === undefined ? {} : { 'aria-expanded': props.expanded }),
    }, content)
  }
  return h('div', { className: rowClass }, content)
}

/** One trailing state word. */
export function Chip({ text, tone }: { text: string, tone?: 'success' | 'failure' | 'pending' }) {
  return h('span', { className: tone === undefined ? 'dsh-claude-panel-chip' : `dsh-claude-panel-chip is-${tone}` }, text)
}

