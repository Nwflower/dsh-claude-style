import * as React from 'react'
import { createModalHost, ModalFrame } from '../../shared/modal-host'
import type { ModalHost } from '../../shared/modal-host'
import { Glyph } from './palette-parts'
import { useSlidingPill } from '../../shared/segment-group'
import { copy } from './copy'
export { createModalHost }
export type { ModalHost }

/**
 * The frame the settings page's two managers share, the colour schemes'
 * (palette-manager.ts) and the brand marks' (brand-manager.ts): a modal on
 * <body>, over the settings dialog that would clip it. Its left column lists
 * the records under a highlight that slides to the one in hand and ends with
 * the line that makes a new one; its right column is the editor of the one in
 * hand. A manager hands the frame its lines, its editor and the foot of its
 * list; `ModalFrame` owns the layer, the arrival and the leaving (palette-schemes.css).
 */

/** One line of a manager's list: what the record looks like in small where the record draws one, its name, and the tick while the page uses it. */
export function SchemeItem(props: { id: string, lead?: React.ReactNode, name: string, active: boolean, inUse: boolean, pick(): void }) {
  return React.createElement(
    'button',
    {
      type: 'button',
      className: 'dsh-claude-scheme-item',
      'data-scheme': props.id,
      'data-active': props.active ? '' : undefined,
      'aria-pressed': props.active ? 'true' : 'false',
      onClick: props.pick,
    },
    props.lead ?? null,
    React.createElement('span', { className: 'dsh-claude-scheme-item-name' }, props.name),
    props.inUse
      ? React.createElement('span', { className: 'dsh-claude-scheme-item-mark', role: 'img', 'aria-label': copy('paletteInUse') }, React.createElement(Glyph, { name: 'check' }))
      : null,
  )
}

/** The manager's frame around its own lines, foot and editor. */
export function SchemeModal(props: {
  title: string
  items: React.ReactNode
  add: { label: string, disabled: boolean, run(): void }
  foot: React.ReactNode
  pane: React.ReactNode
  close(): void
  /** The lines carry no lead of their own, so the add line's mark stands on the padding's edge (palette-schemes.css). */
  leadless?: boolean
}) {
  const items = React.useRef<HTMLDivElement>(null)
  useSlidingPill(items)
  return React.createElement(
    ModalFrame,
    { label: props.title, closeLabel: copy('paletteManagerClose'), close: props.close },
    React.createElement(
      'nav',
      { className: 'dsh-claude-scheme-rail', 'aria-label': props.title },
      React.createElement('h2', { className: 'dsh-claude-scheme-rail-title' }, props.title),
      React.createElement(
        'div',
        { className: 'dsh-claude-scheme-rail-scroll' },
        React.createElement('div', { ref: items, className: 'dsh-claude-scheme-items' }, props.items),
        React.createElement(
          'button',
          { type: 'button', className: 'dsh-claude-scheme-item dsh-claude-scheme-add', 'data-lead': props.leadless === true ? 'none' : undefined, disabled: props.add.disabled, onClick: props.add.run },
          React.createElement(Glyph, { name: 'plus' }),
          React.createElement('span', { className: 'dsh-claude-scheme-item-name' }, props.add.label),
        ),
      ),
      React.createElement('div', { className: 'dsh-claude-scheme-rail-foot' }, props.foot),
    ),
    React.createElement('div', { className: 'dsh-claude-scheme-pane' }, props.pane),
  )
}
