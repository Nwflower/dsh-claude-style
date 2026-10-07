/**
 * Browser and host additions the TypeScript DOM library does not declare.
 */

/** The Window Controls Overlay API (Chromium): the caption buttons' box on the Windows desktop shell (D28). */
interface WindowControlsOverlay {
  readonly visible: boolean
  getTitlebarAreaRect(): DOMRect
}

interface Navigator {
  readonly windowControlsOverlay?: WindowControlsOverlay
}

interface Window {
  /** The host's boot manifest: every client entry the loader will evaluate (D32's peer check reads it). */
  readonly __DSH_BOOT__?: { entries?: unknown }
}

/**
 * Marks the skin keeps on nodes it binds, so a later pass or a later
 * generation can tell its own binding apart from one it must redo.
 */
interface Element {
  /** The context meter and panel bound by this generation (features/context-stats). */
  __dshContextMeterToken?: object
  __dshContextPanelToken?: object
  /** The host's account row and menu bound by this generation (features/account). */
  __dshHostRowToken?: object
  __dshHostHoverBound?: boolean
  __dshBanBound?: boolean
  /** A mirrored footer entry: the icon markup it carries, the host entry and the click it forwards. */
  __dshIconHtml?: string
  __dshEntry?: Element | null
  __dshForward?: HTMLElement | null
  /** The live footer control a mirrored menu item presses. */
  __dshActivator?: HTMLElement | null
  /** The account stream the body follows (features/account/profile). */
  __dshAccountStream?: unknown
}

interface KeyboardEvent {
  /** Set on the Escape the skin dispatches to the host's own menu (D14); the skin's key route skips it. */
  __dshHostMenuEscape?: boolean
}
