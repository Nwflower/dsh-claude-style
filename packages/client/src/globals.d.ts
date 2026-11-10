/**
 * Browser and host additions the TypeScript DOM library does not declare.
 */

/** The Window Controls Overlay API (Chromium): the caption buttons' box on the Windows desktop shell */
interface WindowControlsOverlay extends EventTarget {
  readonly visible: boolean
  getTitlebarAreaRect(): DOMRect
}

interface Navigator {
  readonly windowControlsOverlay?: WindowControlsOverlay
}

interface Window {
  /**
   * The host's boot manifest: every client entry the loader will evaluate (D74's
   * peer check reads it), and the host release it was composed for (D78).
   */
  readonly __DSH_BOOT__?: { entries?: unknown, release?: { version?: unknown } }
  /** ds-bot's registry, present while its browser half runs (D74 reads only its presence). */
  readonly dshBot?: unknown
  __DSH_CLAUDE_STYLE_CONTROLS__?: import('./core/external-controls').ClaudeControlsApi
}

/** Additions this skin puts on the global scope. */
declare var __dshStepDisplay: { set: (mode: 'compact' | 'standard' | 'detailed' | 'verbose') => Promise<boolean>, read: () => string } | undefined
/** Binding tokens distinguish this generation's nodes from stale ones. */
interface Element {
  /** The context meter, panel and line of numbers bound by this generation (features/context-stats). */
  __dshContextMeterToken?: object
  __dshContextPanelToken?: object
  __dshContextLineToken?: object
  /** The host's account row bound by this generation (features/account). */
  __dshHostRowToken?: object
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
  /** The running chunk publishes its factory here; `require` resolves shared bundle modules (D72). */
  __dshChunk?: (require: (id: string) => unknown) => { install?: unknown }
}

interface KeyboardEvent {
  /** Set on the Escape the skin dispatches to the host's own menu; the skin's key route skips it. */
  __dshHostMenuEscape?: boolean
}

/** A stylesheet's text, as the declared logic surface hands it to a spec (pure.ts, through Vite's `?raw`). */
declare module '*.css?raw' {
  const text: string
  export default text
}
