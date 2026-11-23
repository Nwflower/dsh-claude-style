/**
 * The session log events the panel's context and outputs folds read (D112), in
 * the members they read, and the tool-call arguments as the log records them.
 */

/** One model-visible message, including producer attribution. */
export interface PanelMessage {
  role?: string
  content?: unknown
  source?: { callId?: unknown, kind?: string, form?: string }
  isError?: boolean
}

/** One raw session event, in the members the folds read. */
export interface PanelEvent {
  type?: string
  seq?: number
  time?: number
  surfaceOp?: 'append' | { startSeq: number, endSeq: number }
  data?: PanelMessage & {
    header?: {
      tools?: readonly { name: string }[]
      config?: { model?: unknown, provider?: unknown, maxTokens?: unknown }
    }
    files?: readonly { path?: unknown }[]
    callId?: unknown
    name?: unknown
    arguments?: unknown
    message?: PanelMessage
    error?: unknown
  }
}

/** Invalid recorded arguments belong to a failed call and carry no usable fields. */
export function panelArguments(value: unknown): Record<string, unknown> | null {
  if (typeof value !== 'string' || value === '') return null
  let parsed: unknown
  try {
    parsed = JSON.parse(value)
  } catch {
    // A partial or failed call may persist arguments that never parsed (D12).
    return null
  }
  return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed) ? parsed as Record<string, unknown> : null
}
