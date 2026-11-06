/**
 * The host services the skin reads, as the skin needs them (D3).
 *
 * Each interface declares only the members the skin actually touches, with the
 * meaning it gives them; the host's own types are wider and are not shipped
 * here, so this file is the contract a host upgrade is checked against. These
 * shapes were read off the host build (0.2.1-alpha.1) and are exercised by the
 * end-to-end lane (D87).
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

/** The session list's own snapshot: every row's summary. */
export interface HostSessionListSnapshot {
  /** `pending` until the host's list has answered; the readers wait for `ready`. */
  phase?: string
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
  /** `pending` until the host's list has answered; the readers wait for `ready`. */
  phase?: string
  items: HostWorkspaceRow[]
  archivedSessionIds: string[]
}

/** One workspace: its identity, its name, where it lives, and the sessions under it. */
interface HostWorkspaceRow {
  workspaceId: string
  title: string
  path: string
  sessionIds: string[]
}

/** The `workspaces` service: the list, and taking one session back out of the archive. */
export interface HostWorkspacesService {
  list: HostSnapshotSource<HostWorkspaceListSnapshot>
  /** Take a session out of the archive; it rejects when the host refuses. */
  unarchiveSession(id: string): Promise<unknown>
}

/** Session-list grouping: sibling Workspace sections, a Workspace tree, or one flat list. */
export type HostSessionGroupBy = 'workspace' | 'workspace-tree' | 'flat'

/** Which archived rows the host's tree shows: `default` hides them, `show` keeps them among the others, `only` shows nothing else. */
export type HostArchivedFilter = 'default' | 'show' | 'only'

/** The workspace browser's view state, as the host's own view menu reads it. */
export interface HostWorkspaceViewSnapshot {
  groupBy: HostSessionGroupBy
  /** Absent in pre-filter snapshots; the host reads it as `default`. */
  archivedFilter?: HostArchivedFilter
}

/**
 * The workspace browser's viewing store: the host registers it under
 * `sidebar.workspaces` with a `create` that answers the one instance its
 * browser renders from, so a write here is the view menu's own write. The skin
 * reads the filter and grouping from `getSnapshot` and drives both through
 * `actions`; the host build these shapes were read on is 0.2.1-rc.2.
 */
export interface HostWorkspaceViewStore {
  getSnapshot(): HostWorkspaceViewSnapshot
  actions: {
    setGroupBy(mode: HostSessionGroupBy): void
    setArchivedFilter(filter: HostArchivedFilter): void
  }
}

/** One shortcut row: its command id, its label, its keycaps and its aliases. */
export interface HostShortcutRow {
  id: string
  label?: string
  /** The keycaps the command answers to; empty where the host names none. */
  keys: string[]
  aliases?: string[]
}

/** The `shortcuts` service: the command catalog and the fixed one. */
export interface HostShortcutsService {
  catalog: HostSnapshotSource<HostShortcutRow[]>
  fixedCatalog: HostSnapshotSource<HostShortcutRow[]>
}

/**
 * The `slots` service: what is registered under a key, and how a plugin adds its
 * own. `inject` waits for the host to declare a slot and `register` hands one
 * entry over, each answering the function that takes it back (D42).
 */
export interface HostSlotsService {
  entries(key: string): HostSlotRegistration[]
  /** The entries a list slot renders: one per id, the winner of each, as its owner reads them. */
  entriesOfSlot(key: string): HostSlotRegistration[]
  inject(key: string, callback: () => (() => void) | void): () => void
  register(options: HostSlotOptions, component: unknown): () => void
}

/** One entry's own declaration: the slot it fills, the key or id it stands under, and where it stands among the others. */
export interface HostSlotOptions {
  name?: string
  id?: string
  key?: string
  order?: number
  priority?: number
  locale?: string
  label?(): string
}

/** One registered slot entry: how it was declared, and the store it hands out. */
interface HostSlotRegistration {
  /** A label is a string or a thunk the owner re-reads on every projection, so it follows the locale. */
  options: { id?: string, label?: string | (() => string), priority?: number }
  store?: { create(): HostSlotStore }
}

/** One customizable panel, as the sidebar's More menu hands it to its rows; Plugins is never one. */
export interface HostPanelActionEntry {
  id: string
  label: string
  pinned: boolean
  active?: boolean
}

/** The owner props of a row in the sidebar's More menu (`sidebar.panellist.actions`). */
export interface HostPanelActionsProps {
  /** Customizable panels in the sidebar's own order. */
  entries: readonly HostPanelActionEntry[]
  /** Open a panel by id; the sidebar does the selecting. */
  onOpen(id: string): void
  /** Close the More menu. */
  onDismiss(): void
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
  /** The installed package's version, when its manifest declares one. */
  version?: string
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

/** One session's composer input: its draft, writing it back, and the actions a composer control presses. */
export interface HostConversationInput {
  state: HostSnapshotSource<{ draft: string }>
  setDraft(draft: string): void
  focus(): void
  /**
   * The composer's own action face (read on 0.2.2-rc.1): `submit` is the press
   * the composer's own send button makes, over whatever draft the input holds.
   */
  actions?: {
    submit?(): void
    addAttachments?(ids: string[]): void
  }
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

/**
 * The host's own group id for its official provider: that group is the picker's
 * default rather than a choice, so it carries no display name of its own
 * (`features/model/`) and a stored quick-provider id for it is dropped
 * (contracts/prefs.ts).
 */
export const OFFICIAL_MODEL_GROUP = 'deepseek-official'

/**
 * The host's group id for the signed-in account route. The API-key route's
 * catalog is empty while no key is configured, so this group leads the picker's
 * first level in that state (`features/model/level-one.ts`).
 */
export const ACCOUNT_MODEL_GROUP = 'deepseek-account'

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
  /**
   * The host's own id for this call, on both stages. The host draws one row
   * element per call and hands it to the next call on the same file, so the id
   * is what tells the file's calls apart on one element
   */
  callId?: string
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
interface HostSessionStatus {
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
interface HostSessionProjectionValues {
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
 * What the session remote's rename answers: whether it worked, and the title it
 * accepted, with the event sequence that carries it. The host normalizes the
 * text, so `value.title` is what the row and the header will show.
 */
export interface HostSessionRenameAnswer {
  ok?: boolean
  value?: { title?: string, seq?: number }
  error?: { message?: string }
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

/**
 * What a fork takes (read on 0.2.2-rc.1, the host's own branch button): the
 * source session, the inclusive event boundary the child keeps — the latest
 * completed turn when omitted — and whether its title carries the source's.
 */
export interface HostSessionForkRequest {
  sessionId: string
  atSeq?: number
  increaseTitle?: boolean
  onCreated?(childId: string): void
}

/** The `sessions` service: the list, one session's binding, and a refresh. */
export interface HostSessionsService {
  list: HostSnapshotSource<HostSessionListSnapshot>
  binding(id: string): HostSessionBinding | undefined | null
  /**
   * Copy the source's prefix into a new session and answer its id. It refuses
   * a boundary that is not an event of the source, so the cut a feature takes
   * has to be one the log holds.
   */
  fork?(request: HostSessionForkRequest): Promise<string>
  /** Pull the list again; the host's own single-flight refresh, so a pull under way is reused. */
  refresh(): Promise<unknown>
}

/**
 * One session's binding: the session itself, the live event feed the mascot
 * reads to see compaction start and finish, and the binding's own context.
 */
export interface HostSessionBinding {
  session?: HostSession
  eventSource?: HostSnapshotSource<{ entries: HostFeedEntry[], change: HostFeedChange }>
  /** The binding's own context, which its services are read through. */
  ctx: HostServiceLookup
}

/** What the feed's last change was: whether the compaction list was replaced, or one entry arrived. */
export interface HostFeedChange {
  kind: string
  entries?: HostFeedEntry[]
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
interface HostCommandResult {
  ok?: boolean
  value?: { matched?: boolean, [field: string]: unknown }
}

/** The shell's `uiSession`: which session is selected, and how it is doing. */
export interface HostUiSessionService {
  current?: {
    value?: { key?: unknown }
    /** Main-view identity changes, exposed by Desktop 0.2.1-rc.5. */
    subscribe?(listener: () => void): () => void
  }
  sessionStatus?: HostSnapshotSource<HostSessionStatusSnapshot>
}

/** ui-workspace's session menu slot props on Desktop 0.2.1-rc.5. */
export interface HostSessionMenuProps {
  sessionId: string
  useMenuOpenState?(): readonly [boolean, (open: boolean) => void]
}

/** The shell's `uiWorkspace`: open one session as a single UI navigation action. */
export interface HostUiWorkspaceService {
  openSession(id: string): void
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
interface HostConversationBinding {
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
  /**
   * The loaded window's own nodes, which the host's rows render from (read on
   * 0.2.2-rc.1). A node's key is the flow row's `data-chat-node-key`, and a
   * reader's message node carries the event `seq` in its data.
   */
  nodes?: { values?(): HostChatNode[] }
}

/** One loaded node of the chat timeline: its key, its kind, and the data its renderer reads. */
export interface HostChatNode {
  key: string
  kind: string
  anchorSeq?: number
  /** A reader's message carries `seq`; every renderer's own payload rides the rest. */
  data?: { seq?: unknown, messageId?: unknown, content?: unknown, [field: string]: unknown }
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
interface HostChatTimeline {
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
interface HostStep {
  data: { get(kind: string): HostAssistantStep | undefined }
}

/**
 * One block of a running or settled assistant step: its kind, and the text the
 * two kinds the host streams text into carry as it arrives.
 */
export interface HostStepBlock {
  kind: string
  /** The block's text so far, on a reasoning or an answer block. */
  text?: string
}

/** A running or settled assistant step: its status, its number in the turn, its blocks and its usage. */
export interface HostAssistantStep {
  status?: string
  step?: number
  blocks: HostStepBlock[]
  /** The step's own token usage, once the host reports it. */
  usage?: { outputTokens?: number, [field: string]: unknown }
}

/**
 * A tool call the host reports as running, with the turn it belongs to: the
 * call's own block, carrying the name and the arguments it has received so far
 * (the waiting line names the file a call works on from it).
 */
export interface HostRunningCall extends HostChatBlock {
  turn: number
}

/** The `locale` service: a namespace's translate seat, and its raw resolver. */
export interface HostLocaleService {
  bind(namespace: string): HostText
  /** Listen to a language switch; the function it returns stops listening. */
  subscribe?(listener: () => void): () => void
  resolveText?(value: unknown, params?: Record<string, string | number>): unknown
}

/**
 * The host's settings-form service (`configForms`, D75): one form per
 * namespace, plus the catalogue of namespaces it serves.
 */
export interface HostConfigFormsService {
  get(namespace: string): HostConfigForm | undefined | null
  /** The catalogue of served namespaces; it loads on demand. */
  describe?(): HostSnapshotSource<HostFormsDescription> & { ensure?(): unknown }
}

/** What the form service says it serves: one entry per served namespace. */
interface HostFormsDescription {
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
interface HostConfigSnapshot {
  status?: string
  value?: unknown
}

/** A host locale namespace's translate seat (`locale.bind(namespace)`). */
export type HostText = (key: string, params?: Record<string, string | number>) => string

/**
 * The identity one account call carries, which the Host forwards to the
 * Platform as its client headers. The Remote takes it as the method's own
 * argument and the Host refuses a call whose argument fields do not match its
 * descriptor, so a call without it never reaches the Platform.
 */
export interface HostAccountClient {
  /** The calling client build's version. */
  version: string
  /** The UI language in effect when the call was made. */
  locale: string
  /** Seconds east of UTC, as `-new Date().getTimezoneOffset() * 60`. */
  timezoneOffsetSeconds: number
}

/** The account service (`remote.account`): the profile read, and the state stream. */
export interface HostAccountService {
  getProfile(client: HostAccountClient): Promise<HostAccountAnswer>
  watch(signal: AbortSignal): AsyncIterable<HostAccountFrame>
}

/** The profile read's answer: the profile, or nothing when no credential is stored. */
export interface HostAccountAnswer {
  ok?: boolean
  value?: HostAccountProfile
}

/** One account profile: `ready` once its platform answered, with the name, contact and picture. */
interface HostAccountProfile {
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

/** The permission catalog (`permissionPresets` namespace): the options and the default. */
export interface HostPermissionCatalogAnswer {
  ok?: boolean
  value?: { options?: HostPermissionOption[], defaultPreset?: string }
}

/** One permission preset the host serves, including a third-party plugin's. */
export interface HostPermissionOption {
  value: string
  name?: string
  description?: string
}

/**
 * The session statistics projection: what the context panel's figures come
 * from, with the milliseconds each phase took and the tokens it produced. A
 * face that exists carries all of them; the panel reads zero as "no such row".
 */
export interface HostSessionStatsProjection {
  /** Distinct turns with a closed step, and closed steps: the host row's two counts. */
  turns: number
  steps: number
  llmMs: number
  toolMs: number
  ttftMs: number
  ttftSteps: number
  decodeMs: number
  decodeTokens: number
  dialog?: unknown
}

/** The token usage projection: the same session's billed tokens, by bucket. */
export interface HostTokenUsageProjection {
  uncachedInputTokens: number
  cacheReadTokens: number
  cacheWriteTokens: number
  outputTokens: number
}

/**
 * The context-pressure projection: the context meter's own reading. The host
 * works out the share of the route's window the session has taken and its meter
 * paints it; the skin draws the same number on the ring of its own
 * (features/context-stats/session-stats.ts). `projectedTokens` is what the next
 * request is expected to carry and stands over `pressureTokens` when both are
 * served.
 */
export interface HostContextPressureProjection {
  projectedTokens?: number
  pressureTokens?: number
  contextWindow?: number
}
