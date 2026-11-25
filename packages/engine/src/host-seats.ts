/**
 * The host's element seats: every query the skin makes for a host element, each
 * resolved once and kept while it stays the document's first match (D40).
 *
 * The shared body watch is what lets an absent seat be retried once per mutation
 * batch: one subscription serves every seat, and closeHostSeats drops it with the
 * skin generation that opened it.
 */

import { CHAT_TURN_ATTRIBUTE, COMPOSER_CARD_SELECTOR, COMPOSER_INPUT_SELECTOR, COMPOSER_PLACEHOLDER_SELECTOR, COMPOSER_SELECTOR, COMPOSER_STACK_SELECTOR, COMPOSER_STAT_SELECTOR, COMPOSER_VARIANT_ATTRIBUTE, CONVERSATION_HEADER_SELECTOR, CONVERSATION_MAIN_SLOT_SELECTOR, CONVERSATION_SCROLL_SELECTOR, CONVERSATION_SESSION_ATTRIBUTE, CONVERSATION_SESSION_SELECTOR, DIALOG_TRIGGER_SELECTOR, FOOT_AREA_SELECTOR, FOREGROUND_SELECTOR, HEADER_CORNER_SELECTOR, HEADER_MORE_TRIGGER_SELECTOR, HEADER_TITLE_SELECTOR, HEADER_UTILITIES_SELECTOR, MENU_ANCHOR_NAME_PROPERTY, MENU_POPUP_SELECTOR, MENU_POSITION_ANCHOR_PROPERTY, MENU_ROLE_SELECTOR, MODAL_DIALOG_SELECTOR, MODEL_SLOT_SELECTOR, PERMISSION_TRIGGER_SELECTOR, PHASE_ATTRIBUTE, PROCESS_GROUP_SELECTOR, RIGHTBAR_TOGGLE_SELECTOR, SIDEBAR_BRAND_SELECTOR, SIDEBAR_CHAT_SELECTOR, SIDEBAR_ROOT_SELECTOR, SIDEBAR_TOGGLE_SELECTOR, TURN_PROCESS_ANSWER_SELECTOR, WINDOWS_MENU_SELECTOR } from '@dsh-claude-style/contracts/dom'
import { observeMatches, subscribeMutations } from './bus'
import { closestFrom, inlineStyleAbove, shown } from './dom'
import { skin } from './skin'

/** A batch-scoped flow index: one group query and one answer query per container (D3, D40).
 * The caller drops this reader when its mutation batch or frame ends.
 */
export function createProcessTurnReader() {
  const flows = new Map<Element, { groups: Map<string, Element[]>, answered: Set<string> }>()
  return (flow: Element) => {
    let state = flows.get(flow)
    if (state !== undefined) return state
    const groups = new Map<string, Element[]>()
    for (const group of flow.querySelectorAll(PROCESS_GROUP_SELECTOR)) {
      const turn = group.getAttribute(CHAT_TURN_ATTRIBUTE) ?? ''
      const members = groups.get(turn)
      if (members === undefined) groups.set(turn, [group])
      else members.push(group)
    }
    const answered = new Set([...flow.querySelectorAll(TURN_PROCESS_ANSWER_SELECTOR)]
      .map(row => row.getAttribute(CHAT_TURN_ATTRIBUTE) ?? ''))
    state = { groups, answered }
    flows.set(flow, state)
    return state
  }
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
export function cacheFirstMatch<T extends Element>(selector: string | (() => string)) {
  openMatchEpochWatch()
  let kept: T | null = null
  let answered = false
  let seenEpoch = matchEpoch
  return () => {
    const query = typeof selector === 'function' ? selector() : selector
    if (seenEpoch !== matchEpoch) {
      if (kept === null) answered = false
      seenEpoch = matchEpoch
    }
    if (kept !== null && stillFirstMatch(kept, query)) return kept
    if (kept === null && answered) return null
    kept = document.querySelector<T>(query)
    answered = true
    return kept
  }
}

/** The host's access-mode trigger: the button its permission slot renders. Every slot render site carries a `[data-slot="<key>"]` wrapper (D3), and the skin's own buttons sit inside it, so those are skipped. */
export const findAccessTrigger = cacheFirstMatch<HTMLButtonElement>(PERMISSION_TRIGGER_SELECTOR)

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
export const findFootArea = cacheFirstMatch<HTMLElement>(FOOT_AREA_SELECTOR)

/** The modal dialog the host has up, or null. The host portals its overlays onto <body>; the wrapper is `role="presentation"`, and the dialog inside it is what says a surface of the reader's own is up. */
export const findHostModal = cacheFirstMatch<HTMLElement>(MODAL_DIALOG_SELECTOR)

/** The sidebar's own column, where the skin's sidebar-side nodes live: a sweep for its strays is scoped here, and the host replaces the column whole. */
export const findSidebarRoot = cacheFirstMatch<HTMLElement>(SIDEBAR_ROOT_SELECTOR)

/** The sidebar's brand row and collapse toggle, and the desktop window's menu button beside them: the seats the surface switch and the header band are placed against. Each is absent on most pages, so the answer is kept rather than queried per pass. */
export const findSidebarBrand = cacheFirstMatch<HTMLElement>(SIDEBAR_BRAND_SELECTOR)
export const findSidebarToggle = cacheFirstMatch<HTMLElement>(SIDEBAR_TOGGLE_SELECTOR)
export const findWindowsMenu = cacheFirstMatch<HTMLElement>(WINDOWS_MENU_SELECTOR)

/**
 * The right panel's own collapse control while that panel is open on screen.
 *
 * A Session the reader left keeps its panel mounted behind a hidden view, so
 * the first match in document order can belong to that earlier Session; the
 * control the page shows belongs to a panel that is actually visible. The
 * header's copy and the details rail both press this control to close the
 * panel standing beside the conversation.
 */
export function findRightbarToggle(): HTMLElement | null {
  const toggles = document.querySelectorAll<HTMLElement>(RIGHTBAR_TOGGLE_SELECTOR)
  for (let index = 0; index < toggles.length; index += 1) {
    const toggle = toggles[index]
    if (toggle.closest('[hidden]') === null && shown(toggle)) return toggle
  }
  return null
}

/** Host menu cards: the host portals menus to `<body>`, and every card the skin builds itself carries the skin's class prefix (D3, D73). A card with a search field answers `data-menu-popup` while its inner row container holds the role, so both marks name a card; the anchor pair below picks the card out of the two. The first one is kept until a menu opens or closes (D40). */
const hostMenuSelector = () => `:is(${MENU_ROLE_SELECTOR}, ${MENU_POPUP_SELECTOR}):not([class*="${skin().classPrefix}"])`
const findFirstHostMenu = cacheFirstMatch<HTMLElement>(hostMenuSelector)

/** The portaled card the host's menu `trigger` opened, or null. Several host menus can stand at once (a card the host keeps while it fades out, a panel's menu, another plugin's), so the first one in the document can be anyone's: the card is matched to its trigger through the anchor pair the host's Menu writes (MENU_ANCHOR_NAME_PROPERTY), and the kept first card is checked before the document is walked. */
export function findHostMenuOf(trigger: Element | null): HTMLElement | null {
  const name = trigger === null ? '' : inlineStyleAbove(trigger, MENU_ANCHOR_NAME_PROPERTY)
  const first = name === '' ? null : findFirstHostMenu()
  if (first === null || first.style.getPropertyValue(MENU_POSITION_ANCHOR_PROPERTY) === name) return first
  for (const card of document.querySelectorAll<HTMLElement>(hostMenuSelector())) {
    if (card.style.getPropertyValue(MENU_POSITION_ANCHOR_PROPERTY) === name) return card
  }
  return null
}

/** The page's first menu or modal dialog, shown or not, kept per batch (D40). */
const findForegroundNode = cacheFirstMatch<HTMLElement>(FOREGROUND_SELECTOR)

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
export function observeComposerCards(onChange?: () => void) {
  return observeMatches<HTMLElement>(COMPOSER_CARD, onChange)
}

/** The composer placeholders, kept current by the bus (D40); the skin's synthetic one is a match too. */
export function observeComposerPlaceholders() {
  return observeMatches<HTMLElement>(COMPOSER_PLACEHOLDER)
}

export const findComposerCard = cacheFirstMatch<HTMLElement>(COMPOSER_CARD)

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

/** The first marked figure in the composer stack, kept while it stays the document's first match (D40). */
const findComposerStatFigure = cacheFirstMatch<HTMLElement>(COMPOSER_STAT_SELECTOR)

/**
 * The host's statistics in the composer stack: the element the marked figures share; null when the host draws none, which every reader tolerates. The kept figure is re-checked for connection and first position on every call, so a stack the host replaced answers the next pass without a new document query.
 */
export function findComposerStats() {
  const figure = findComposerStatFigure()
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
export const findPageComposerSeat = cacheFirstMatch<HTMLElement>(COMPOSER_SELECTOR)

/** The session scroller: the element the host hangs its own follow off (D40). */
export const findConversationScroller = cacheFirstMatch<HTMLElement>(CONVERSATION_SCROLL_SELECTOR)

/** The main conversation's phase root, whose own header and content are siblings (D3). */
export const findMainConversationFrame = cacheFirstMatch<HTMLElement>(`${CONVERSATION_MAIN_SLOT_SELECTOR} > [${PHASE_ATTRIBUTE}]`)

/** The host header around one of its controls (D3). */
export function closestConversationHeader(node: Element | null) {
  return node?.closest<HTMLElement>(CONVERSATION_HEADER_SELECTOR) ?? null
}

/** The session's breadcrumb in its header (D3). */
export function conversationHeaderTitle(header: ParentNode) {
  return header.querySelector<HTMLElement>(HEADER_TITLE_SELECTOR)
}

/** The right-hand control clusters that share the conversation's title row (D3). */
export function conversationHeaderTools(row: ParentNode) {
  return {
    utilities: row.querySelector<HTMLElement>(HEADER_UTILITIES_SELECTOR),
    corner: row.querySelector<HTMLElement>(HEADER_CORNER_SELECTOR),
  }
}

/** The session menu trigger inside its host utility cluster (D3). */
export function conversationHeaderMore(utilities: ParentNode | null) {
  return utilities?.querySelector<HTMLButtonElement>(HEADER_MORE_TRIGGER_SELECTOR) ?? null
}

/** The shown conversation: the element carrying its session id, and the id itself. */
const CONVERSATION_SESSION_ATTR = CONVERSATION_SESSION_ATTRIBUTE
const CONVERSATION_SESSION = `[${CONVERSATION_SESSION_ATTR}]`

/** The shown conversation, kept while it stays the document's first match: a session switch mounts the next one, and an earlier match invalidates the kept element. */
export const findConversationSession = cacheFirstMatch<HTMLElement>(CONVERSATION_SESSION_SELECTOR)

export function closestConversationSession(node: EventTarget | null | undefined) {
  return closestFrom(node, CONVERSATION_SESSION)
}

/** A node outside conversations is shared UI; a retained inactive conversation owns no current stream (D3, D91). */
export function inCurrentConversation(node: Element) {
  const owner = closestConversationSession(node)
  return owner === null || owner === findConversationSession()
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

/** The host's composer stack: the composer card with the cards stacked above it, and on the new-session page the hero around them. */
export const COMPOSER_STACK = COMPOSER_STACK_SELECTOR

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
    beforePaint: true,
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
