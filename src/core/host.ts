import { HDSL_ROUTE, HDSL_SKIN_ROUTE, USERNAME_MAX, USERNAME_ROUTE } from '../constants'
import { COMPOSER_CARD_SELECTOR, COMPOSER_PLACEHOLDER_SELECTOR, COMPOSER_STACK_SELECTOR, COMPOSER_VARIANT_ATTRIBUTE, CONVERSATION_SESSION_ATTRIBUTE, CONVERSATION_SESSION_SELECTOR, FOOT_AREA_SELECTOR, PERMISSION_TRIGGER_SELECTOR } from '../contracts/dom'
import { readPrefs } from './prefs'
import { closestFrom } from '../shared/dom'
import { createHostResource } from '../shared/resource'

/**
 * The host's client context (cordis), handed to `apply` and to every feature.
 * Services come by name; their shapes are the host's own and stay untyped
 * here until the contract module types them (D44).
 */
export interface HostContext {
  /** The loader's fiber; its boot entry id names this plugin's settings namespace (D10). */
  readonly fiber?: { entry?: { id?: unknown } }
  /** A service by name, or undefined when the host carries none (D12). */
  get(name: string): HostValue
  /** Run `effect` now; the function it returns runs when the context is disposed. */
  effect(effect: () => () => void, label?: string): void
  /** Run `callback` in a scope once every named service exists; a host without it has no late services. */
  inject?(names: string[], callback: (scope: HostContext) => void): HostFiber
}

/**
 * A value read off a host service or snapshot: a session, a catalog group, a
 * chat node. Its shape is the host's own; the contract module types it (D44).
 */
export type HostValue = any

/** A host locale namespace's translate seat (`locale.bind(namespace)`): a key and its parameters to text. */
export type HostText = (key: string, params?: Record<string, string | number>) => string

/** The scope `inject` opened: disposing it runs the effects registered in it. */
export interface HostFiber {
  dispose(): void
}

/**
 * The host's access-mode trigger: the button its permission slot renders.
 * Every slot render site carries a `[data-slot="<key>"]` wrapper (D19), and
 * the skin inserts its own buttons inside that wrapper, so those are skipped.
 */
export function findAccessTrigger() {
  return document.querySelector<HTMLButtonElement>(PERMISSION_TRIGGER_SELECTOR)
}

/** The sidebar footer, where the account row and the plugin footer entries live. */
export function findFootArea() {
  return document.querySelector<HTMLElement>(FOOT_AREA_SELECTOR)
}

/**
 * The host's composer card — the element the skin's composer rules hang on —
 * and the placeholder its editor draws. The card's variant is the skin's own
 * marking (D9); every reader goes through these, so the selectors live once.
 */
export const COMPOSER_CARD = COMPOSER_CARD_SELECTOR
export const COMPOSER_PLACEHOLDER = COMPOSER_PLACEHOLDER_SELECTOR

export function findComposerCards() {
  return document.querySelectorAll<HTMLElement>(COMPOSER_CARD)
}

export function findComposerCard() {
  return document.querySelector<HTMLElement>(COMPOSER_CARD)
}

/** The composer card `node` sits in, or null; `variant` narrows it to one variant. */
export function closestComposerCard(node: EventTarget | null | undefined, variant?: string) {
  if (variant === undefined) return closestFrom(node, COMPOSER_CARD)
  return closestFrom(node, `${COMPOSER_CARD}[${COMPOSER_VARIANT_ATTRIBUTE}="${variant}"]`)
}

export function findComposerPlaceholders() {
  return document.querySelectorAll<HTMLElement>(COMPOSER_PLACEHOLDER)
}

export function findComposerPlaceholder(card: Element) {
  return card.querySelector<HTMLElement>(COMPOSER_PLACEHOLDER)
}

/** The shown conversation: the element carrying its session id, and the id itself. */
export const CONVERSATION_SESSION_ATTR = CONVERSATION_SESSION_ATTRIBUTE
export const CONVERSATION_SESSION = `[${CONVERSATION_SESSION_ATTR}]`

export function findConversationSession() {
  return document.querySelector<HTMLElement>(CONVERSATION_SESSION_SELECTOR)
}

export function closestConversationSession(node: EventTarget | null | undefined) {
  return closestFrom(node, CONVERSATION_SESSION)
}

/** The session id `host` carries, or null when it carries none. */
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
export function currentSessionId(ctx: HostContext, sessions: HostValue): string | null | undefined {
  const uiSession = ctx.get('uiSession')
  const value = uiSession?.current?.value
  if (typeof value?.key === 'string') return value.key
  return sessions.list.getSnapshot().current
}

export function currentSession(ctx: HostContext): HostValue {
  const sessions = ctx.get('sessions')
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
export function findChatTarget(ctx: HostContext, sessionId: string): HostValue {
  const conversation = ctx.get('uiConversation')
  if (!conversation || !ctx.get('sessions')?.binding(sessionId)) return null
  return conversation.binding(sessionId).target('chat')
}

/**
 * What an open turn is doing, read off the host's chat snapshot: its newest
 * step's assistant output while that streams (`newest` is the kind of its
 * newest block, null before the first), else `{ kind: 'tools' }` while one of
 * the turn's tool calls runs, else null — the turn waits on the model.
 */
export function readTurnActivity(snapshot: HostValue, turn: HostValue): TurnActivity | null {
  const step = turn.steps.length === 0 ? undefined : turn.steps[turn.steps.length - 1]
  const assistant = step === undefined ? undefined : step.data.get('assistant-step')
  if (assistant !== undefined && assistant.status === 'running') {
    const blocks = assistant.blocks
    return { kind: 'assistant', assistant, newest: blocks.length === 0 ? null : blocks[blocks.length - 1].kind }
  }
  const calls = snapshot.legacy.runningCalls
  for (let i = 0; i < calls.length; i++) {
    if (calls[i].turn === turn.turn) return { kind: 'tools' }
  }
  return null
}

/** What an open turn is doing (readTurnActivity). */
export type TurnActivity = { kind: 'assistant', assistant: HostValue, newest: string | null } | { kind: 'tools' }

export function currentPreset(session: HostValue): string | null {
  const snapshot = session.projections.faceOf('permissions').getSnapshot()
  if (snapshot === undefined || snapshot === null) return null
  // dsh 0.2+ projection faces hand back the bare value; older hosts wrapped it.
  if (typeof snapshot === 'object' && 'currentValue' in snapshot) return snapshot.currentValue
  return snapshot
}

/**
 * Who the skin shows. Nickname: the custom nickname, the signed-in account's
 * name, the HDSL launcher's account name, the cached OS-user probe, the fresh
 * probe. Picture: the signed-in account's avatar, the HDSL launcher's avatar,
 * then nothing, which lets the brand mark show (D15).
 */
export let accountName = ''
export let accountAvatar = ''

/** The account profile's contribution; called when its read answers. */
export function setAccountIdentity(name: unknown, avatar: unknown) {
  accountName = typeof name === 'string' ? name.trim() : ''
  accountAvatar = typeof avatar === 'string' ? avatar : ''
}

/**
 * The host half owns the OS user (`os.userInfo().username`); this side fetches
 * it once, caches it and mirrors the answer into local storage so a reload
 * shows the name from the first frame. No workspace parsing, no polling.
 */
export let usernameFromHost = ''

/** Last OS-user probe this browser saw; the cache that outlives the page. */
export const PROBED_USERNAME_KEY = 'dsh-claude-style.probed-username'
export let probedUsername = readStoredProbeUsername()

export function readStoredProbeUsername() {
  return localStorage.getItem(PROBED_USERNAME_KEY) || ''
}

export function storeProbeUsername(value: string) {
  if (value) localStorage.setItem(PROBED_USERNAME_KEY, value)
}

/** The host half's OS user; an answer the contract does not carry is not adopted. */
export const usernameResource = createHostResource(USERNAME_ROUTE, (data) => {
  if (!data || data.ok !== true || typeof data.username !== 'string') return undefined
  usernameFromHost = data.username.trim().slice(0, USERNAME_MAX)
  if (usernameFromHost) {
    probedUsername = usernameFromHost
    storeProbeUsername(usernameFromHost)
  }
  return usernameFromHost
})

export function onUsernameLoaded(listener: (username: string) => void) {
  return usernameResource.onLoaded(listener)
}

export function loadUsername() {
  usernameResource.load()
}

export let hdslContract = false
export let hdslName = ''
export let hdslAvatar = false

/**
 * The HDSL launcher's account contract, when this instance was launched by it.
 * An answer that is no contract is not adopted, so the chain skips the
 * launcher (D15).
 */
export const hdslResource = createHostResource(HDSL_ROUTE, (data) => {
  if (!data || data.ok !== true || data.contract !== true) return undefined
  hdslContract = true
  hdslName = typeof data.name === 'string' ? data.name.trim().slice(0, USERNAME_MAX) : ''
  hdslAvatar = data.hasSkinImage === true
  return true
})

export function onHdslLoaded(listener: (adopted: true) => void) {
  return hdslResource.onLoaded(listener)
}

export function loadHdsl() {
  hdslResource.load()
}

/** The nickname every skin surface shows, or '' when nothing resolved. */
export function resolveDisplayName() {
  const custom = readPrefs().username
  if (custom) return custom
  if (accountName) return accountName
  if (hdslName) return hdslName
  if (probedUsername) return probedUsername
  return usernameFromHost
}

export function getUsername() {
  return resolveDisplayName() || 'User'
}

/** The picture every skin surface shows, or '' to let the brand mark show. */
export function resolveAvatarUrl() {
  if (accountAvatar) return accountAvatar
  if (hdslContract && hdslAvatar) return HDSL_SKIN_ROUTE
  return ''
}

/** Host context reference for services that read host state outside apply(ctx)'s call stack. */
export let hostCtx: HostContext | null = null
export function setHostContext(ctx: HostContext | null) {
  hostCtx = ctx
  // A new host context means a new OS user and a new launcher, so the next
  // apply resolves again. The probe cache survives on purpose: same machine.
  usernameResource.reset()
  usernameFromHost = ''
  hdslResource.reset()
  hdslContract = false
  hdslName = ''
  hdslAvatar = false
  accountName = ''
  accountAvatar = ''
}
