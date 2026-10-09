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

/** Additions this skin puts on the global scope. */
declare var __dshStepDisplay: { set: (mode: 'compact' | 'standard' | 'detailed' | 'verbose') => Promise<boolean>, read: () => string } | undefined

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

interface HTMLScriptElement {
  /**
   * What a feature chunk's script hands back (D39): the chunk's factory, set
   * on its own script element while it runs. It is called with the `require`
   * that resolves the modules the chunk shares with the bundle.
   */
  __dshChunk?: (require: (id: string) => unknown) => { install?: unknown }
}

interface KeyboardEvent {
  /** Set on the Escape the skin dispatches to the host's own menu (D14); the skin's key route skips it. */
  __dshHostMenuEscape?: boolean
}
