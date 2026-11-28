/**
 * The data of the skin's sections in the host's session panel (D113): one answer
 * describes a session's working directory, context and outputs, folded on the host
 * from its own projections, session log and services. The browser half renders
 * each section from it and leaves out the ones with nothing to show; the session's
 * figures are the host's own projections, which the page reads without this route.
 */

import type { HostContextPressureProjection } from './services'

/** The context window's occupancy and its composition. */
export interface PanelContext {
  /** Tokens the next request is expected to take. */
  used: number
  /** The route's context window. */
  window: number
  /** The composition by source, priced from the content the host sends; the parts hold the window's split. */
  parts: readonly PanelContextPart[]
  /** Where automatic compaction fires, or absent while the host states no policy (D100). */
  compaction?: PanelCompaction
}

/** The point automatic compaction runs at, as the host's own policy states it (D100). */
export interface PanelCompaction {
  /** Tokens the session may hold before automatic compaction runs. */
  thresholdTokens: number
}

/**
 * The source a context part is attributed to (D113, D104). The fold publishes these granular
 * kinds; the legend merges `tools`, `mcp` and `skills` into one capability row whose label
 * names whichever of the three are present. `conversation` is the user's and assistant's text
 * bodies; `reasoning` is the assistant's reasoning residual; `attachment` is files and pictures
 * extracted from any message; `injection` is instruction files and other attributed context.
 */
export type PanelContextKind =
  | 'system'
  | 'tools'
  | 'mcp'
  | 'skills'
  | 'conversation'
  | 'reasoning'
  | 'tool-call'
  | 'tool-result'
  | 'attachment'
  | 'injection'

export interface PanelContextPart {
  kind: PanelContextKind
  tokens: number
}

/** The host token meter's aggregate projections: the occupancy the parts divide. */
export interface PanelContextProjections {
  contextPressure?: HostContextPressureProjection
}

/** One file the session produced or presented. */
export interface PanelOutput {
  /** Absolute path; the panel opens the file through it. */
  path: string
  /** The working-directory-relative path when the file is under it, otherwise the absolute path. */
  display: string
  /** File name as the row shows it. */
  name: string
  /** What the file is, for the row's mark. */
  kind: 'image' | 'document' | 'file'
  /** Whether the model presented it or a writing tool produced it. */
  origin: 'presented' | 'written'
}

/** What the skin's context and outputs sections show about one session. */
export interface SessionPanelValue {
  /** The session's working directory, or the reader's home when the session recorded none; outputs resolve and open against it. */
  directory: string | null
  context: PanelContext | null
  outputs: readonly PanelOutput[]
}

/** The route's answer: the panel value, or the reason the host could not build it. */
export interface SessionPanelAnswer {
  ok?: boolean
  value?: SessionPanelValue
  error?: string
}
