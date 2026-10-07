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

/** One row of the session list: what the search palette and the home figures read of it. */
export interface HostSessionSummary {
  id: string
  /** Whether it runs right now (the mascot's crowd count). */
  running?: boolean
  /** `subagent` for a child session, which the palette leaves out. */
  origin?: string
  /** A placeholder the host never prompted. */
  blank?: boolean
  displayTitle: string
  updatedAt: number
}

/** The workspace list (`workspaces.list`): the workspace rows, and which sessions are archived. */
export interface HostWorkspaceListSnapshot {
  items: HostWorkspaceRow[]
  archivedSessionIds: string[]
}

/** One workspace: its identity, its name, where it lives, and the sessions under it. */
export interface HostWorkspaceRow {
  workspaceId: string
  title: string
  path: string
  sessionIds: string[]
}

/** The `workspaces` service: the list, and taking one session back out of the archive. */
export interface HostWorkspacesService {
  list: HostSnapshotSource<HostWorkspaceListSnapshot>
  unarchiveSession(id: string): unknown
}

/** One shortcut row: its command id, its label, its keycaps and its aliases. */
export interface HostShortcutRow {
  id: string
  label?: string
  keys?: string[]
  aliases?: string[]
}

/** The `shortcuts` service: the command catalog and the fixed one. */
export interface HostShortcutsService {
  catalog: HostSnapshotSource<HostShortcutRow[]>
  fixedCatalog: HostSnapshotSource<HostShortcutRow[]>
}

/** The `slots` service: what is registered under a key, and how a plugin adds its own. */
export interface HostSlotsService {
  entries(key: string): HostSlotRegistration[]
  register(key: string, id: string, component: unknown): unknown
  inject?(key: string, id: string, component: unknown): unknown
}

/** One registered slot entry: how it was declared, and the store it hands out. */
export interface HostSlotRegistration {
  options: { id?: string }
  store?: { create(): HostSlotStore }
}

/** A slot's own store, as far as the palette presses it (the shortcut reference). */
export interface HostSlotStore {
  actions: { open(): void, search(query: string): void }
}

/** The profile manager's plugin inventory: whether it can manage anything at all. */
export interface HostInventoryAnswer {
  ok?: boolean
  error?: { message?: string }
  value: { managementAvailable?: boolean }
}

/** One plugin bundle the profile manager lists; a bundle that failed to load carries `error`. */
export interface HostPluginBundle {
  name: string
  error?: unknown
  /** The bundle's own description, for a bundle whose manifest names none. */
  description?: string
  /** The bundle's own manifest text, which the host resolves through the locale service. */
  meta?: { title?: unknown, description?: unknown, icon?: string }
}

/** The plugin manager's answer to `listBundles()`. */
export interface HostBundleListAnswer {
  ok?: boolean
  error?: { message?: string }
  value: HostPluginBundle[]
}

/** One skill of the open session's catalog. */
export interface HostSkill {
  name: string
  description?: string
}

/** The skill catalog's answer (`remote.skills.list`). */
export interface HostSkillListAnswer {
  ok?: boolean
  error?: { message?: string }
  value: { skills: HostSkill[] }
}

/**
 * A session binding's own context, which the conversation service keys its
 * input by; the plugin's `HostContext` satisfies it by shape.
 */
export interface HostServiceLookup {
  get(name: string): any
}

/** The `conversation` service: the composer input of one session's context. */
export interface HostConversationService {
  input: { for(ctx: HostServiceLookup): HostConversationInput }
}

/** One session's composer input: its draft, and writing it back. */
export interface HostConversationInput {
  state: HostSnapshotSource<{ draft: string }>
  setDraft(draft: string): void
  focus(): void
}

/** The `modelDirectories` service: one session's model directory, by session id. */
export interface HostModelDirectoriesService {
  directoryFor(sessionId: string): HostModelDirectory
}

/**
 * One session's model directory: the instance carries the load and the pick,
 * and its reactive state hangs off the store the host hands its own menu.
 */
export interface HostModelDirectory {
  store?: HostSnapshotSource<HostModelCatalogSnapshot>
  load?(): Promise<unknown> | undefined
  /** Pick a provider and model; it rejects on a failed selection, which the host's toast reports. */
  select(selection: { provider: string, model: string, reasoningEffort?: string }): Promise<unknown> | undefined
}

/** The model catalog's snapshot: the provider groups, what is picked, and how the load is doing. */
export interface HostModelCatalogSnapshot {
  groups: HostModelGroup[]
  current: { provider: string, model: string, reasoningEffort?: string } | null
  /** The store's load state: `idle` before the first load, `ready` once it answered. */
  status?: string
}

/** One provider group: its id, its display name, and its models. */
export interface HostModelGroup {
  id: string
  name?: string
  models: HostModelEntry[]
}

/** One model: its id, its name, its own description text, and the reasoning metadata the effort control reads. */
export interface HostModelEntry {
  id: string
  name: string
  /** The host's own description line, which the plugin's copy document overrides when it has one. */
  description?: string
  reasoning?: HostModelReasoning
}

/** How a model reasons: its default effort, and the efforts it offers. */
export interface HostModelReasoning {
  defaultEffort?: string
  efforts: { id: string, name: string }[]
}

/**
 * One block of a turn's timeline, as the tool rows read it: a running call's
 * own block (`phase`, `name`, `argsRaw`) or the settled node the result
 * brought back (`kind`, `call`, `meta`, `isError`, `error`, `content`). The
 * members are optional because the two stages carry different ones.
 */
export interface HostChatBlock {
  /** Set on a settled node; a running block carries none. */
  kind?: string
  phase?: string
  name?: string
  argsRaw?: string
  /** The call a settled node reports: its tool name and the raw arguments. */
  call?: { name: string, argsRaw: string }
  /** Whether the call failed. */
  isError?: boolean
  /** The host's own error, when the call failed. */
  error?: { code?: string, message?: string, name?: string }
  /** What the tool reported, as the row's hunks read it. */
  meta?: unknown
  /** A settled result's blocks. */
  content?: { type?: string, text?: string }[]
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

/** One row of the remote session list (`remote.session.list`): its projections, and when it moved. */
export interface HostSessionRow {
  updatedAt: number
  projections?: { values?: HostSessionProjectionValues }
}

/**
 * The projection values a session row carries, as the home panel sums them:
 * whether the session is blank, when it was last prompted, what it has spent,
 * and which model it is on.
 */
export interface HostSessionProjectionValues {
  sessionListMetadata?: { blank?: boolean, lastPromptAt?: number }
  tokenUsage?: {
    uncachedInputTokens?: number
    outputTokens?: number
    cacheReadTokens?: number
    cacheWriteTokens?: number
  }
  modelSelection?: { next?: { model?: string }, lastUsed?: { model?: string } }
}

/** What the remote session list answers: whether it worked, and the rows. */
export interface HostRemoteListAnswer {
  ok?: boolean
  value?: { items?: HostSessionRow[] }
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
 * One session's binding: the session itself, the live event feed the mascot
 * reads to see compaction start and finish, and the binding's own context.
 */
export interface HostSessionBinding {
  session?: HostSession
  eventSource?: HostSnapshotSource<{ entries: HostFeedEntry[] }>
  /** The binding's own context, which its services are read through. */
  ctx: HostServiceLookup
}

/** One session: its projections, which the skin reads by face name, its state, and its command seat. */
export interface HostSession {
  projections?: {
    faceOf(name: string): HostSnapshotSource<unknown>
  }
  /** The session's own state: `open` while the shell has it mounted. */
  getSnapshot?(): { openState?: string }
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
  navigation?: { items?(): HostLoadedTurn[] }
}

/** One turn of the loaded window, as the chat snapshot's turn navigation lists them. */
export interface HostLoadedTurn {
  turn: number
  prompt: string
}

/** One turn of the whole-log outline (the `turnOutline` projection), with the sequence it arrived in. */
export interface HostOutlineTurn {
  turn: number
  seq: number
  prompt?: string
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

/** The account service (`remote.account`): the profile read, and the state stream. */
export interface HostAccountService {
  getProfile(): Promise<HostAccountAnswer>
  watch(signal: AbortSignal): AsyncIterable<HostAccountFrame>
}

/** The profile read's answer: the profile, or nothing when no credential is stored. */
export interface HostAccountAnswer {
  ok?: boolean
  value?: HostAccountProfile
}

/** One account profile: `ready` once its platform answered, with the name, contact and picture. */
export interface HostAccountProfile {
  status?: string
  value?: { name?: string, contact?: string, avatarUrl?: string }
  avatarUrl?: string
  /** The host some platforms answer with: the profile nested under its own key. */
  profile?: HostAccountProfile
}

/** One frame of the account state stream: whether a credential is stored, and how a sign-in is doing. */
export interface HostAccountFrame {
  status?: string
  attempt?: { phase?: string, id?: string }
}

/**
 * A handle from `remote.$stream`: an async iterable stepped by hand, which
 * reopens itself across reconnects and is disposed by its owner.
 */
export interface HostStream<Frame> {
  dispose(): void
  [Symbol.asyncIterator](): { next(): Promise<HostStreamStep<Frame>> }
}

/** One step of a stream: the frame, whether the stream ended, and the frame's own acknowledgement. */
export interface HostStreamStep<Frame> {
  done?: boolean
  value: { value: Frame, accept?(): void }
}
