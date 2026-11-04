import { COMPOSER_CARD_SELECTOR, COMPOSER_STAT_SELECTOR, DIALOG_TRIGGER_SELECTOR } from '@dsh-claude-style/contracts/dom'
import { observeMatches } from '@dsh-claude-style/engine/bus'
import { cacheFirstMatch, findComposerCard, findDockedContextMeter, observeComposerCards } from '@dsh-claude-style/engine/host'
import { removeStrayNodes } from '../../shared/popover'
import type { MatchList } from '@dsh-claude-style/engine/bus'

/**
 * The host's context panel and the marks this feature puts on the host's
 * nodes: which node is the panel, whether the host drew
 * its detailed statistics row, and what a generation before this one left
 * behind.
 */

/** The mark on the block this feature appends to the host's panel. */
export const CONTEXT_STATS_ATTR = 'data-dsh-claude-context-stats'
/** The mark on the host's panel itself, which is what takes the entrance. */
export const CONTEXT_PANEL_ATTR = 'data-dsh-claude-context-panel'
/** The mark that turns that reading on; written with the property, never without it. */
export const CONTEXT_PANEL_ALIGNED_ATTR = 'data-dsh-claude-context-aligned'

/**
 * The host's own marks on its three statistics dialogs — the two session
 * pills' and the per-turn token panel's. Their rows are a `dl` as well,
 * so the context panel is told from them by these marks.
 */
const HOST_STATS_DIALOGS = '[data-session-stats-details], [data-session-stats-usage], [data-turn-usage-details]'

/** The role every dialog on the page carries, wherever the host portals it. */
const DIALOG_ROLE_SELECTOR = '[role="dialog"]'

/** The dialog registry, taken on the first read of the panel and released with the feature. */
let dialogs: MatchList<HTMLElement> | null = null

/** The composer card registry, taken on the first card read and released with the feature (D40). */
let cards: MatchList<HTMLElement> | null = null

/** The mark on the host's context meter, which every reader of it goes through. */
export const CONTEXT_METER_ATTR = 'data-dsh-claude-context-meter'

/**
 * The host's context meter: the docked ring the composer row carries. Its node
 * is the host's and outlives a generation, so the mark keeping it for the bus's
 * first match is written by this feature (markContextMeter), not by the pass
 * that paints beside it.
 */
const markedMeter = cacheFirstMatch<HTMLElement>(`[${CONTEXT_METER_ATTR}]`)

export function findContextMeter() {
  return markedMeter() ?? findDockedContextMeter(findComposerCard())
}

/** Mark the host's meter, so the next read of it is the bus's kept answer. */
export function markContextMeter(meter: HTMLElement) {
  if (meter.hasAttribute(CONTEXT_METER_ATTR)) return
  meter.setAttribute(CONTEXT_METER_ATTR, '')
}

/**
 * The occupancy the meter reads, as a percentage, or null when the reading
 * cannot be taken. The host draws it as the trigger's own text, which is where
 * a host serving no context-pressure projection is read (meter-ring.ts).
 */
export function meterOccupancy(meter: HTMLElement) {
  const match = /(\d+(?:[.,]\d+)?)\s*%/.exec(meter.textContent ?? '')
  return match === null ? null : Number(match[1].replace(',', '.'))
}

/**
 * The meter's trigger: the host's own button, whose click opens and
 * closes the context panel.
 */
export function contextTrigger() {
  const meter = findContextMeter()
  return meter === null ? null : meter.querySelector('button')
}

/**
 * The composer card `node` belongs to: the card holding it, or the dock line
 * the card's own render puts after it — a meter and the line of figures stand
 * there, outside the card, while they are still that card's own.
 */
export function composerCardOf(node: Element | null | undefined) {
  if (node === null || node === undefined) return null
  const inside = node.closest(COMPOSER_CARD_SELECTOR)
  if (inside !== null) return inside
  const all = cardList().all()
  for (let i = 0; i < all.length; i += 1) {
    const dock = all[i].nextElementSibling
    if (dock !== null && dock.contains(node)) return all[i]
  }
  return null
}

/**
 * The meter belonging to `node`'s own composer card. A page can carry more
 * than one card — a sub-agent's docked conversation beside the main one — and
 * the host draws a meter for each, so a node in a card (or in the dock line
 * that card's render keeps) is answered by that card's meter rather than the
 * document's first.
 */
export function contextMeterOf(node: Element | null | undefined) {
  const card = composerCardOf(node)
  if (card === null) return findContextMeter()
  return findDockedContextMeter(card) ?? card.querySelector<HTMLElement>(`[${CONTEXT_METER_ATTR}]`)
}

/** The trigger inside the meter that belongs to `node`'s own card. */
export function contextTriggerOf(node: Element | null | undefined) {
  const meter = contextMeterOf(node)
  return meter === null ? null : meter.querySelector('button')
}

/**
 * Every meter on the page: one per composer card, the first match the
 * document holds included. The statistics pass binds each of them, so a card's
 * own meter opens its own panel.
 */
export function contextMeters() {
  const meters: HTMLElement[] = []
  const all = cardList().all()
  for (let i = 0; i < all.length; i += 1) {
    const meter = contextMeterOf(all[i])
    if (meter !== null && !meters.includes(meter)) meters.push(meter)
  }
  const first = findContextMeter()
  if (first !== null && !meters.includes(first)) meters.push(first)
  return meters
}

/** The trigger of the meter whose panel is up: the anchor a panel is placed against. */
export function expandedContextTrigger() {
  const meters = contextMeters()
  for (let i = 0; i < meters.length; i += 1) {
    const trigger = meters[i].querySelector('button')
    if (trigger !== null && trigger.getAttribute('aria-expanded') === 'true') return trigger
  }
  return null
}

/**
 * The host's context panel: the dialog it portals to <body>.
 *
 * A `dl` alone does not name it. The host's three statistics dialogs
 * carry one too, and so does a popover whose content holds one
 * (dsh-better-sidebar's agent node detail, portaled to the same <body>).
 * The three are excluded by the marks on them, and the panel is named by
 * where its rows sit: the host puts the grid directly in the panel, while
 * a popover keeps its `dl` inside the card that paints the surface. The
 * box carrying that card holds the positioning only, and paints nothing,
 * so a walk that stops there writes the numbers onto the page.
 */
export function contextPanel() {
  const dialogs = dialogList().all()
  for (let i = 0; i < dialogs.length; i++) {
    const dialog = dialogs[i]
    if (dialog.getAttribute('aria-modal') === 'true') continue
    if (dialog.querySelector(HOST_STATS_DIALOGS) !== null) continue
    if (dialog.querySelector(':scope > dl') === null) continue
    return dialog
  }
  return null
}

/**
 * The dialogs on the page, kept current by the bus (D40): the host portals its
 * dialogs to <body>, so the child list carries every one of them. The list is
 * taken on the first read and released with the feature.
 *
 * @param onChange - told in the batch that changed the set, before the browser
 *   computes style: where a panel's own bindings are taken in the frame it
 *   mounts in.
 */
export function observeDialogs(onChange?: () => void) {
  return observeMatches<HTMLElement>(DIALOG_ROLE_SELECTOR, onChange)
}

/** The dialogs on the page, the list every read of the panel goes through. */
function dialogList() {
  dialogs ??= observeDialogs()
  return dialogs
}

/** Drop the dialog registry; the feature's teardown calls this. */
export function releaseDialogWatch() {
  dialogs?.release()
  dialogs = null
}

/** The composer cards on the page, the list every card read goes through. */
function cardList() {
  cards ??= observeComposerCards()
  return cards
}

/** Drop the composer card registry; the feature's teardown calls this. */
export function releaseCardWatch() {
  cards?.release()
  cards = null
}

/**
 * Take the block and the panel marks off the dialogs a generation before
 * this one wrote them on: a client hot reload drops the previous
 * generation's disposals without running them, so what it left on a node
 * it wrongly took for the panel would stay there for good. The host's
 * panel keeps the block it holds, and the pass that follows fills it.
 */
export function clearStrayContextNodes() {
  const panel = contextPanel()
  const kept = panel === null ? null : panel.querySelector(`[${CONTEXT_STATS_ATTR}]`)
  removeStrayNodes(document, `[${CONTEXT_STATS_ATTR}]`, [kept])
  const marked = document.querySelectorAll(`[${CONTEXT_PANEL_ATTR}]`)
  for (let i = 0; i < marked.length; i++) {
    if (marked[i] === panel) continue
    marked[i].removeAttribute(CONTEXT_PANEL_ATTR)
    marked[i].removeAttribute(CONTEXT_PANEL_ALIGNED_ATTR)
  }
}

/**
 * Whether the host rendered its DETAILED statistics row, which is the
 * host's own answer to how much of these numbers it shows: detailed gets
 * the whole set, compact the four figures the compact row leaves out.
 *
 * The host keeps the performanceUsage mode in React state and puts no
 * marker on the DOM, so the two structures have to be told apart by
 * shape. Detailed wraps each pill in an anchor span and makes the
 * dialog-carrying ones buttons; compact renders bare span pills with no
 * trigger and no dialog. The wrapper check catches the detailed pill
 * whose dialog has no rows yet — a static span, not a button. The row is
 * HIDDEN by the stylesheet but still rendered, which is what makes this
 * readable.
 */
export function hostStatsDetailed(root: Element) {
  // The current host marks each figure and leaves the container unmarked; an
  // older one marks the container alone. Detailed reads the same in both: a
  // figure carries the dialog trigger, compact is a bare reading.
  const figures = root.querySelectorAll(COMPOSER_STAT_SELECTOR)
  if (figures.length > 0) {
    for (let i = 0; i < figures.length; i++) {
      if (figures[i].querySelector(DIALOG_TRIGGER_SELECTOR) !== null) return true
    }
    return false
  }
  if (root.querySelector(DIALOG_TRIGGER_SELECTOR) !== null) return true
  const children = root.children
  for (let i = 0; i < children.length; i++) {
    if (children[i].querySelector('button, span') !== null) return true
  }
  return false
}
