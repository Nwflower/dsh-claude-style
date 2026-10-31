import { COMPOSER_CARD_SELECTOR, COMPOSER_INPUT_SELECTOR, COMPOSER_PLACEHOLDER_SELECTOR, COMPOSER_SELECTOR, COMPOSER_STACK_SELECTOR, COMPOSER_STATS_SELECTOR, COMPOSER_STAT_SELECTOR, COMPOSER_VARIANT_ATTRIBUTE, CONVERSATION_SCROLL_SELECTOR, CONVERSATION_SESSION_ATTRIBUTE, CONVERSATION_SESSION_SELECTOR, DIALOG_TRIGGER_SELECTOR, FOOT_AREA_SELECTOR, FOREGROUND_SELECTOR, MENU_ROLE_SELECTOR, PERMISSION_TRIGGER_SELECTOR, PHASE_ATTRIBUTE, RIGHTBAR_TOGGLE_SELECTOR, SIDEBAR_BRAND_SELECTOR, SIDEBAR_LOGO_ROW_SELECTOR, SIDEBAR_ROOT_SELECTOR, SIDEBAR_TOGGLE_SELECTOR, WINDOWS_MENU_SELECTOR } from '@dsh-claude-style/contracts/dom'
import type { HostAccountService, HostAssistantStep, HostBundleListAnswer, HostChatSnapshot, HostChatTarget, HostConfigFormsService, HostConversationService, HostInventoryAnswer, HostLocaleService, HostModelDirectoriesService, HostPluginBundle, HostServiceLookup, HostOutlineTurn, HostRunningCall, HostSession, HostSessionsService, HostSessionRenameAnswer, HostShortcutsService, HostSlotOptions, HostSlotsService, HostTurn, HostUiConversationService, HostUiSessionService, HostWorkspacesService, HostWorkspaceViewStore } from '@dsh-claude-style/contracts/services'
import { observeMatches, subscribeMutations } from './bus'
import { closestFrom } from './dom'

/**
 * The host's client context (cordis), handed to `apply` and to every feature.
 * Services come by name; their shapes are the host's own and stay untyped
 * here until the contract module types them (D3).
 */
export interface HostContext {
  /** The loader's fiber; its boot entry id names this plugin's settings namespace (D75). */
  readonly fiber?: { entry?: { id?: unknown } }
  /** A service by name, or undefined when the host carries none (D12). */
  get(name: string): HostValue
  /** Listen to a context event (`connection/reset`); the function it returns stops listening. */
  on?(name: string, listener: () => void): () => void
  /** Run `effect` now; the function it returns runs when the context is disposed. */
  effect(effect: () => () => void, label?: string): void
  /** Run `callback` in a scope once every named service exists; a host without it has no late services. */
  inject?(names: string[], callback: (scope: HostContext) => void): HostFiber
}

/**
 * A value read off a host service or snapshot: a session, a catalog group, a
 * chat node. Its shape is the host's own; the contract module types the ones
 * the skin reads by name (D3, `contracts/services.ts`).
 */
export type HostValue = any

/** A host locale namespace's translate seat (`locale.bind(namespace)`): a key and its parameters to text. */
export type { HostText } from '@dsh-claude-style/contracts/services'

/** The scope `inject` opened: disposing it runs the effects registered in it. */
export interface HostFiber {
  dispose(): void
}

/**
 * Whether `element` is still the document's first match: it is connected, it
 * matches itself, and no earlier sibling subtree holds a match. The sibling
 * walk is short for these seats (a header, a card, a footer), which the host
 * mounts once and replaces whole.
 */
function stillFirstMatch(element: Element, selector: string) {
  if (!element.isConnected || !element.matches(selector)) return false
  for (let node: Element | null = element; node !== null; node = node.parentElement) {
    for (let earlier = node.previousElementSibling; earlier !== null; earlier = earlier.previousElementSibling) {
      if (earlier.matches(selector) || earlier.querySelector(selector) !== null) return false
    }
  }
  return true
}

/** The batch count the one shared body watch has seen: every cached seat forgets its answer when this moves. */
let matchEpoch = 0
/** Whether the shared body watch is open. One is enough for every seat, and it is never closed. */
let matchEpochWatched = false

/** Open the one body watch the cached seats read: the first cacheFirstMatch call does it. */
function openMatchEpochWatch() {
  if (matchEpochWatched) return
  matchEpochWatched = true
  // The bump runs inside the batch's own callback: a reader that writes what the
  // frame paints asks for that timing (`beforePaint`, D40) and must see the
  // batch's nodes rather than the previous batch's answer (#189). This callback
  // moves a counter, so the earlier turn costs one addition.
  subscribeMutations(document.body, { subtree: true, childList: true, beforePaint: true }, () => {
    matchEpoch += 1
  })
}

/**
 * The first match of `selector`, resolved once and kept while it stays the
 * first match (D40): a pass re-reads it, and the document is queried again only
 * when the host replaced the element or mounted one before it. The answer is
 * the one a query gives — an earlier match invalidates the kept element.
 *
 * An answer of "nothing matched" is kept for the rest of the batch too. The
 * query walks the whole document, and the seats asked for here are absent on
 * most of the pages a pass runs over — the hero root on a conversation page,
 * the settings nav list away from the dialog — so a query re-issued per pass
 * paid a document walk for an answer that only the host's own mounting can
 * change.
 *
 * One body watch serves every cached seat, opened by the first reader and never
 * closed: a seat created inside `install()` would otherwise add a subscription
 * per enable, and the batch the watch hears is the only thing that can change a
 * kept answer. The watch moves an epoch rather than clearing each reader by
 * hand, so a reader that has not asked since the last batch drops its answer on
 * the next call.
 *
 * Exported for the seats one feature alone reads (a header, a slot, a meter):
 * the mechanism lives once, the selector stays with its reader.
 */
export function cacheFirstMatch<T extends Element>(selector: string) {
  openMatchEpochWatch()
  let kept: T | null = null
  let answered = false
  let seenEpoch = matchEpoch
  return () => {
    if (seenEpoch !== matchEpoch) {
      kept = null
      answered = false
      seenEpoch = matchEpoch
    }
    if (kept !== null && stillFirstMatch(kept, selector)) return kept
    if (kept === null && answered) return null
    kept = document.querySelector<T>(selector)
    answered = true
    return kept
  }
}

function cacheFirst<T extends Element>(selector: string) {
  return cacheFirstMatch<T>(selector)
}

/**
 * The host's access-mode trigger: the button its permission slot renders.
 * Every slot render site carries a `[data-slot="<key>"]` wrapper (D3), and
 * the skin inserts its own buttons inside that wrapper, so those are skipped.
 */
export const findAccessTrigger = cacheFirst<HTMLButtonElement>(PERMISSION_TRIGGER_SELECTOR)

/**
 * The host's hero-phase conversation root: the page before a session is chosen.
 * The composer reads it once per pass, and the home page's own features mount
 * against the same element.
 */
export const findHeroRoot = cacheFirst<HTMLElement>(`[${PHASE_ATTRIBUTE}="hero"]`)

/** The sidebar footer, where the account row and the plugin footer entries live. */
export const findFootArea = cacheFirst<HTMLElement>(FOOT_AREA_SELECTOR)

/**
 * The modal dialog the host has up, or null. The host portals its overlays onto
 * <body> — the settings panel a reader opens from the account menu among them —
 * so no scope narrower than the document reaches one. The wrapper that carries
 * such a panel is `role="presentation"`; the dialog inside it is what says a
 * surface of the reader's own is up.
 */
export const findHostModal = cacheFirst<HTMLElement>('[role="dialog"][aria-modal="true"]')

/**
 * The sidebar's own column. The skin's sidebar-side nodes live inside it, so a
 * sweep for its own strays is scoped here instead of the whole document; the
 * host mounts this column once and replaces it whole.
 */
export const findSidebarRoot = cacheFirst<HTMLElement>(SIDEBAR_ROOT_SELECTOR)

/**
 * The sidebar's brand row and its collapse toggle, and the desktop window's own
 * menu button beside them: the seats the surface switch and the header band are
 * placed against (features/surface, features/header-band). Each is absent on
 * most pages — no desktop window in a browser, no toggle in the collapsed rail —
 * so the answer is kept rather than queried per pass.
 */
export const findSidebarBrand = cacheFirst<HTMLElement>(SIDEBAR_BRAND_SELECTOR)
export const findSidebarToggle = cacheFirst<HTMLElement>(SIDEBAR_TOGGLE_SELECTOR)
/** The sidebar's top row, which the collapsed rail keeps as its mark's seat. */
export const findSidebarLogoRow = cacheFirst<HTMLElement>(SIDEBAR_LOGO_ROW_SELECTOR)
export const findWindowsMenu = cacheFirst<HTMLElement>(WINDOWS_MENU_SELECTOR)

/**
 * The right panel's own collapse control, while that panel is open. It hangs
 * from a transformed, clipped subtree, so the skin draws its own control in the
 * header's row and presses this one; the same read answers whether the panel is
 * open at all.
 */
export const findRightbarToggle = cacheFirst<HTMLElement>(RIGHTBAR_TOGGLE_SELECTOR)

/**
 * The open host menu card: the host portals its menus to `<body>`, and every
 * card the skin builds itself carries a `dsh-claude-` class (D3). The account
 * row and the hero menu ask this same question on every pass, so it is read
 * once here and kept until the page's structure changes — a menu opening or
 * closing is a node arriving or leaving (D40).
 */
export const findHostMenu = cacheFirst<HTMLElement>(`${MENU_ROLE_SELECTOR}:not([class*="dsh-claude-"])`)

/** The first open menu or modal dialog on the page, the host's or the skin's: the foreground a key or a pointer must not act behind. */
export const findForeground = cacheFirst<HTMLElement>(FOREGROUND_SELECTOR)

/**
 * The host's composer card — the element the skin's composer rules hang on —
 * and the placeholder its editor draws. The card's variant is the skin's own
 * marking (D9); every reader goes through these, so the selectors live once.
 */
const COMPOSER_CARD = COMPOSER_CARD_SELECTOR
const COMPOSER_PLACEHOLDER = COMPOSER_PLACEHOLDER_SELECTOR

/** The composer cards, kept current by the bus instead of queried every pass (D40). */
export function observeComposerCards() {
  return observeMatches<HTMLElement>(COMPOSER_CARD)
}

/** The composer placeholders, kept current by the bus (D40); the skin's synthetic one is a match too. */
export function observeComposerPlaceholders() {
  return observeMatches<HTMLElement>(COMPOSER_PLACEHOLDER)
}

export const findComposerCard = cacheFirst<HTMLElement>(COMPOSER_CARD)

/**
 * The host's model slot in the composer row: the box the host renders its own
 * model seat into. It is React's, and the skin only appends its own nodes
 * beside the host's root (features/model/seat-box.ts,
 * features/context-stats/meter-ring.ts), so both features read it here.
 */
const MODEL_SLOT = '[data-slot="conversation.input.model"]'

export const findModelSlot = cacheFirst<HTMLElement>(MODEL_SLOT)

/** The composer card `node` sits in, or null; `variant` narrows it to one variant. */
export function closestComposerCard(node: EventTarget | null | undefined, variant?: string) {
  if (variant === undefined) return closestFrom(node, COMPOSER_CARD)
  return closestFrom(node, `${COMPOSER_CARD}[${COMPOSER_VARIANT_ATTRIBUTE}="${variant}"]`)
}

export function findComposerPlaceholder(card: Element) {
  return card.querySelector<HTMLElement>(COMPOSER_PLACEHOLDER)
}

/**
 * The host's statistics in the composer stack: the container an older client
 * marked around them, else the element the marked figures share. Null when the
 * host draws none, which every reader tolerates.
 */
export function findComposerStats() {
  const bar = document.querySelector<HTMLElement>(COMPOSER_STATS_SELECTOR)
  if (bar !== null) return bar
  const figure = document.querySelector<HTMLElement>(COMPOSER_STAT_SELECTOR)
  return figure === null ? null : figure.parentElement
}

/**
 * The host's context meter inside `card`'s dock line, or null when the page
 * carries none.
 *
 * The dock is the card's next sibling (a notice line, when there is one, sits
 * before it), and the meter is the dialog trigger in it that draws a ring of
 * `<circle>`s — the statistics pills draw none. The composer pass marks the
 * node it finds, and the statistics feature reads the meter while that pass is
 * not installed, so the answer is taken here rather than in either of them.
 */
export function findDockedContextMeter(card: Element | null) {
  const dock = card === null ? null : card.nextElementSibling
  if (dock === null) return null
  const triggers = dock.querySelectorAll<HTMLElement>(DIALOG_TRIGGER_SELECTOR)
  for (let i = 0; i < triggers.length; i++) {
    const trigger = triggers[i]
    if (trigger.querySelector(':scope > svg > circle') === null) continue
    let node: HTMLElement = trigger
    while (node.parentElement !== null && node.parentElement !== dock) node = node.parentElement
    return node
  }
  return null
}

/** The editable draft inside `scope`: the element the caret and the send flight read. */
export function findComposerInput(scope: ParentNode = document) {
  return scope.querySelector<HTMLElement>(COMPOSER_INPUT_SELECTOR)
}

/**
 * The composer seat around `scope`: a pointer or key inside it is the reader
 * typing, which the scroll owner reads as intent that is not a scroll (D40).
 */
export function findComposerSeat(scope: ParentNode = document) {
  return scope.querySelector<HTMLElement>(COMPOSER_SELECTOR)
}

/** The session scroller: the element the host hangs its own follow off (D40). */
export const findConversationScroller = cacheFirst<HTMLElement>(CONVERSATION_SCROLL_SELECTOR)

/** The shown conversation: the element carrying its session id, and the id itself. */
const CONVERSATION_SESSION_ATTR = CONVERSATION_SESSION_ATTRIBUTE
const CONVERSATION_SESSION = `[${CONVERSATION_SESSION_ATTR}]`

/**
 * The shown conversation, kept while it stays the document's first match: a
 * session switch mounts the next one, and an earlier match invalidates the
 * kept element as a fresh query would answer with it.
 */
export const findConversationSession = cacheFirst<HTMLElement>(CONVERSATION_SESSION_SELECTOR)

export function closestConversationSession(node: EventTarget | null | undefined) {
  return closestFrom(node, CONVERSATION_SESSION)
}

export function conversationSessionId(host: Element | null | undefined) {
  if (host === null || host === undefined) return null
  const id = host.getAttribute(CONVERSATION_SESSION_ATTR)
  return typeof id === 'string' ? id : null
}

/**
 * The host's composer stack (ui-conversation's `.composerStack`): the composer
 * card with the cards stacked above it, and on the new-session page the hero
 * around them.
 */
export const COMPOSER_STACK = COMPOSER_STACK_SELECTOR

/**
 * The selected session id. dsh 0.2 moved it off the list snapshot onto the
 * `uiSession` service; the legacy `list.current` is read as a fallback so
 * older hosts keep working.
 */
export function currentSessionId(ctx: HostContext, sessions: HostSessionsService): string | null | undefined {
  const uiSession = ctx.get('uiSession') as HostUiSessionService | undefined
  const value = uiSession?.current?.value
  if (typeof value?.key === 'string') return value.key
  return sessions.list.getSnapshot().current
}

export function currentSession(ctx: HostContext): HostSession | null {
  const sessions = ctx.get('sessions') as HostSessionsService | undefined
  if (sessions === undefined || sessions === null) return null
  const id = currentSessionId(ctx, sessions)
  if (id === undefined || id === null) return null
  const binding = sessions.binding(id)
  if (binding === undefined || binding === null) return null
  return binding.session === undefined ? null : binding.session
}

/**
 * One session's chat target (ui-chat's `chat` target of uiConversation): the
 * loaded window's nodes, turns and turn navigation, as the host's own chat
 * view reads them. The host builds the target only for a subscriber or while
 * the shell shows that session's chat view, so a bare read on the trajectory
 * view sees nothing.
 */
export function findChatTarget(ctx: HostContext, sessionId: string): HostChatTarget | null {
  const conversation = ctx.get('uiConversation') as HostUiConversationService | undefined
  const sessions = ctx.get('sessions') as HostSessionsService | undefined
  if (!conversation || !sessions?.binding(sessionId)) return null
  return conversation.binding(sessionId).target('chat') ?? null
}

/**
 * What an open turn is doing, read off the host's chat snapshot: its newest
 * step's assistant output while that streams (`newest` is the kind of its
 * newest block, null before the first), else `{ kind: 'tools', call }` with the
 * call the host reports in flight — its block carries the tool's name and the
 * arguments it has received — else null: the turn waits on the model.
 */
export function readTurnActivity(snapshot: HostChatSnapshot, turn: HostTurn): TurnActivity | null {
  const step = turn.steps.length === 0 ? undefined : turn.steps[turn.steps.length - 1]
  const assistant = step === undefined ? undefined : step.data.get('assistant-step')
  if (assistant !== undefined && assistant.status === 'running') {
    const blocks = assistant.blocks
    return { kind: 'assistant', assistant, newest: blocks.length === 0 ? null : blocks[blocks.length - 1].kind }
  }
  // The host orders the calls in flight by where they stand in the turn, so the
  // last of this turn's is the one the model is on now.
  const calls = snapshot.legacy?.runningCalls ?? []
  let running: HostRunningCall | undefined
  for (let i = 0; i < calls.length; i++) {
    if (calls[i].turn === turn.turn) running = calls[i]
  }
  return running === undefined ? null : { kind: 'tools', call: running }
}

/** What an open turn is doing (readTurnActivity). */
export type TurnActivity = { kind: 'assistant', assistant: HostAssistantStep, newest: string | null } | { kind: 'tools', call: HostRunningCall }

export function currentPreset(session: HostSession): string | null {
  const snapshot = session.projections?.faceOf('permissions').getSnapshot()
  if (snapshot === undefined || snapshot === null) return null
  // dsh 0.2+ projection faces hand back the bare value; older hosts wrapped it.
  if (typeof snapshot === 'object' && 'currentValue' in snapshot) return (snapshot as { currentValue: string }).currentValue
  return typeof snapshot === 'string' ? snapshot : null
}

/**
 * One session's whole-log turn outline (the host's `turnOutline` projection):
 * `{ turn, seq, prompt, response }` per started turn, or undefined where the
 * assembly does not mount that projection. `seq` is the turn's `turn/start`
 * event, which is what the host's own jump pages history through
 */
export function sessionOutline(ctx: HostContext, sessionId: string): HostOutlineTurn[] | undefined {
  const face = ctx.get('sessions')?.binding(sessionId)?.session?.projections?.faceOf('turnOutline')
  return typeof face?.getSnapshot === 'function' ? face.getSnapshot() : undefined
}

/**
 * The turn holding one event seq: the latest outline entry at or before it. An
 * outline that does not reach that far answers null, and the caller leaves the
 * reading position where it is.
 */
export function turnForSeq(outline: HostOutlineTurn[] | undefined, seq: number): number | null {
  if (!Array.isArray(outline)) return null
  let found: number | null = null
  for (const entry of outline) {
    if (entry === null || typeof entry !== 'object') continue
    if (!Number.isSafeInteger(entry.turn) || !Number.isSafeInteger(entry.seq)) continue
    if (entry.seq > seq) continue
    if (found === null || entry.turn > found) found = entry.turn
  }
  return found
}

/**
 * The host's client services, each read here once (D3).
 *
 * A feature asks for what it does with a service, not for the service's name:
 * the name, the shape it is read as, and the answer where the host carries none
 * live in this module, so a host that renames one is answered here. The ones
 * whose shape the contract does not type come back as `HostValue`, and the
 * reader keeps the check it had.
 */

/** The session list, and the binding each session's chat is read through. */
export function hostSessions(lookup: HostServiceLookup | null | undefined): HostSessionsService | null {
  const sessions = lookup?.get('sessions') as HostSessionsService | undefined
  return sessions ?? null
}

/** The shown session's own state: which session it is, and how its turn is going. */
export function hostUiSession(lookup: HostServiceLookup | null | undefined): HostUiSessionService | null {
  const uiSession = lookup?.get('uiSession') as HostUiSessionService | undefined
  return uiSession ?? null
}

/** One session's model directory: the catalog, its load and the pick. */
export function hostModelDirectories(lookup: HostServiceLookup | null | undefined): HostModelDirectoriesService | null {
  const directories = lookup?.get('modelDirectories') as HostModelDirectoriesService | undefined
  return directories ?? null
}

/** The shell's language, and the namespaces it translates. */
export function hostLocale(lookup: HostServiceLookup | null | undefined): HostLocaleService | null {
  const locale = lookup?.get('locale') as HostLocaleService | undefined
  return locale ?? null
}

/** One session's conversation service, the chat target's own reader. */
export function hostConversation(lookup: HostServiceLookup | null | undefined): HostConversationService | null {
  const conversation = lookup?.get('conversation') as HostConversationService | undefined
  return conversation ?? null
}

/** The reader's own keyboard shortcuts. */
export function hostShortcuts(lookup: HostServiceLookup | null | undefined): HostShortcutsService | null {
  const shortcuts = lookup?.get('shortcuts') as HostShortcutsService | undefined
  return shortcuts ?? null
}

/** The slot registry, read from the scope that injected it (D75). */
export function hostSlots(lookup: HostServiceLookup): HostSlotsService | null {
  const slots = lookup.get('slots') as HostSlotsService | undefined
  return slots ?? null
}

/** One component handed to a host slot, under the declaration it is registered with. */
export interface SlotEntry {
  options: HostSlotOptions & { name: string }
  component: unknown
}

/**
 * Run `use` with the slot registry once the host serves it, in the scope that
 * injected it (D75): the plugin's own context does not hand the registry out.
 * Disposing the returned scope runs the effects `use` registered in it; a host
 * without late services has no registry and gets null.
 */
export function withSlots(ctx: HostContext, use: (slots: HostSlotsService, scope: HostContext) => void): HostFiber | null {
  if (typeof ctx.inject !== 'function') return null
  return ctx.inject(['slots'], scope => {
    const slots = hostSlots(scope)
    if (slots === null || typeof slots.inject !== 'function') return
    use(slots, scope)
  })
}

/**
 * Hand components to host slots, each as soon as its slot is declared (D42).
 * Disposing the returned scope takes every entry back, or an entry outlives its
 * feature and keeps rendering.
 */
export function registerSlotEntries(ctx: HostContext, entries: readonly SlotEntry[], label: string): HostFiber | null {
  return withSlots(ctx, (slots, scope) => {
    for (const entry of entries) {
      scope.effect(() => slots.inject(entry.options.name, () => slots.register(entry.options, entry.component)), label)
    }
  })
}

/** The client remote: the endpoint every service behind it is reached through. */
export function hostRemote(lookup: HostServiceLookup | null | undefined): HostValue {
  return lookup?.get('remote')
}

/** The account service behind the remote. */
export function hostRemoteAccount(lookup: HostServiceLookup | null | undefined): HostAccountService | null {
  const account = lookup?.get('remote.account') as HostAccountService | undefined
  return account ?? null
}

/** The session service behind the remote: the list, and the shown session. */
export function hostRemoteSession(lookup: HostServiceLookup | null | undefined): HostValue {
  return lookup?.get('remote.session')
}

/**
 * One session's title, written through the host's own rename (`session.rename`,
 * the call behind the host's rename dialog). Null where the host carries no
 * session remote or no rename on it: a host older than the method keeps the
 * title its own header draws.
 */
export function hostRenameSession(lookup: HostServiceLookup | null | undefined, sessionId: string, title: string): Promise<HostSessionRenameAnswer> | null {
  const session = hostRemoteSession(lookup)
  if (session === null || session === undefined || typeof session.rename !== 'function') return null
  return session.rename({ sessionId, title }) as Promise<HostSessionRenameAnswer>
}

/** The permission presets the host serves, behind the remote. */
export function hostRemotePermissionPresets(lookup: HostServiceLookup | null | undefined): HostValue {
  return lookup?.get('remote.permissionPresets')
}

/** The workspace list, archived and live. */
export function hostWorkspaces(lookup: HostServiceLookup | null | undefined): HostWorkspacesService | null {
  const workspaces = lookup?.get('workspaces') as HostWorkspacesService | undefined
  return workspaces ?? null
}

/**
 * The workspace browser's viewing store: the grouping and the archived filter
 * behind the host's own view menu. The host registers its browser under
 * `sidebar.workspaces` with the store it creates, and that registration's
 * `create` answers the one instance the browser renders from, so a write here
 * is the menu's own. Null when the host carries no such registration or its
 * store is not the shape this reads: the caller stays off rather than mounting a
 * control that cannot drive the host (D12).
 */
export function hostWorkspaceView(lookup: HostContext | null | undefined): HostWorkspaceViewStore | null {
  const slots = lookup === null || lookup === undefined ? null : hostSlots(lookup)
  if (slots === null) return null
  const entries = slots.entries('sidebar.workspaces')
  for (let i = 0; i < entries.length; i++) {
    const declaration = entries[i].store
    if (declaration === undefined) continue
    const view = declaration.create() as unknown as HostWorkspaceViewStore
    if (view === null || typeof view !== 'object') continue
    if (typeof view.getSnapshot !== 'function') continue
    if (typeof view.actions?.setArchivedFilter !== 'function' || typeof view.actions?.setGroupBy !== 'function') continue
    return view
  }
  return null
}

/** The shell's workspace actions: open a session, start one. */
export function hostUiWorkspace(lookup: HostServiceLookup | null | undefined): HostValue {
  return lookup?.get('uiWorkspace')
}

/** The shell's plugin page navigation. */
export function hostPluginNavigation(lookup: HostServiceLookup | null | undefined): HostValue {
  return lookup?.get('pluginNavigation')
}

/** The shell's panel layout. */
export function hostLayout(lookup: HostServiceLookup | null | undefined): HostValue {
  return lookup?.get('layout')
}

/** The installed plugin inventory, behind the remote. */
export function hostRemotePluginInventory(lookup: HostServiceLookup | null | undefined): HostValue {
  return lookup?.get('remote.pluginInventory')
}

/** The plugin manager behind the remote. */
export function hostRemotePluginManager(lookup: HostServiceLookup | null | undefined): HostValue {
  return lookup?.get('remote.pluginManager')
}

/**
 * The bundles the profile carries, those that loaded: the inventory is read
 * first because the manager Remote is mounted whether or not the host manages
 * a profile, and only the inventory says whether it does.
 * @returns null where the host carries neither service; otherwise a promise for
 *          the list, empty when the host manages no profile, rejected when
 *          either service answers with an error.
 */
export function profileBundles(lookup: HostServiceLookup | null | undefined): Promise<HostPluginBundle[]> | null {
  const inventory = hostRemotePluginInventory(lookup)
  const manager = hostRemotePluginManager(lookup)
  if (!inventory || !manager) return null
  return inventory.list().then((answer: HostInventoryAnswer) => {
    if (!answer.ok) throw new Error(answer.error?.message ?? 'the plugin inventory answered without a reason')
    if (answer.value.managementAvailable !== true) return []
    return manager.listBundles().then((bundles: HostBundleListAnswer) => {
      if (!bundles.ok) throw new Error(bundles.error?.message ?? 'the plugin manager answered without a reason')
      return bundles.value.filter((bundle) => bundle.error === undefined)
    })
  })
}

/** The skill catalog behind the remote. */
export function hostRemoteSkills(lookup: HostServiceLookup | null | undefined): HostValue {
  return lookup?.get('remote.skills')
}

/** The host's settings-form service (`configForms`, D75); null where the host serves no namespaces to the browser. */
export function hostConfigForms(lookup: HostServiceLookup | null | undefined): HostConfigFormsService | null {
  const forms = lookup?.get('configForms') as HostConfigFormsService | undefined
  return typeof forms?.get === 'function' ? forms : null
}
