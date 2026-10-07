/**
 * The host services the skin reads, as the skin needs them (D44).
 *
 * Each interface declares only the members the skin actually touches, with the
 * meaning it gives them; the host's own types are wider and are not shipped
 * here, so this file is the contract a host upgrade is checked against. The
 * build's version gate is `HOST_VERIFIED` in table.ts; these shapes were read
 * off the same build (0.2.1-alpha.1) and are exercised by the end-to-end lane
 * (D45).
 *
 * A service the host does not mount comes back `undefined` from `ctx.get`, so
 * every reader takes the value as possibly absent (D12) — that is the reason
 * these types are returned as `| undefined` rather than asserted.
 */

/** A host value that publishes snapshots and changes: sessions, projections, chat. */
export interface HostSnapshotSource<Snapshot> {
  getSnapshot(): Snapshot
  subscribe(listener: () => void): () => void
}

/** The session list's own snapshot: which session the shell shows. */
export interface HostSessionListSnapshot {
  current?: string | null
  [field: string]: unknown
}

/** The `sessions` service: the list, one session's binding, and a refresh. */
export interface HostSessionsService {
  list: HostSnapshotSource<HostSessionListSnapshot>
  binding(id: string): HostSessionBinding | undefined | null
  refresh(): unknown
}

/**
 * One session's binding: the session itself, and the live event feed the
 * mascot reads to see compaction start and finish.
 */
export interface HostSessionBinding {
  session?: HostSession
  eventSource?: HostSnapshotSource<{ entries: unknown[] }>
}

/** One session: its projections, which the skin reads by face name, and its command seat. */
export interface HostSession {
  projections?: {
    faceOf(name: string): HostSnapshotSource<unknown>
  }
  /** Run one of the host's own slash commands in this session (`/permission …`); nulls for a host without it. */
  command(text: string): Promise<HostCommandResult> | null | undefined
}

/** What a host slash command answers: whether it ran, and what it matched. */
export interface HostCommandResult {
  ok?: boolean
  value?: { matched?: boolean, [field: string]: unknown }
}

/** The shell's `uiSession`: which session is selected, and how it is doing. */
export interface HostUiSessionService {
  current?: { value?: { key?: unknown } }
  sessionStatus?: HostSnapshotSource<unknown>
}

/** The shell's `uiConversation`: one session's conversation binding. */
export interface HostUiConversationService {
  binding(id: string): HostConversationBinding
}

/**
 * One conversation's binding. `target('chat')` is the chat view's own data,
 * and the host builds it only for a subscriber or while the shell shows that
 * session's chat view.
 */
export interface HostConversationBinding {
  target(name: string): HostChatTarget | null | undefined
}

/** The chat view's data: the loaded window, its turns, and the turn navigator. */
export interface HostChatTarget {
  getSnapshot(): HostChatSnapshot | null | undefined
  subscribe(listener: () => void): () => void
  turnNavigation?: unknown
}

/** The chat snapshot: the assembled timeline, the legacy view of it, and the turn navigator. */
export interface HostChatSnapshot {
  timeline?: HostChatTimeline
  legacy?: { runningCalls?: HostRunningCall[] }
  /** The turn navigator's own list of the loaded window's turns. */
  navigation?: { items?(): unknown[] }
}

/** The timeline: its turns by number, and the id of the newest turn. */
export interface HostChatTimeline {
  turns: Map<number, HostTurn>
  newestTurnId?: string | null
}

/** One turn: its steps, in order, and its own number. */
export interface HostTurn {
  turn: number
  steps: HostStep[]
}

/** One step: the blocks it carries, by kind. */
export interface HostStep {
  data: { get(kind: string): HostAssistantStep | undefined }
}

/** A running or settled assistant step: its status, its number in the turn, and its blocks. */
export interface HostAssistantStep {
  status?: string
  step?: number
  blocks: { kind: string }[]
}

/** A tool call the host reports as running, with the turn it belongs to. */
export interface HostRunningCall {
  turn: number
}

/** The `locale` service: a namespace's translate seat, and its raw resolver. */
export interface HostLocaleService {
  bind(namespace: string): HostText
  resolveText?(key: string, params?: Record<string, string | number>): unknown
}

/** A host locale namespace's translate seat (`locale.bind(namespace)`). */
export type HostText = (key: string, params?: Record<string, string | number>) => string
