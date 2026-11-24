import * as React from 'react'
import { useModalLayer } from '@deepseek-ai/dsh-client-ui-primitives'
import * as reactDom from 'react-dom/client'
import { registerPopover, unregisterPopover } from './popover'
import { Glyph } from './settings-glyphs'

/**
 * Shared modal host and dialog frame mounted on `<body>` above the settings
 * dialog: registers with the popover stack, delegates nested focus trapping and
 * focus restoration to the host's `useModalLayer` (D43), and plays the panel's
 * exit animation before unmounting (features/settings/palette-schemes.css).
 */

export const MODAL_BACKDROP_CLASS = 'dsh-claude-scheme-modal'
export const MODAL_PANEL_CLASS = 'dsh-claude-scheme-panel'
export const MODAL_CLOSE_CLASS = 'dsh-claude-scheme-close'
/** On the modal host node while its panel plays out. */
const LEAVING_ATTR = 'data-leaving'

export interface ModalHost<P> {
  open(props: P): void
  close(): void
}

/** Build a singleton modal opener and closer whose root registers under `name`. */
export function createModalHost<P extends object>(
  name: string,
  Body: (props: P & { close(): void }) => React.ReactElement | null,
): ModalHost<P> {
  let host: HTMLElement | null = null
  let root: reactDom.Root | null = null

  const release = () => {
    if (host === null) return null
    const closing = root
    const node = host
    root = null
    host = null
    unregisterPopover(name)
    // Unmounting synchronously during a React commit warns; defer to the next microtask.
    return {
      node,
      unmount: () => queueMicrotask(() => {
        closing?.unmount()
        node.remove()
      }),
    }
  }

  const close = () => {
    const released = release()
    if (released === null) return
    const panel = released.node.querySelector(`.${MODAL_PANEL_CLASS}`)
    if (panel === null) {
      released.unmount()
      return
    }
    released.node.setAttribute(LEAVING_ATTR, '')
    panel.addEventListener('animationend', event => {
      if (event.target === panel) released.unmount()
    })
  }

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

/** Backdrop, dialog surface and corner close button shared across settings modals. */
export function ModalFrame(props: {
  label: string
  closeLabel: string
  panelClass?: string
  closeClass?: string
  close(): void
  children?: React.ReactNode
}) {
  const panel = React.useRef<HTMLDivElement>(null)
  useModalLayer(panel, true, props.close)
  const panelClass = props.panelClass === undefined ? MODAL_PANEL_CLASS : `${MODAL_PANEL_CLASS} ${props.panelClass}`
  const closeClass = props.closeClass === undefined ? MODAL_CLOSE_CLASS : `${MODAL_CLOSE_CLASS} ${props.closeClass}`
  return React.createElement(
    'div',
    {
      className: MODAL_BACKDROP_CLASS,
      onPointerDown: (event: React.PointerEvent<HTMLDivElement>) => {
        event.stopPropagation()
        if (event.target === event.currentTarget) props.close()
      },
    },
    React.createElement(
      'div',
      { ref: panel, className: panelClass, tabIndex: -1, role: 'dialog', 'aria-modal': 'true', 'aria-label': props.label },
      props.children,
      React.createElement(
        'button',
        { type: 'button', className: closeClass, 'aria-label': props.closeLabel, onClick: props.close },
        React.createElement(Glyph, { name: 'close' }),
      ),
    ),
  )
}
