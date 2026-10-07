import { AUTO_POPOVER_ALL, HERO_MENU_ATTR } from '../../constants'
import { MENU_ROLE_SELECTOR } from '@dsh-claude-style/contracts/dom'
import { readPrefs } from '../../core/prefs'
import { closestFrom, createStamp } from '../../shared/dom'
import { POPOVER_CLOSE_DELAY, POPOVER_OPEN_DELAY, closeOtherPopovers, createHoverIntent, registerPopover, resolveAnchoredPosition, unregisterPopover } from '../../shared/popover'
import type { HostContext } from '../../core/host'
import type { FeatureUi } from '../../core/feature'
import type manifest from './hero-menu.manifest'

/**
 * The hero row's two pickers — the workspace (directory) chip and the
 * agent-preset seat — both open the host's shared menu primitive, which
 * portals its card to <body>. That card carries no marker of its own, so a
 * stylesheet cannot tell it apart from the host's other menus (sidebar row
 * menus, the settings permission row, submenus) — and it has to: this skin
 * redraws these two and leaves the rest alone.
 *
 * So the browser half stamps the open card rather than guessing in CSS.
 * While either trigger reports `aria-expanded="true"`, the one host menu
 * sitting in <body> is that card; HERO_MENU_ATTR is what
 * features/hero-menu/hero-menu.css switches on, and its value (`workspace` or
 * `preset`) names the picker, since the two cards are drawn differently.
 *
 * The scheduler's attributeFilter does not watch `aria-expanded`, but the
 * card is inserted into <body> as it opens — a childList mutation the pass
 * already observes — so the stamp lands on the frame the menu appears. Two
 * candidates mean an unrelated menu is open as well: the pass then leaves
 * every card alone rather than stamping the wrong one.
 *
 * The host drops that card below its trigger, which is exactly where the
 * composer sits: it would land on the input area and on the controls in it.
 * This row sits above the composer, so the card is placed the way the skin's
 * own composer pickers sit on their triggers — right-aligned with the
 * trigger and opening upward, flipped below it only when the viewport leaves
 * no room above. The host re-places the card from its own geometry on every
 * frame while the card is open, and an inline `left` / `top` written here
 * would live only until the host's next frame. The position therefore
 * travels in two custom properties, which the host's style writes never
 * touch, and
 * features/hero-menu/hero-menu.css reads them with `!important`: an author
 * `!important` declaration outranks the host's plain inline value, so the
 * card holds this position from the pass that stamps it onward. The
 * scheduler's scroll/resize hook re-applies it when the anchor moves.
 *
 * Hover is the host's own click handler driven from here: the "Open popovers
 * on hover" preference's `all` scope covers these two, and the host offers no
 * hover of its own. The listeners are delegated from the document because
 * React replaces the triggers, and the close waits out the gap between the
 * trigger and the card so crossing it does not shut the menu.
 */
export function install(ctx: HostContext, ui: FeatureUi<typeof manifest>) {
  /** Air between the trigger and its card, as the skin's other pickers take. */
  const GAP = 6
  /** The two triggers, and the card once it is stamped. */
  const TRIGGER_SELECTOR = '[class*="heroWorkspaceRow"] [aria-haspopup="menu"]'
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
  /**
   * The hover dwell and grace, shared with the skin's own pickers: the dwell
   * swallows a pointer merely crossing the hero row, the grace lets it
   * travel the gap between the trigger and the card.
   */
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

  /**
   * Open what hover asked for, once the pointer has stayed the dwell out.
   * The host's menu has no hover of its own — this clicks its trigger — so
   * the dwell is what keeps a pointer merely crossing the hero row from
   * unfolding the card.
   */
  function openFromHover(trigger: HTMLElement) {
    if (!hoverEnabled()) return
    if (trigger.getAttribute('aria-expanded') === 'true') return
    // One card at a time. The row carries two pickers — the workspace chip and
    // the preset seat — and they are two independent host menus, while the
    // shared registry holds ONE entry for the row. The sibling therefore has
    // to be folded here: crossing from the preset straight to the workspace
    // chip left both cards up, and syncHeroMenu (which stamps and places a
    // single card) then placed neither.
    closeSiblingHeroMenus(trigger)
    closeOtherPopovers('hero')
    trigger.click()
    openedByHover = true
    hoverTrigger = trigger
  }

  /**
   * Close every open hero menu, whatever opened it — a hover or a click. The
   * shared popover rule calls this when another popover opens; the hover-leave
   * path comes through closeFromHover below, which closes only what hover
   * opened.
   */
  function closeHeroMenu() {
    hoverIntent.cancel()
    pendingTrigger = null
    openedByHover = false
    hoverTrigger = null
    const open = openTriggers()
    for (let i = 0; i < open.length; i++) open[i].click()
  }

  /** Close what hover opened; a click-opened menu is left alone. */
  function closeFromHover() {
    if (!openedByHover) return
    const trigger = hoverTrigger
    openedByHover = false
    hoverTrigger = null
    if (trigger === null || trigger.getAttribute('aria-expanded') !== 'true') return
    trigger.click()
  }

  /**
   * The row's other open picker, folded so only one card can be up. The list
   * is read before the first press: a press re-renders the host's row, and a
   * node it replaced answers no click anyway.
   */
  function closeSiblingHeroMenus(trigger: HTMLElement) {
    const open = openTriggers()
    for (let i = 0; i < open.length; i++) {
      if (open[i] !== trigger) open[i].click()
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
   * Which picker a trigger opens, written as the stamp's value so the
   * stylesheet can draw the two cards apart. The workspace chip is the
   * button carrying the host's workspace label; the composer card's own
   * workspace trigger opens that same picker; anything else in the row is
   * the agent-preset seat.
   */
  function pickerKind(trigger: HTMLElement) {
    if (trigger.querySelector('[class*="_workspaceLabel"]') !== null) return 'workspace'
    if (closestFrom(trigger, '[class*="cardWorkspaceTrigger"]') !== null) return 'workspace'
    return 'preset'
  }

  function clearStamp() {
    cardStamp.release()
    stampedTrigger = null
  }

  /** The hero row's open pickers: the workspace chip and the preset seat. */
  function rowTriggers() {
    const nodes = document.querySelectorAll<HTMLElement>('[class*="heroWorkspaceRow"] [aria-haspopup="menu"][aria-expanded="true"]')
    const found: HTMLElement[] = []
    for (let i = 0; i < nodes.length; i++) found.push(nodes[i])
    return found
  }

  /**
   * The open pickers, one entry each. The composer card's own workspace trigger
   * is a SECOND view of the same picker state as the row's chip (both read the
   * host's `pickerOpen`), so it stands in only when the row carries no open
   * picker: pressing both views in one task toggles the picker shut and open
   * again.
   */
  function openTriggers() {
    const row = rowTriggers()
    if (row.length > 0) return row
    const card = document.querySelector<HTMLElement>('[class*="cardWorkspaceTrigger"] [aria-expanded="true"]')
    return card === null ? [] : [card]
  }

  /** The trigger whose picker is open, or null. */
  function openTrigger() {
    const open = openTriggers()
    return open.length === 0 ? null : open[0]
  }

  /**
   * Park the card on its trigger: right-aligned with it and opening above it
   * by the same air the skin's own pickers take, flipped below when the
   * viewport leaves no room above, and clamped to the viewport either way.
   * A card that has not been laid out yet is left for the next pass rather
   * than pinned to a zero-sized guess.
   */
  function placeCard(trigger: HTMLElement, card: HTMLElement) {
    const rect = trigger.getBoundingClientRect()
    const width = card.offsetWidth
    const height = card.offsetHeight
    if (width === 0 || height === 0) return
    // The shared above-anchor geometry; the answer goes into custom
    // properties the host's own per-frame style writes never touch (see
    // the header note).
    const { x, y } = resolveAnchoredPosition(rect, width, height, { gap: GAP })
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
    // Both of the row's pickers being open at once — a click on the second
    // trigger is enough — is the state this feature exists to prevent, and
    // with two cards up neither can be stamped or placed. The picker the
    // pointer is on stays (a click on it is the newest intent), the row's
    // other pickers fold. The hover path never arrives here: openFromHover
    // folds the sibling before it presses.
    const open = openTriggers()
    if (open.length > 1) {
      closeSiblingHeroMenus(pointerTrigger !== null && open.includes(pointerTrigger) ? pointerTrigger : trigger)
      clearStamp()
      return
    }
    // The skin's own popovers carry their own classes, so excluding them
    // leaves the host's menus only.
    const cards = document.querySelectorAll<HTMLElement>(`body > ${MENU_ROLE_SELECTOR}:not([class*="dsh-claude"])`)
    if (cards.length !== 1) {
      clearStamp()
      return
    }
    if (cardStamp.current() !== cards[0]) stampedTrigger = trigger
    cardStamp.mark(cards[0], pickerKind(trigger))
    placeCard(trigger, cards[0])
  }

  // The hero row's two host menus take part in the shared popover rule
  // (shared/popover.ts): the entry closes whatever menu the row has open,
  // however that menu was opened.
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
    delete ui.heroMenu
  }
}
