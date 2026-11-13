/** The command invocation facts the details rail reads from host events (D94). */
const COMMAND_TOOLS = new Set(['bash', 'pwsh', 'terminal_send'])
const PROCESS_KINDS = new Set(['bash', 'pwsh', 'pty-send'])

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

export interface PanelInvocation {
  process: boolean
  background: boolean
  label: string
}

export function panelInvocation(name: unknown, value: unknown): PanelInvocation {
  const args = panelArguments(value)
  const process = typeof name === 'string' && COMMAND_TOOLS.has(name)
  const label = [args?.description, args?.command, args?.text].find(part => typeof part === 'string' && part !== '')
  return { process, background: args?.run_in_background === true, label: typeof label === 'string' ? label : '' }
}

/** Legacy logs may omit kind; their registry id still carries the producer namespace. */
export function isPanelProcess(id: string, kind: unknown, invocation?: PanelInvocation) {
  return invocation?.process === true || (typeof kind === 'string' ? PROCESS_KINDS.has(kind) : /^(?:bash|pwsh|pty-send)-/.test(id))
}
