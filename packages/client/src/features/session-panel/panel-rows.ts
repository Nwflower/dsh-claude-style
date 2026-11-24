import * as React from 'react'
import * as primitives from '@deepseek-ai/dsh-client-ui-primitives'
import { copy } from './copy'

const h = React.createElement

/** What the host's panel factories take: the hover card's details and the list's fold control (D113). */
export interface PanelDetails {
  title?: string
  lines?: readonly string[]
}

/** The fold control's state, as `conversation.session.panel.fold` takes it. */
interface PanelFold {
  expanded: boolean
  label: string
  name: string
  onToggle(): void
}

/** Renders one of the host panel's component factories by name. */
export type RenderFactorySlot = (name: string, props: object) => React.ReactNode

/**
 * The props every entry the skin hands to the host's session panel receives:
 * the session the panel shows and the renderer of the panel's own factories.
 */
export interface PanelSlotProps {
  sessionId?: unknown
  renderFactorySlot?: RenderFactorySlot
}

/** What an entry's body works from: the session the panel shows and the panel's factories. */
export interface PanelEntryProps {
  sessionId: string
  factories: RenderFactorySlot
}

/**
 * The component the skin hands one of the panel's slots (D113): it renders
 * nothing until the host names a session, and then its body for that session.
 * The factory renderer is read when a row asks for it; a panel that handed none
 * is a host this skin does not serve, and the row that asked says so.
 */
export function panelEntry(Body: React.FunctionComponent<PanelEntryProps>) {
  return function PanelEntry(props: PanelSlotProps) {
    const sessionId = typeof props.sessionId === 'string' && props.sessionId !== '' ? props.sessionId : null
    if (sessionId === null) return null
    const factories: RenderFactorySlot = (name, factoryProps) => {
      const render = props.renderFactorySlot
      if (typeof render !== 'function') throw new Error('the host session panel handed no component factory renderer')
      return render(name, factoryProps)
    }
    return h(Body, { sessionId, factories })
  }
}

/**
 * One row in the host panel's shared row markup (D113): the host lays out
 * `data-session-panel-row` and its `data-row-part` children, so a skin row
 * stands in the icon, text and trailing columns every other section uses. The
 * row's words are one line — the title, then its detail in the quiet ink — and
 * what the line cannot say goes into the host's hover card, built by the
 * panel's own details factory.
 */
export function Row(props: { mark?: React.ReactNode, title: string, detail?: string, side?: React.ReactNode, card?: React.ReactNode, kind?: string, onClick?: () => void }) {
  const detail = props.detail === undefined || props.detail === '' ? null : props.detail
  const parts = [
    props.mark === undefined ? null : h('span', { key: 'icon', 'data-row-part': 'icon', 'aria-hidden': true }, props.mark),
    h('span', { key: 'content', 'data-row-part': 'content' },
      h('span', { className: 'dsh-claude-panel-title' }, props.title),
      detail === null ? null : h('span', { className: 'dsh-claude-panel-detail' }, detail)),
  ]
  const body = props.onClick === undefined
    ? h('span', { 'data-row-part': 'body' }, parts)
    : h('button', { type: 'button', 'data-row-part': 'body', onClick: props.onClick }, parts)
  const row = h('div', { 'data-session-panel-row': '', className: props.kind },
    body,
    props.side === undefined ? null : h('span', { 'data-row-part': 'trailing' }, props.side))
  if (props.card === undefined) return row
  return h(primitives.HoverCard, { grouped: true, anchor: row, content: props.card })
}

/** How many rows a list shows before the host's fold control (the panel's own limit). */
const FOLD_LIMIT = 5

/**
 * A list folded the way the host panel folds its own (D113): the first five
 * rows, then the panel's fold control as the last row. The list folds only when
 * that holds back two rows or more, since the control takes a row itself; the
 * rows arrive newest first, so the ones held back are the least current.
 */
export function FoldedList({ rows, list, factories }: { rows: readonly React.ReactNode[], list: string, factories: RenderFactorySlot }) {
  const [expanded, setExpanded] = React.useState(false)
  if (rows.length <= FOLD_LIMIT + 1) return h(primitives.HoverCardGroup, null, rows)
  const label = expanded ? copy('showLess') : copy('showMore', { count: rows.length - FOLD_LIMIT })
  const fold: PanelFold = {
    expanded,
    label,
    name: copy('foldName', { label, list }),
    onToggle() { setExpanded(!expanded) },
  }
  return h(primitives.HoverCardGroup, null,
    expanded ? rows : rows.slice(0, FOLD_LIMIT),
    factories('conversation.session.panel.fold', fold))
}

/** The hover card's content for one row, through the host panel's details factory. */
export function detailsCard(factories: RenderFactorySlot, details: PanelDetails) {
  return factories('conversation.session.panel.details', details)
}

/**
 * A placeholder bar where a reading will be written once the host's fold
 * answers (D113): one line's height, so the row it stands in keeps the height
 * the written row will have.
 */
export function Skeleton({ width }: { width: string }) {
  return h('span', { className: 'dsh-claude-panel-skeleton', style: { width } })
}

/** One trailing state word. */
export function Chip({ text }: { text: string }) {
  return h('span', { className: 'dsh-claude-panel-chip' }, text)
}
