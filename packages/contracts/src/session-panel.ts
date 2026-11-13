/**
 * The session overview panel's data (D94): one answer describes a session's
 * Environment, Context, Outputs, Changes and Background tasks, folded on the
 * host from its own projections, session log and services. The browser half
 * renders sections in that order and leaves out the ones with nothing to show.
 */

/** One Git checkout the panel names. */
export interface PanelCheckout {
  /** Canonical path of the checkout's top-level directory. */
  root: string
  /** Checked-out branch, or null while HEAD is detached. */
  branch: string | null
  /** Whether the checkout is a linked worktree of another checkout's repository. */
  linked: boolean
  /** Abbreviated commit HEAD names, or null while the branch has none. */
  commit: string | null
  /** `owner/name` parsed from the origin remote, or null when it names no code-host repository. */
  repository: string | null
}

/** Where the session works: the machine, the directory, and the checkout it sits in. */
export interface PanelEnvironment {
  /** The session's working directory, or the harness's default directory when the session recorded none. */
  directory: string
  /** The reader's home directory, so the panel can shorten the path it shows. */
  home: string
  /** The OS user name the host runs as. */
  user: string
  /** The checkout containing `directory`, when Git reports one. A directory that is no checkout answers null, and the panel then names the folder alone. */
  checkout: PanelCheckout | null
}

/** The context window's occupancy and its heuristic composition. */
export interface PanelContext {
  /** Tokens the next request is expected to take. */
  used: number
  /** The route's context window. */
  window: number
  /** Tokens the system prompt takes. */
  system: number
  /** Tokens the tool schemas take. */
  tools: number
  /** Tokens the conversation takes. */
  messages: number
  /** Source-attributed heuristic parts, before calibration to provider occupancy. */
  parts?: readonly PanelContextPart[]
}

/** Context categories recovered from the request header and retained message sources (D94). */
export type PanelContextKind = 'messages' | 'tools' | 'mcp' | 'system' | 'memory' | 'skills' | 'other'

export interface PanelContextPart {
  kind: PanelContextKind
  tokens: number
}

/** The host token meter's aggregate projections, before source attribution. */
export interface PanelContextProjections {
  contextPressure?: { projectedTokens?: number, pressureTokens?: number, contextWindow?: number }
  contextBreakdown?: { systemTokens?: number, toolsTokens?: number, messageTokens?: number }
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

/** One change request bound to the session, with the latest status the host knows. */
export interface PanelChange {
  /** Web URL of the change request. */
  url: string
  /** Change request number, or null when the URL cannot be parsed. */
  number: number | null
  /** `owner/name` of the repository, or null. */
  repository: string | null
  /** Title from the code host, or null before the first poll. */
  title: string | null
  /** Lifecycle state, or null before the first poll. */
  state: 'open' | 'closed' | 'merged' | null
  /** Whether the change request is a draft. */
  draft: boolean
  /** Checks roll-up, or null before the first poll. */
  checks: 'none' | 'pending' | 'success' | 'failure' | null
  /** Checks that failed, and the complete check count. */
  failing: number
  total: number
}

/** One command execution or other registered task of the session (D94). */
export interface PanelJob {
  id: string
  label: string
  category: 'process' | 'task'
  /** Unknown means the retained host record carries no creating invocation. */
  execution: 'foreground' | 'background' | 'unknown'
  /** Only a real registry id can be passed to the host's stop controller. */
  controllable: boolean
  status: 'running' | 'stopping' | 'completed' | 'killed' | 'failed'
  startedAt: number
  finishedAt?: number
  /** The job's last progress line, when it reported one. */
  progress?: string
  /** The terminal reason the registry recorded (`exit code: 3`), when it settled. */
  detail?: string
}

/** One direct subagent session of the session. */
export interface PanelSubagent {
  /** The child session's identity, for its own panel and navigation. */
  id: string
  label: string
  /** Which creation mode the child was started with. */
  mode: string
  /** Milliseconds the child's closed turns took, from its own timing projection. */
  settledMs: number
  /** Start of the child's open turn while one runs, or null when it has none. */
  activeSince: number | null
  /** Whether the child has a turn open right now. */
  running: boolean
  /** Whether the child's latest closed turn completed normally. */
  completed: boolean
  /** Tokens the child's own log reports, across every bucket. */
  tokens: number
}

/** One teammate the session's Agent Team roster holds. */
export interface PanelTeamMember {
  id: string
  name: string
  role: 'lead' | 'teammate'
  /** Durable lifecycle phase the projection records. */
  phase: string
  /** Whether a live agent is driving the teammate; null when it already settled. */
  running: boolean | null
}

/** One non-deleted task of the session's Agent Team board. */
export interface PanelTeamTask {
  id: string
  subject: string
  status: string
  /** The member the task shows as its owner, when one holds it. */
  ownerName?: string
}

/** Work owned by the conversation: command executions, registered tasks, subagents and team. */
export interface PanelBackground {
  jobs: readonly PanelJob[]
  subagents: readonly PanelSubagent[]
  /** The Team rooted at this session, or null when the session leads none. */
  team: { members: readonly PanelTeamMember[], tasks: readonly PanelTeamTask[] } | null
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

/** Everything the panel shows about one session. */
export interface SessionPanelValue {
  environment: PanelEnvironment | null
  context: PanelContext | null
  outputs: readonly PanelOutput[]
  changes: readonly PanelChange[]
  background: PanelBackground
  /** The session's own figures, absent where the host reports none. */
  stats?: PanelStats | null
}

/** One background job's retained output, read on demand while the panel is open. */
export interface PanelJobOutput {
  /** The retained output, oldest first, capped to the panel's own length. */
  text: string
  /** Whether the registry dropped bytes this reader could no longer have. */
  lossy: boolean
  /** The job's status when the output was read. */
  status: string
}

/** The route's answer: the panel value, or the reason the host could not build it. */
export interface SessionPanelAnswer {
  ok?: boolean
  value?: SessionPanelValue
  error?: string
}

/** The route's answer when `?job=` asks for one job's output instead of the panel. */
export interface PanelJobAnswer {
  ok?: boolean
  value?: PanelJobOutput | null
  error?: string
}

/**
 * `owner/name` of a code-host repository, from a Git remote URL.
 *
 * The panel names a repository the way its code host does. The URL may be the
 * scp-like form Git prints (`git@host:owner/name.git`), a scheme URL, or a local
 * path; only the first two name a code host pair.
 * @param remote - the remote URL, or null when the checkout has no origin.
 * @returns the slug, or null for a local path remote or a URL naming no pair.
 */
export function repositorySlug(remote: string | null): string | null {
  if (remote === null) return null
  let path = remote.trim()
  if (path === '') return null
  const scp = path.match(/^[^@/\s]+@[^:/\s]+:(.+)$/)
  if (scp !== null) path = scp[1]
  else {
    let parsed: URL
    try {
      parsed = new URL(path)
    } catch {
      // A filesystem path remote names no code host repository.
      return null
    }
    // A `file:` URL is another filesystem path, and a single-letter scheme is a
    // Windows drive; neither names a code host.
    if (!['http:', 'https:', 'ssh:', 'git:'].includes(parsed.protocol)) return null
    path = parsed.pathname
  }
  const parts = path.replace(/\.git$/i, '').split('/').filter(segment => segment !== '')
  if (parts.length < 2) return null
  return `${parts[parts.length - 2]}/${parts[parts.length - 1]}`
}
