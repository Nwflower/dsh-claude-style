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

/** The session list's own snapshot: which session the shell shows, and every row's summary. */
export interface HostSessionListSnapshot {
  current?: string | null
  ids: string[]
  byId: Record<string, HostSessionSummary>
  /** Per-session projection values the list carries, such as a session's subagent catalog. */
  projectionsBySession: Record<string, { values?: { subagentCatalog?: unknown[] } }>
}

/** One row of the session list: whether it runs, and whether it is a subagent's. */
export interface HostSessionSummary {
  running?: boolean
  origin?: string
}

/** The live status map (`uiSession.sessionStatus`): how each session is doing right now, by id. */
export interface HostSessionStatusSnapshot extends Iterable<[string, HostSessionStatus]> {
  get(id: string): HostSessionStatus | undefined
  values(): IterableIterator<HostSessionStatus>
}

/** One session's live status: whether it runs, waits on the reader, or finished unread. */
export interface HostSessionStatus {
  running?: boolean
  pendingInteraction?: unknown
  completionUnread?: boolean
}

/** A subagent as the session list catalogues it: its id, and the ones it started. */
export interface HostSubagentEntry {
  id: string
}

/**
 * One event of a session's feed, of the four types the skin reads: a turn
 * ending, a tool result, and a compaction starting or finishing. A host that
 * adds another type is ignored by the reader, which compares the type first.
 */
export type HostSessionEvent =
  | { type: 'turn/end', data: { reason: { kind?: string } } }
  | { type: 'tool/result', data: { message: { isError?: boolean }, error?: { name?: string } } }
  | { type: 'compaction/start', data: { compactionId: string } }
  | { type: 'compaction/end', data: { compactionId: string, error?: unknown } }

/** One entry of a feed window: a live event, or the host's own bookkeeping. */
export interface HostFeedEntry {
  type: string
  event: HostSessionEvent
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
  eventSource?: HostSnapshotSource<{ entries: HostFeedEntry[] }>
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
  sessionStatus?: HostSnapshotSource<HostSessionStatusSnapshot>
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
  /** The assembled timeline; the host builds it before publishing the snapshot. */
  timeline: HostChatTimeline
  legacy?: { runningCalls?: HostRunningCall[] }
  /** The turn navigator's own list of the loaded window's turns. */
  navigation?: { items?(): unknown[] }
}

/** The timeline: its turns by number, the order they come in, and the newest turn's id. */
export interface HostChatTimeline {
  turns: Map<number, HostTurn>
  turnOrder: number[]
  newestTurnId?: string | null
}

/** One turn: its steps in order, its own number, whether it is still open, and how it ended. */
export interface HostTurn {
  turn: number
  status?: string
  steps: HostStep[]
  /** When the turn started, on the host's clock. */
  start?: { time: number }
  /** Present once the turn closed: when it did, and the host's own reason for it. */
  end?: { time: number, data: { reason: { kind?: string } } }
}

/** One step: the blocks it carries, by kind. */
export interface HostStep {
  data: { get(kind: string): HostAssistantStep | undefined }
}

/** A running or settled assistant step: its status, its number in the turn, its blocks and its usage. */
export interface HostAssistantStep {
  status?: string
  step?: number
  blocks: { kind: string }[]
  /** The step's own token usage, once the host reports it. */
  usage?: { outputTokens?: number, [field: string]: unknown }
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

/**
 * The host's settings-form service (`configForms`, D10): one form per
 * namespace, plus the catalogue of namespaces it serves.
 */
export interface HostConfigFormsService {
  get(namespace: string): HostConfigForm | undefined | null
  /** The catalogue of served namespaces; it loads on demand. */
  describe?(): HostSnapshotSource<HostFormsDescription> & { ensure?(): unknown }
}

/** What the form service says it serves: one entry per served namespace. */
export interface HostFormsDescription {
  view?: { namespaces?: { ns?: unknown }[] }
}

/** One namespace's form: its current values, their changes, and a field write. */
export interface HostConfigForm {
  getSnapshot(): HostConfigSnapshot
  /** Write one field; the host answers with a promise, or a plain boolean when it settles at once. */
  set(field: string, value: unknown): Promise<unknown> | boolean | undefined
  subscribe?(listener: () => void): () => void
}

/** One form snapshot: whether its controller is ready, and the values it holds. */
export interface HostConfigSnapshot {
  status?: string
  value?: unknown
}

/** A host locale namespace's translate seat (`locale.bind(namespace)`). */
export type HostText = (key: string, params?: Record<string, string | number>) => string
