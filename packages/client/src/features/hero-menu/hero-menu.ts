import { AUTO_POPOVER_ALL, HERO_MENU_ATTR } from '../../constants'
import { cacheFirstMatch, findHostMenu } from '@dsh-claude-style/engine/host'
import { readPrefs } from '../../core/prefs'
import { closestFrom, createStamp } from '@dsh-claude-style/engine/dom'
import { POPOVER_CLOSE_DELAY, POPOVER_MARGIN, POPOVER_OPEN_DELAY, anchorSpace, clampToViewport, closeOtherPopovers, createHoverIntent, isProgrammaticPress, pressKeepsPopoverOpen, programmaticPress, registerPopover, resolveAnchoredPosition, unregisterPopover } from '../../shared/popover'
import type { HostContext } from '@dsh-claude-style/engine/host'
import type { FeatureUi } from '../../core/feature'
import type manifest from './hero-menu.manifest'

/**
 * Stamp the host's portalled hero menu with its picker name, place it above the
 * trigger through `!important` custom properties, and drive the host's click
 * handler from delegated hover. Two open candidates leave every card alone.
 */
export function install(ctx: HostContext, ui: FeatureUi<typeof manifest>) {
  /** Air between the trigger and its card, as the skin's other pickers take. */
  const GAP = 6
  /** The two triggers, and the card once it is stamped. */
  const TRIGGER_SELECTOR = '[data-dsh-claude-part~="hero-workspace-row"] [aria-haspopup="menu"]'

/** The composer card's workspace trigger, cached while it stays first (D9). */
const findCardTrigger = cacheFirstMatch<HTMLElement>('[data-dsh-claude-part~="card-workspace-trigger"] [aria-expanded="true"]')
  const CARD_SELECTOR = `[${HERO_MENU_ATTR}]`
  /** The open card, marked with the picker it belongs to, and the trigger it was stamped for. */
  const cardStamp = createStamp<HTMLElement>(HERO_MENU_ATTR)
  let stampedTrigger: HTMLElement | null = null
  let openedByHover = false
  /** The trigger the hover opened. The row has TWO of them (workspace, preset). */
  let hoverTrigger: HTMLElement | null = null
  /** The hero trigger the pointer last entered: the picker a click just used. */
  let pointerTrigger: HTMLElement | null = null
  /** The trigger a scheduled hover open clicks when its dwell runs out. */
  let pendingTrigger: HTMLElement | null = null
  /** Shared dwell and grace: tolerate a crossing row and travel to the card. */
  const hoverIntent = createHoverIntent(
    () => {
      const trigger = pendingTrigger
      pendingTrigger = null
      if (trigger !== null) openFromHover(trigger)
    },
    () => { closeFromHover() },
    POPOVER_OPEN_DELAY,
    POPOVER_CLOSE_DELAY,
  )

  /** Click the host's trigger once the dwell has passed; the host's menu has no hover of its own. */
  function openFromHover(trigger: HTMLElement) {
    if (!hoverEnabled()) return
    if (trigger.getAttribute('aria-expanded') === 'true') return
    // One card at a time: the row's two pickers are two host menus while the
    // shared registry holds one entry, so the sibling folds here — crossing
    // between them otherwise left both cards up and neither placed.
    closeSiblingHeroMenus(trigger)
    closeOtherPopovers('hero')
    trigger.click()
    openedByHover = true
    hoverTrigger = trigger
  }

  /** Close every open hero menu, whatever opened it; the hover-leave path uses closeFromHover. */
  function closeHeroMenu() {
    hoverIntent.cancel()
    pendingTrigger = null
    openedByHover = false
    hoverTrigger = null
    const open = openTriggers()
    for (let i = 0; i < open.length; i++) programmaticPress(open[i])
  }

  /** Close what hover opened; a click-opened menu is left alone. */
  function closeFromHover() {
    if (!openedByHover) return
    const trigger = hoverTrigger
    openedByHover = false
    hoverTrigger = null
    if (trigger === null || trigger.getAttribute('aria-expanded') !== 'true') return
    programmaticPress(trigger)
  }

  /**
   * Fold the row's other open picker. The list is read before the first press: a
   * press re-renders the host's row, and a node it replaced answers no click.
   */
  function closeSiblingHeroMenus(trigger: HTMLElement) {
    const open = openTriggers()
    for (let i = 0; i < open.length; i++) {
      if (open[i] !== trigger) programmaticPress(open[i])
    }
  }

  /** The `all` scope only, and only while the composer restyle is in play. */
  function hoverEnabled() {
    return readPrefs().autoPopover === AUTO_POPOVER_ALL &&
           ui.composer !== undefined && ui.composer.isActive()
  }

  function onHeroPointerOver(e: MouseEvent) {
    if (!hoverEnabled()) return
    const target = e.target
    if (closestFrom(target, CARD_SELECTOR) !== null) {
      hoverIntent.cancel()
      return
    }
    const trigger = closestFrom(target, TRIGGER_SELECTOR)
    if (trigger === null) return
    pointerTrigger = trigger
    hoverIntent.cancel()
    if (trigger.getAttribute('aria-expanded') !== 'true') {
      pendingTrigger = trigger
      hoverIntent.scheduleOpen()
    }
  }

  function onHeroPointerOut(e: MouseEvent) {
    if (!hoverEnabled()) return
    const target = e.target
    if (closestFrom(target, CARD_SELECTOR) === null && closestFrom(target, TRIGGER_SELECTOR) === null) return
    // Moving onto the other half — the card, or the trigger — is not a leave.
    const next = e.relatedTarget
    if (closestFrom(next, CARD_SELECTOR) !== null || closestFrom(next, TRIGGER_SELECTOR) !== null) return
    pendingTrigger = null
    hoverIntent.scheduleClose()
  }

  document.addEventListener('mouseover', onHeroPointerOver, true)
  document.addEventListener('mouseout', onHeroPointerOut, true)

  /**
   * A press on a trigger whose card the dwell already opened keeps the card up:
   * the host's click toggles its menu and is delegated from the document, so the
   * press is stopped on its way there (as features/account/account-footer.ts does).
   */
  function onHeroPressCapture(e: MouseEvent) {
    if (isProgrammaticPress()) return
    const hovered = hoverEnabled()
    if (!hovered) return
    const target = e.target
    if (closestFrom(target, CARD_SELECTOR) !== null) return
    const trigger = closestFrom(target, TRIGGER_SELECTOR)
    if (trigger === null) return
    if (pressKeepsPopoverOpen(hovered, trigger.getAttribute('aria-expanded') === 'true')) e.stopPropagation()
  }

  document.addEventListener('click', onHeroPressCapture, true)

  /**
   * The stamp's value: the workspace chip and the composer card's own trigger
   * open the workspace picker, anything else in the row is the preset seat.
   */
  function pickerKind(trigger: HTMLElement) {
    if (trigger.querySelector('[data-dsh-claude-part~="workspace-chip-label"]') !== null) return 'workspace'
    if (closestFrom(trigger, '[data-dsh-claude-part~="card-workspace-trigger"]') !== null) return 'workspace'
    return 'preset'
  }

  function clearStamp() {
    cardStamp.release()
    stampedTrigger = null
  }

  /** The hero row's open pickers: the workspace chip and the preset seat. */
  function rowTriggers() {
    const nodes = document.querySelectorAll<HTMLElement>('[data-dsh-claude-part~="hero-workspace-row"] [aria-haspopup="menu"][aria-expanded="true"]')
    const found: HTMLElement[] = []
    for (let i = 0; i < nodes.length; i++) found.push(nodes[i])
    return found
  }

  /**
   * The open pickers, one entry each. The composer card's trigger is a second
   * view of the same picker state, so it stands in only when the row carries no
   * open picker: pressing both views in one task toggles the picker shut again.
   */
  function openTriggers() {
    const row = rowTriggers()
    if (row.length > 0) return row
    const card = findCardTrigger()
    return card === null ? [] : [card]
  }

  /** The trigger whose picker is open, or null. */
  function openTrigger() {
    const open = openTriggers()
    return open.length === 0 ? null : open[0]
  }

  /**
   * Park the card right-aligned with its trigger and opening above it by the
   * skin's own air, flipped below when the viewport leaves no room and clamped
   * either way. A card not yet laid out is left for the next pass.
   */
  function placeCard(trigger: HTMLElement, card: HTMLElement) {
    const width = card.offsetWidth
    const height = card.offsetHeight
    if (width === 0 || height === 0) return
    // The shared above-anchor geometry, written into custom properties the
    // host's per-frame style writes never touch.
    const space = anchorSpace(trigger)
    const resolved = resolveAnchoredPosition(space.rect, width, height, { gap: GAP, viewport: space.viewport })
    const { x, y } = clampToViewport(resolved, width, height, space.viewport, POPOVER_MARGIN)
    card.style.setProperty('--dsh-claude-hero-menu-x', `${Math.round(x)}px`)
    card.style.setProperty('--dsh-claude-hero-menu-y', `${Math.round(y)}px`)
  }

  /** Re-place an open card after a scroll or a resize moved its anchor. */
  function repositionHeroMenu() {
    const card = cardStamp.current()
    if (card === null || stampedTrigger === null) return
    placeCard(stampedTrigger, card)
  }

  function syncHeroMenu() {
    const trigger = openTrigger()
    if (trigger === null) {
      // The menu is shut — by a click, by Escape or by an outside press — so
      // whatever hover opened it no longer owns it.
      openedByHover = false
      hoverTrigger = null
      hoverIntent.cancel()
      clearStamp()
      return
    }
    // Two cards up (a click on the second trigger does it) is the state this
    // feature prevents: with both open neither can be stamped. The picker the
    // pointer is on stays, the rest fold; the hover path folds before pressing.
    const open = openTriggers()
    if (open.length > 1) {
      closeSiblingHeroMenus(pointerTrigger !== null && open.includes(pointerTrigger) ? pointerTrigger : trigger)
      clearStamp()
      return
    }
    // The host's card, read through the one accessor that keeps the answer
    // (D40): the skin's popovers carry a `dsh-claude-` class token.
    const card = findHostMenu()
    if (card === null) {
      clearStamp()
      return
    }
    if (cardStamp.current() !== card) stampedTrigger = trigger
    cardStamp.mark(card, pickerKind(trigger))
    placeCard(trigger, card)
  }

  // The row's two host menus take part in the shared popover rule
  // (shared/popover.ts): the entry closes whatever menu the row opened.
  registerPopover('hero', closeHeroMenu)

  ui.heroMenu = { sync: syncHeroMenu, reposition: repositionHeroMenu }
  return () => {
    hoverIntent.cancel()
    openedByHover = false
    hoverTrigger = null
    pointerTrigger = null
    clearStamp()
    unregisterPopover('hero')
    document.removeEventListener('mouseover', onHeroPointerOver, true)
    document.removeEventListener('mouseout', onHeroPointerOut, true)
    document.removeEventListener('click', onHeroPressCapture, true)
    delete ui.heroMenu
  }
}
