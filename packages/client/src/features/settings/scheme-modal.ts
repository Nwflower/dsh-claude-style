import * as React from 'react'
import { useModalLayer } from '@deepseek-ai/dsh-client-ui-primitives'
import * as reactDom from 'react-dom/client'
import { registerPopover, unregisterPopover } from '../../shared/popover'
import { Glyph } from './palette-parts'
import { useSlidingPill } from '../../shared/segment-group'
import { copy } from './copy'

/**
 * The frame the settings page's two managers share, the colour schemes'
 * (palette-manager.ts) and the brand marks' (brand-manager.ts): a modal on
 * <body>, over the settings dialog that would clip it. Its left column lists
 * the records under a highlight that slides to the one in hand and ends with
 * the line that makes a new one; its right column is the editor of the one in
 * hand. A manager hands the frame its lines, its editor and the foot of its
 * list; the frame owns the layer, the arrival and the leaving (palette-schemes.css).
 */

const PANEL_CLASS = 'dsh-claude-scheme-panel'
/** On the manager's node while it plays its way out. */
const LEAVING_ATTR = 'data-leaving'

/** A manager's way onto the page and off it: one stands at a time per manager. */
export interface ModalHost<P> {
  open(props: P): void
  close(): void
}

/** The opener and closer of one manager whose body is `Body`, registered as the popover `name`. */
export function createModalHost<P extends object>(name: string, Body: (props: P & { close(): void }) => React.ReactElement | null): ModalHost<P> {
  let host: HTMLElement | null = null
  let root: reactDom.Root | null = null

  /** Take the open manager out of the module's hands and return what takes it off the page. */
  const release = () => {
    if (host === null) return null
    const closing = root
    const node = host
    root = null
    host = null
    unregisterPopover(name)
    // A root that unmounts while React is rendering the page raises a warning; the next task is out of any render.
    return { node, unmount: () => queueMicrotask(() => {
      closing?.unmount()
      node.remove()
    }) }
  }

  /** Close the manager, if one stands: it plays its way out and leaves the page when the panel's exit ends. */
  const close = () => {
    const released = release()
    if (released === null) return
    const panel = released.node.querySelector(`.${PANEL_CLASS}`)
    if (panel === null) {
      released.unmount()
      return
    }
    released.node.setAttribute(LEAVING_ATTR, '')
    panel.addEventListener('animationend', (event) => {
      // The editor's own entrance ends inside the panel too; only the panel's exit takes the manager away.
      if (event.target === panel) released.unmount()
    })
  }

  /** Open the manager over the page, replacing one that is already up. */
  const open = (props: P) => {
    release()?.unmount()
    host = document.createElement('div')
    host.className = 'dsh-claude-scheme-host'
    document.body.append(host)
    root = reactDom.createRoot(host)
    root.render(React.createElement(Body, { ...props, close }))
    registerPopover(name, close)
  }

  return { open, close }
}

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
  const panel = React.useRef<HTMLDivElement>(null)
  const items = React.useRef<HTMLDivElement>(null)
  // The host owns nested-dialog keyboard handling and restores the settings control's focus (D43).
  useModalLayer(panel, true, props.close)
  useSlidingPill(items)
  return React.createElement(
    'div',
    {
      className: 'dsh-claude-scheme-modal',
      onPointerDown: (event: React.PointerEvent<HTMLDivElement>) => {
        event.stopPropagation()
        if (event.target === event.currentTarget) props.close()
      },
    },
    React.createElement(
      'div',
      { ref: panel, className: PANEL_CLASS, tabIndex: -1, role: 'dialog', 'aria-modal': 'true', 'aria-label': props.title },
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
      React.createElement('button', { type: 'button', className: 'dsh-claude-scheme-close', 'aria-label': copy('paletteManagerClose'), onClick: props.close }, React.createElement(Glyph, { name: 'close' })),
    ),
  )
}
