import { COMPOSER_CARD_SELECTOR, COMPOSER_INPUT_SELECTOR, COMPOSER_PLACEHOLDER_SELECTOR, COMPOSER_SELECTOR, COMPOSER_STACK_SELECTOR, COMPOSER_STAT_SELECTOR, COMPOSER_VARIANT_ATTRIBUTE, CONVERSATION_SCROLL_SELECTOR, CONVERSATION_SESSION_ATTRIBUTE, CONVERSATION_SESSION_SELECTOR, CONVERSATION_VIEW_STORAGE_PREFIX, DIALOG_TRIGGER_SELECTOR, FOOT_AREA_SELECTOR, FOREGROUND_SELECTOR, MENU_ROLE_SELECTOR, MODAL_DIALOG_SELECTOR, MODEL_SLOT_SELECTOR, PERMISSION_TRIGGER_SELECTOR, PHASE_ATTRIBUTE, RIGHTBAR_TOGGLE_SELECTOR, SIDEBAR_BRAND_SELECTOR, SIDEBAR_CHAT_SELECTOR, SIDEBAR_NEW_SESSION_SELECTOR, SIDEBAR_ROOT_SELECTOR, SIDEBAR_TOGGLE_SELECTOR, WINDOWS_MENU_SELECTOR } from '@dsh-claude-style/contracts/dom'
import type { HostAccountService } from '@dsh-claude-style/contracts/account'
import type { HostAssistantStep, HostBundleListAnswer, HostChatSnapshot, HostChatTarget, HostConfigFormsService, HostConversationService, HostInventoryAnswer, HostLocaleService, HostModelDirectoriesService, HostPluginBundle, HostServiceLookup, HostOutlineTurn, HostRunningCall, HostSession, HostSessionsService, HostSessionRenameAnswer, HostShortcutsService, HostSlotOptions, HostSlotsService, HostSnapshotSource, HostTurn, HostUiConversationService, HostUiSessionService, HostWorkspacesService, HostWorkspaceViewStore } from '@dsh-claude-style/contracts/services'
import { fileAddressFor } from '@deepseek-ai/dsh-util-workspace-path'
import { observeMatches, subscribeMutations } from './bus'
import { closestFrom, shown } from './dom'

/** The host's client context (cordis), handed to `apply` and to every feature; service shapes are the host's own until the contract module types them (D3). */
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

/** A value read off a host service or snapshot; the contract module types the ones the skin reads by name (D3, `contracts/services.ts`). */
export type HostValue = any

/** A host locale namespace's translate seat (`locale.bind(namespace)`): a key and its parameters to text. */
export type { HostText } from '@dsh-claude-style/contracts/services'

/** The scope `inject` opened: disposing it runs the effects registered in it. */
export interface HostFiber {
  dispose(): void
}

/** Whether `element` is still the document's first match: connected, matching itself, and with no earlier sibling subtree holding one. The walk is short for seats the host mounts once and replaces whole. */
function stillFirstMatch(element: Element, selector: string) {
  if (!element.isConnected || !element.matches(selector)) return false
  for (let node: Element | null = element; node !== null; node = node.parentElement) {
    for (let earlier = node.previousElementSibling; earlier !== null; earlier = earlier.previousElementSibling) {
      if (earlier.matches(selector) || earlier.querySelector(selector) !== null) return false
    }
  }
  return true
}

/** The batch count the one shared body watch has seen: an absent seat is retried once per batch. */
let matchEpoch = 0
/** Whether the shared body watch is open. One is enough for every seat. */
let matchEpochWatched = false
/** Stops the shared body watch; the entry's teardown drops it with the generation that opened it. */
let stopMatchEpochWatch: (() => void) | null = null

/** Open the one body watch the cached seats read: the first cacheFirstMatch call does it. */
function openMatchEpochWatch() {
  if (matchEpochWatched) return
  matchEpochWatched = true
  // The bump runs inside the batch's own callback, so a `beforePaint` reader
  // (D40) sees the batch's nodes rather than the previous batch's answer.
  stopMatchEpochWatch = subscribeMutations(document.body, { subtree: true, childList: true, beforePaint: true }, () => {
    matchEpoch += 1
  })
}

/**
 * Drop the shared seat watch: the entry's teardown calls it, so a page that
 * gives the skin back keeps no body subscription behind. A later generation
 * opens its own on its first seat read.
 */
export function closeHostSeats() {
  if (stopMatchEpochWatch !== null) stopMatchEpochWatch()
  stopMatchEpochWatch = null
  matchEpochWatched = false
}

/**
 * The first match of `selector`, resolved once and kept while it stays the first match (D40): repeated batches reuse it, and the document is queried again only when the host replaced the element or mounted one before it. An answer of "nothing matched" is kept for the rest of the batch and retried after a later one; one body watch serves every cached seat, and closeHostSeats drops it with the generation. Exported for the seats one feature alone reads.
 */
export function cacheFirstMatch<T extends Element>(selector: string) {
  openMatchEpochWatch()
  let kept: T | null = null
  let answered = false
  let seenEpoch = matchEpoch
  return () => {
    if (seenEpoch !== matchEpoch) {
      if (kept === null) answered = false
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

/** The host's access-mode trigger: the button its permission slot renders. Every slot render site carries a `[data-slot="<key>"]` wrapper (D3), and the skin's own buttons sit inside it, so those are skipped. */
export const findAccessTrigger = cacheFirst<HTMLButtonElement>(PERMISSION_TRIGGER_SELECTOR)

/** The answer findHeroRoot keeps, and the batch it was taken in. */
let heroRoot: HTMLElement | null = null
let heroRootEpoch = -1
let heroRootAnswered = false

/** The host's hero-phase conversation root: the page before a session is chosen. A sub-agent's docked conversation renders the same composer, so it is not the start screen and the home features (the ripple and the mascot among them) must not mount against it. Kept per mutation batch, as the other seats are (D9, D40). */
export function findHeroRoot() {
  openMatchEpochWatch()
  if (heroRootEpoch !== matchEpoch) {
    heroRoot = null
    heroRootAnswered = false
    heroRootEpoch = matchEpoch
  }
  if (heroRootAnswered) return heroRoot
  heroRootAnswered = true
  const roots = document.querySelectorAll<HTMLElement>(`[${PHASE_ATTRIBUTE}="hero"]`)
  for (let i = 0; i < roots.length; i += 1) {
    if (roots[i].closest(SIDEBAR_CHAT_SELECTOR) === null) {
      heroRoot = roots[i]
      break
    }
  }
  return heroRoot
}

/** The sidebar footer, where the account row and the plugin footer entries live. */
export const findFootArea = cacheFirst<HTMLElement>(FOOT_AREA_SELECTOR)

/** The modal dialog the host has up, or null. The host portals its overlays onto <body>; the wrapper is `role="presentation"`, and the dialog inside it is what says a surface of the reader's own is up. */
export const findHostModal = cacheFirst<HTMLElement>(MODAL_DIALOG_SELECTOR)

/** The sidebar's own column, where the skin's sidebar-side nodes live: a sweep for its strays is scoped here, and the host replaces the column whole. */
export const findSidebarRoot = cacheFirst<HTMLElement>(SIDEBAR_ROOT_SELECTOR)

/** The sidebar's brand row and collapse toggle, and the desktop window's menu button beside them: the seats the surface switch and the header band are placed against. Each is absent on most pages, so the answer is kept rather than queried per pass. */
export const findSidebarBrand = cacheFirst<HTMLElement>(SIDEBAR_BRAND_SELECTOR)
/** The New session button, after which the skin seats its standalone search button. */
export const findSidebarNewSession = cacheFirst<HTMLElement>(SIDEBAR_NEW_SESSION_SELECTOR)
export const findSidebarToggle = cacheFirst<HTMLElement>(SIDEBAR_TOGGLE_SELECTOR)
export const findWindowsMenu = cacheFirst<HTMLElement>(WINDOWS_MENU_SELECTOR)

/** The right panel's own collapse control while that panel is open. It hangs from a transformed, clipped subtree, so the skin draws its own control in the header's row and presses this one; the same read answers whether the panel is open. */
export const findRightbarToggle = cacheFirst<HTMLElement>(RIGHTBAR_TOGGLE_SELECTOR)

/** The open host menu card: the host portals menus to `<body>`, and every card the skin builds itself carries a `dsh-claude-` class (D3). Read once and kept until a menu opens or closes (D40). */
export const findHostMenu = cacheFirst<HTMLElement>(`${MENU_ROLE_SELECTOR}:not([class*="dsh-claude-"])`)

/** The page's first menu or modal dialog, shown or not, kept per batch (D40). */
const findForegroundNode = cacheFirst<HTMLElement>(FOREGROUND_SELECTOR)

/**
 * The first menu or modal dialog the reader is facing, the host's or the skin's: the foreground a key or pointer must not act behind. A node kept mounted while hidden holds nothing, and the next shown one counts.
 */
export function findForeground(): HTMLElement | null {
  const first = findForegroundNode()
  if (first === null) return null
  if (shown(first)) return first
  const all = document.querySelectorAll<HTMLElement>(FOREGROUND_SELECTOR)
  for (let i = 0; i < all.length; i += 1) {
    if (shown(all[i])) return all[i]
  }
  return null
}

/** The host's composer card — the element the skin's composer rules hang on — and the placeholder its editor draws; the card's variant is the skin's own marking (D9). */
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

/** The host's model slot in the composer row: React's, so the skin only appends its own nodes beside the host's root (features/model/seat-box.ts, features/context-stats/meter-ring.ts). */
const MODEL_SLOT = MODEL_SLOT_SELECTOR

/** The model slot inside `scope`: the row a card's own composer render draws. */
export function findModelSlotIn(scope: ParentNode) {
  return scope.querySelector<HTMLElement>(MODEL_SLOT)
}

/** The answer findPrimaryModelSlot keeps, and the batch it was taken in. */
let primaryModelSlot: HTMLElement | null = null
let primaryModelSlotEpoch = -1
let primaryModelSlotAnswered = false

/**
 * The model slot of the page's MAIN composer: the first card that is not a sub-agent's docked conversation, which draws the same composer with its own slot. Kept per mutation batch, as the other seats are (D40): cards mount and unmount with the sidebar, and the kept slot is dropped in the batch that changed them.
 */
export function findPrimaryModelSlot() {
  openMatchEpochWatch()
  if (primaryModelSlotEpoch !== matchEpoch) {
    primaryModelSlot = null
    primaryModelSlotAnswered = false
    primaryModelSlotEpoch = matchEpoch
  }
  if (primaryModelSlotAnswered) return primaryModelSlot
  primaryModelSlotAnswered = true
  primaryModelSlot = mainModelSlot()
  return primaryModelSlot
}

function mainModelSlot() {
  const cards = document.querySelectorAll<HTMLElement>(COMPOSER_CARD)
  for (let i = 0; i < cards.length; i += 1) {
    const card = cards[i]
    if (card.closest(SIDEBAR_CHAT_SELECTOR) !== null) continue
    const slot = card.querySelector<HTMLElement>(MODEL_SLOT)
    if (slot !== null) return slot
  }
  return document.querySelector<HTMLElement>(MODEL_SLOT)
}

/** The composer card `node` sits in, or null; `variant` narrows it to one variant. */
export function closestComposerCard(node: EventTarget | null | undefined, variant?: string) {
  if (variant === undefined) return closestFrom(node, COMPOSER_CARD)
  return closestFrom(node, `${COMPOSER_CARD}[${COMPOSER_VARIANT_ATTRIBUTE}="${variant}"]`)
}

export function findComposerPlaceholder(card: Element) {
  return card.querySelector<HTMLElement>(COMPOSER_PLACEHOLDER)
}

/** The host's statistics in the composer stack: the element the marked figures share; null when the host draws none, which every reader tolerates. */
export function findComposerStats() {
  const figure = document.querySelector<HTMLElement>(COMPOSER_STAT_SELECTOR)
  return figure === null ? null : figure.parentElement
}

/**
 * The host's context meter inside `card`'s dock line, or null. The dock is the card's next sibling, and the meter is the dialog trigger in it that draws a ring of `<circle>`s; taken here because both the composer pass and the statistics feature read it.
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

/** The composer seat around `scope`: a pointer or key inside it is the reader typing, which the scroll owner reads as intent that is not a scroll (D40). */
export function findComposerSeat(scope: ParentNode = document) {
  return scope.querySelector<HTMLElement>(COMPOSER_SELECTOR)
}

/** The page's composer seat, kept per mutation batch (D40): the composer's pass reads it every frame, and a query from the document root on that path costs the page's size. */
export const findPageComposerSeat = cacheFirst<HTMLElement>(COMPOSER_SELECTOR)

/** The session scroller: the element the host hangs its own follow off (D40). */
export const findConversationScroller = cacheFirst<HTMLElement>(CONVERSATION_SCROLL_SELECTOR)

/** The shown conversation: the element carrying its session id, and the id itself. */
const CONVERSATION_SESSION_ATTR = CONVERSATION_SESSION_ATTRIBUTE
const CONVERSATION_SESSION = `[${CONVERSATION_SESSION_ATTR}]`

/** The shown conversation, kept while it stays the document's first match: a session switch mounts the next one, and an earlier match invalidates the kept element. */
export const findConversationSession = cacheFirst<HTMLElement>(CONVERSATION_SESSION_SELECTOR)

export function closestConversationSession(node: EventTarget | null | undefined) {
  return closestFrom(node, CONVERSATION_SESSION)
}

export function conversationSessionId(host: Element | null | undefined) {
  if (host === null || host === undefined) return null
  const id = host.getAttribute(CONVERSATION_SESSION_ATTR)
  return typeof id === 'string' ? id : null
}

/** The id of the session the page shows, or null while none is chosen (D91). */
export function conversationSession(): string | null {
  return conversationSessionId(findConversationSession())
}

/**
 * Hear each session the page switches to, once per change (D91). The host names
 * the shown session on the conversation column; that id changing is the one
 * signal every per-session state can be released by. Reads ride the bus (D40),
 * so no second observer is made for it.
 *
 * @returns unsubscribe.
 */
export function observeSession(onChange: (sessionId: string | null) => void): () => void {
  let last = conversationSession()
  return subscribeMutations(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: [PHASE_ATTRIBUTE, CONVERSATION_SESSION_ATTRIBUTE],
  }, () => {
    const next = conversationSession()
    if (next === last) return
    last = next
    onChange(next)
  })
}

/** The saved view last parsed, with the raw string it was parsed from: the composer's pass reads it every frame and the store moves only on a view switch. */
let savedView: { raw: string, view: string | null } | null = null

/** The view id the host saved for this session; null means chat or no usable saved value. */
export function conversationViewPreference(sessionId: string | null | undefined): string | null {
  if (typeof sessionId !== 'string' || typeof localStorage === 'undefined') return null
  try {
    const raw = localStorage.getItem(CONVERSATION_VIEW_STORAGE_PREFIX + sessionId)
    if (raw === null) return null
    if (savedView !== null && savedView.raw === raw) return savedView.view
    const stored: unknown = JSON.parse(raw)
    const view = typeof stored !== 'object' || stored === null || !('view' in stored)
      ? null
      : typeof stored.view === 'string' ? stored.view : null
    savedView = { raw, view }
    return view
  } catch {
    // The host reads an unavailable store or malformed JSON as no saved view too.
    return null
  }
}

/** The host's composer stack: the composer card with the cards stacked above it, and on the new-session page the hero around them. */
export const COMPOSER_STACK = COMPOSER_STACK_SELECTOR

/** The selected session id, as the host's `uiSession` service publishes it; null while the shell shows none. */
export function currentSessionId(ctx: HostContext): string | null {
  const uiSession = ctx.get('uiSession') as HostUiSessionService | undefined
  const key = uiSession?.current?.value?.key
  return typeof key === 'string' ? key : null
}

/**
 * A card's toolbar row: the flex line under the input field, carrying the leading tools and the trailing model slot. The host gives it no stable hook, so the row is the card's own child that holds the model slot (D3).
 */
export function findComposerRowIn(card: Element): HTMLElement | null {
  const slot = findModelSlotIn(card)
  if (slot === null) return null
  for (let i = 0; i < card.children.length; i += 1) {
    const child = card.children[i]
    if (child.contains(slot)) return child as HTMLElement
  }
  return null
}

export function currentSession(ctx: HostContext): HostSession | null {
  const id = currentSessionId(ctx)
  if (id === null) return null
  return sessionById(ctx, id)
}

/** The session the host binds to one id, or null while it binds none. */
export function sessionById(ctx: HostContext, sessionId: string): HostSession | null {
  const sessions = ctx.get('sessions') as HostSessionsService | undefined
  if (sessions === undefined || sessions === null) return null
  const binding = sessions.binding(sessionId)
  if (binding === undefined || binding === null) return null
  return binding.session === undefined ? null : binding.session
}

/**
 * One session's chat target (ui-chat's `chat` target of uiConversation): the loaded window's nodes, turns and turn navigation, as the host's own chat view reads them. The host builds the target only for a subscriber or while the shell shows that session's chat view.
 */
export function findChatTarget(ctx: HostContext, sessionId: string): HostChatTarget | null {
  const conversation = ctx.get('uiConversation') as HostUiConversationService | undefined
  const sessions = ctx.get('sessions') as HostSessionsService | undefined
  if (!conversation || !sessions?.binding(sessionId)) return null
  return conversation.binding(sessionId).target('chat') ?? null
}

/**
 * What an open turn is doing, read off the host's chat snapshot: its newest step's assistant output while that streams (`newest` is the kind of its newest block), else the call the host reports in flight, else null while the turn waits on the model.
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
  // The face hands back `{ currentValue }`, the shape the host's own picker reads.
  const value = (snapshot as { currentValue?: unknown }).currentValue
  return typeof value === 'string' ? value : null
}

/** One session's whole-log turn outline (the host's `turnOutline` projection), or undefined where the assembly does not mount it; `seq` is the turn's `turn/start` event, which the host's own jump pages history through. */
export function sessionOutline(ctx: HostContext, sessionId: string): HostOutlineTurn[] | undefined {
  const face = ctx.get('sessions')?.binding(sessionId)?.session?.projections?.faceOf('turnOutline')
  return typeof face?.getSnapshot === 'function' ? face.getSnapshot() : undefined
}

/** The turn holding one event seq: the latest outline entry at or before it; an outline that does not reach that far answers null, and the caller leaves the reading position where it is. */
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
 * The host's client services, each read here once (D3): a feature asks for what it does with a service, not for the service's name, so a host that renames one is answered here. The ones the contract does not type come back as `HostValue`, and the reader keeps the check it had.
 */

/** A source's snapshot, or null while the service or its method is absent. */
export function hostSnapshot<Snapshot>(source: HostSnapshotSource<Snapshot> | undefined | null): Snapshot | null {
  return typeof source?.getSnapshot === 'function' ? source.getSnapshot() : null
}

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
 * Run `use` with the slot registry once the host serves it, in the scope that injected it (D75): the plugin's own context does not hand the registry out. Disposing the returned scope runs the effects `use` registered; a host without late services has no registry and gets null.
 */
export function withSlots(ctx: HostContext, use: (slots: HostSlotsService, scope: HostContext) => void): HostFiber | null {
  if (typeof ctx.inject !== 'function') return null
  return ctx.inject(['slots'], scope => {
    const slots = hostSlots(scope)
    if (slots === null || typeof slots.inject !== 'function') return
    use(slots, scope)
  })
}

/** Hand components to host slots, each as soon as its slot is declared (D42); disposing the returned scope takes every entry back. */
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

/** One session's title, written through the host's own rename (`session.rename`, the call behind the host's rename dialog); null where the host carries no session remote or no rename on it. */
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
 * The workspace browser's viewing store: the grouping and the archived filter behind the host's own view menu. The host registers its browser under `sidebar.workspaces` with a store whose `create` answers the rendered instance, so a write here is the menu's own. Null when that shape is absent, and the caller stays off rather than mounting a control that cannot drive the host (D12).
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

/** Open a file in the host's preview through its canonical resource address (D3, D94). */
export function openHostFile(lookup: HostServiceLookup, sessionId: string, directory: string | undefined, path: string): void {
  const sidebar = lookup.get('sidebarRight') as { openResource(address: string): unknown } | undefined
  if (typeof sidebar?.openResource !== 'function') throw new Error('the host has no file preview controller')
  sidebar.openResource(fileAddressFor(sessionId, directory, path))
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
 * The bundles the profile carries, those that loaded: the inventory is read first because the manager Remote is mounted whether or not a profile is managed, and only the inventory says whether one is.
 * @returns null where the host carries neither service; otherwise a promise for the list, rejected when either service answers with an error.
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
