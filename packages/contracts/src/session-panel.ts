/**
 * The data of the skin's sections in the host's session panel (D112): one answer
 * describes a session's working directory, context, outputs and figures, folded on the
 * host from its own projections, session log and services. The browser half
 * renders each section from it and leaves out the ones with nothing to show.
 */

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
 * The source a context part is attributed to (D112, D104). The fold publishes these granular
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
  contextPressure?: { projectedTokens?: number, pressureTokens?: number, contextWindow?: number }
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

/** The session's own figures: the host's timing projection, its token usage, and the settled cost. */
export interface PanelStats {
  turns: number
  steps: number
  /** Model (llm) time and tool time, in milliseconds. */
  llmMs: number
  toolMs: number
  /** Time to first token, summed over steps. */
  ttftMs: number
  ttftSteps: number
  /** Decode time and the tokens it produced. */
  decodeMs: number
  decodeTokens: number
  uncachedInputTokens: number
  cacheReadTokens: number
  cacheWriteTokens: number
  outputTokens: number
  /** Settled cost in micro units of each currency, or null while none is known. */
  cost: { cny: number, usd: number } | null
}

/** Everything the skin's sections show about one session. */
export interface SessionPanelValue {
  /** The session's working directory, or the reader's home when the session recorded none; outputs resolve and open against it. */
  directory: string | null
  context: PanelContext | null
  outputs: readonly PanelOutput[]
  /** The session's own figures, absent where the host reports none. */
  stats?: PanelStats | null
}

/** The route's answer: the panel value, or the reason the host could not build it. */
export interface SessionPanelAnswer {
  ok?: boolean
  value?: SessionPanelValue
  error?: string
}
