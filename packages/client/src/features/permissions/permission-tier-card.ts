import { AUTO_POPOVER_ALL } from '../../constants'
import { readPrefs } from '../../core/prefs'
import { buildElement, setAttributeIfChanged } from '@dsh-claude-style/engine/dom'
import { POPOVER_CLOSE_DELAY, POPOVER_OPEN_DELAY, buildPopoverItem, closeOtherPopovers, createHoverIntent, positionAnchoredPopover, pressKeepsPopoverOpen, registerPopover, setMenuPopoverOpen, unregisterPopover } from '../../shared/popover'
import type { PermissionCatalog } from './permission-catalog'

/** Names one card's trigger and popover across a client reload's orphaned nodes. */
export const PERMISSION_OWNER_ATTR = 'data-dsh-claude-perm-owner'

/**
 * The permission tier card: the trigger with the running preset's name, the
 * popover of preset rows it opens, and the document listeners that close it.
 * The nodes are adopted from a re-render when the pass finds them standing
 * (stray-nodes.ts); the words and rows come from the catalog
 * (permission-catalog.ts), and a pick is handed to the caller's path.
 */
export function createPermissionCard(catalog: Pick<PermissionCatalog, 'restingLabel' | 'presetLabel' | 'presetDesc' | 'offeredPresets'>, popoverKey: string) {
  let permContainer: HTMLElement | null = null
  let permBtn: HTMLButtonElement | null = null
  let permLabel: HTMLElement | null = null
  let permPopover: HTMLElement | null = null
  let permHoverIntent: ReturnType<typeof createHoverIntent> | null = null
  /** The pick path the rows call back into; the rows are rebuilt, the path is not. */
  let permPick: ((preset: string) => void) | null = null
  /** Where the tier list hangs off its trigger: above it, left-aligned with it. */
  const PERM_POPOVER_PLACEMENT = { side: 'above-left', gap: 6, important: true } as const
  /** What the popover's rows currently render, so a change rebuilds them. */
  let renderedRows = ''
  let renderedRowsFor: HTMLElement | null = null

  let permDocPointerListener: ((e: PointerEvent) => void) | null = null
  let permResizeListener: (() => void) | null = null

  /** Whether the hover preference covers this picker: the `all` scope alone. */
  function permHoverOn() {
    return readPrefs().autoPopover === AUTO_POPOVER_ALL
  }

  /**
   * Whether this press leaves the tier card alone
   * (shared/popover.ts::pressKeepsPopoverOpen): the dwell opened it, the
   * pointer is on the trigger, so the press is not a second decision.
   */
  function pressKeepsPermOpen() {
    return pressKeepsPopoverOpen(permHoverOn(), permBtn !== null && permBtn.getAttribute('data-open') === 'true')
  }

  /** Every dismiss route (item pick, outside pointer, resize/scroll, Escape) closes the menu through this one path. */
  function closePermMenu() {
    if (permBtn === null || permPopover === null) return
    permBtn.removeAttribute('data-open')
    permBtn.setAttribute('aria-expanded', 'false')
    setMenuPopoverOpen(permPopover, false)
  }

  /**
   * One popover row for one preset: its name and the line under it from the
   * sources the trigger reads as well, and the active check. No glyph: the
   * tiers read as one list, and a preset's own `icon` — which the host ignores
   * natively — is left out so the rows stay consistent with each other.
   */
  function buildPermRow(preset: string) {
    const built = buildPopoverItem({ role: 'menuitemradio', lines: 2, check: true })
    const item = built.row
    item.setAttribute('data-preset', preset)
    built.text.textContent = catalog.presetLabel(preset)
    // Two lines and a check were asked for, so both slots are there.
    built.desc!.textContent = catalog.presetDesc(preset)
    built.check!.textContent = '✓'
    built.check!.hidden = true

    item.addEventListener('click', e => {
      e.stopPropagation()
      closePermMenu()
      if (permPick !== null) permPick(preset)
    })

    return item
  }

  /**
   * Rebuild the popover's rows when the set of offered presets or any row's
   * words change. Rows come from the host's catalog, so a preset a plugin
   * registers while the page stays open appears without a reload, and one it
   * withdraws disappears; the name and the line under it carry the interface
   * language, so a language switch repaints the rows here. An unchanged
   * signature leaves the DOM alone (the pass runs on every mutation).
   *
   * The rendered signature is kept WITH the element it was rendered into: a
   * new popover starts empty (the hero view takes the old one out of the
   * tree), so a signature that merely matches the previous one must not
   * skip filling this one.
   */
  function syncPermRows() {
    if (permPopover === null) return
    const wanted = catalog.offeredPresets()
    const signature = wanted.map(preset => `${preset}=${catalog.presetLabel(preset)}=${catalog.presetDesc(preset)}`).join('|')
    if (signature === renderedRows && renderedRowsFor === permPopover) return
    renderedRows = signature
    renderedRowsFor = permPopover
    while (permPopover.firstChild !== null) permPopover.removeChild(permPopover.firstChild)
    for (let i = 0; i < wanted.length; i++) permPopover.appendChild(buildPermRow(wanted[i]))
  }

  registerPopover(popoverKey, closePermMenu)

  /** Put an open tier card back over its trigger; every other place leaves it where it was. */
  function placeOpenPermCard() {
    if (permBtn === null || permPopover === null) return
    if (permBtn.getAttribute('data-open') !== 'true') return
    positionAnchoredPopover(permBtn, permPopover, PERM_POPOVER_PLACEMENT)
  }

  function buildPermTriggerAndPopover(onPick: (preset: string) => void) {
    permPick = onPick
    const container = buildElement('div', 'dsh-claude-perm-container')
    container.setAttribute(PERMISSION_OWNER_ATTR, popoverKey)

    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = 'dsh-claude-perm-btn'
    btn.setAttribute('aria-haspopup', 'menu')
    btn.setAttribute('aria-expanded', 'false')

    const label = buildElement('span', 'dsh-claude-perm-label', catalog.restingLabel())

    btn.appendChild(label)

    const popover = buildElement('div', 'dsh-claude-popover-card dsh-claude-perm-popover')
    popover.setAttribute(PERMISSION_OWNER_ATTR, popoverKey)
    setMenuPopoverOpen(popover, false)

    function openPerm() {
      // A trigger the page cannot act through (the cold start screen) never
      // opens its card: the press belongs to the workspace pick under it.
      if (btn.disabled) return
      if (permHoverIntent) permHoverIntent.cancel()
      closeOtherPopovers(popoverKey)
      positionAnchoredPopover(btn, popover, PERM_POPOVER_PLACEMENT)
      btn.setAttribute('data-open', 'true')
      btn.setAttribute('aria-expanded', 'true')
      setMenuPopoverOpen(popover, true)
    }

    permHoverIntent = createHoverIntent(openPerm, closePermMenu, POPOVER_OPEN_DELAY, POPOVER_CLOSE_DELAY)

    // The listeners read the intent in force when they fire: a rebuild replaces it.
    btn.addEventListener('mouseenter', () => {
      if (permHoverOn()) permHoverIntent!.scheduleOpen()
    })
    btn.addEventListener('mouseleave', () => {
      if (permHoverOn()) permHoverIntent!.scheduleClose()
    })
    popover.addEventListener('mouseenter', () => {
      permHoverIntent!.cancel()
    })
    popover.addEventListener('mouseleave', () => {
      permHoverIntent!.scheduleClose()
    })

    btn.addEventListener('click', e => {
      e.stopPropagation()
      if (btn.getAttribute('data-open') === 'true') {
        // A press on the card the dwell just opened leaves it up: the reader's
        // hand is already on the trigger, and it is the leave that closes.
        if (pressKeepsPermOpen()) return
        closePermMenu()
      } else {
        openPerm()
      }
    })

    if (!permDocPointerListener) {
      permDocPointerListener = e => {
        if (permPopover && permBtn && permPopover.getAttribute('data-open') === 'true') {
          // A SECOND button of the mouse must not fold the card either: the
          // pointer never left the trigger, so this is not the reader's way out.
          if (permBtn.contains(e.target as Node)) {
            if (!pressKeepsPermOpen()) closePermMenu()
            return
          }
          if (!permPopover.contains(e.target as Node)) closePermMenu()
        }
      }
      document.addEventListener('pointerdown', permDocPointerListener)
    }

    if (!permResizeListener) {
      permResizeListener = () => {
        if (permPopover && permBtn && permPopover.getAttribute('data-open') === 'true') closePermMenu()
      }
      window.addEventListener('resize', permResizeListener)
      window.addEventListener('scroll', permResizeListener, true)
    }

    container.appendChild(btn)
    document.body.appendChild(popover)
    // The nodes are the card's own from here on: the pass reaches them through
    // container(), update() writes them, and the next pass reuses them instead
    // of building a second trigger (the adopt path records them the same way).
    permContainer = container
    permBtn = btn
    permLabel = label
    permPopover = popover

    return {
      container,
      btn,
      label,
      popover
    }
  }

  /**
   * Mirror the running preset onto the trigger and its rows. `inert` marks the
   * cold start screen, which has no session to switch: the trigger reads the
   * preset a new session starts in and takes no input, so a press falls through
   * to the workspace pick the card itself performs.
   */
  function updatePermState(preset: string | null, inert: boolean) {
    if (!permLabel || !permPopover) return
    if (permBtn !== null && permBtn.disabled !== inert) permBtn.disabled = inert
    if (inert && permPopover.getAttribute('data-open') === 'true') closePermMenu()
    // The rows follow the host's catalog: one it does not serve is not
    // drawn at all, and one it starts serving appears.
    syncPermRows()
    // The running preset reads under the name the interface language gives
    // it; a value no preset carries (the host's `custom`) reads as the host's
    // own word for it rather than as the machine value.
    const matchedLabel = preset === null ? catalog.restingLabel() : catalog.presetLabel(preset)
    // Same-value guards: this runs on every pass, and an identical write still
    // lands — a replaced text node, a written attribute — a mutation that
    // schedules the next pass, so the page never went idle.
    if (permLabel.textContent !== matchedLabel) permLabel.textContent = matchedLabel

    const items = permPopover.querySelectorAll('[data-preset]')
    for (let j = 0; j < items.length; j++) {
      const it = items[j]
      const isCurrent = it.getAttribute('data-preset') === preset
      const check = it.querySelector<HTMLElement>('.dsh-claude-popover-check')
      if (check) check.toggleAttribute('hidden', !isCurrent)
      it.toggleAttribute('data-active', isCurrent)
      // One preset out of the list is current: the row says so itself, so the
      // check mark is not the only thing carrying the choice.
      setAttributeIfChanged(it, 'aria-checked', String(isCurrent))
    }
  }

  return {
    /** The container the pass last built or adopted, for the stray scan. */
    container: () => permContainer,
    /** The popover this card owns, or null before its first build or adoption. */
    popover: () => permPopover,
    /** Build a fresh trigger and card; the caller mounts the container. */
    build: buildPermTriggerAndPopover,
    /** Adopt nodes a re-render left standing; `strayPopover` stands in while none is held. */
    adopt(adopted: HTMLElement, btn: HTMLButtonElement | null, label: HTMLElement | null, strayPopover: HTMLElement | null) {
      adopted.setAttribute(PERMISSION_OWNER_ATTR, popoverKey)
      if (strayPopover !== null) strayPopover.setAttribute(PERMISSION_OWNER_ATTR, popoverKey)
      permContainer = adopted
      permBtn = btn
      permLabel = label
      // The container can be adopted from a generation whose disposals a
      // client reload dropped; its popover is still in the document, and
      // without it updatePermState would early-return forever.
      if (permPopover === null) permPopover = strayPopover
    },
    /** Forget the nodes, taking the popover out of the document. */
    clear() {
      if (permPopover !== null && permPopover.parentElement !== null) {
        permPopover.parentElement.removeChild(permPopover)
      }
      permContainer = null
      permBtn = null
      permLabel = null
      permPopover = null
    },
    /** Mirror the running preset onto the trigger and its rows. */
    update: updatePermState,
    /** Every dismiss route closes the menu through this one path. */
    close: closePermMenu,
    /** Put an open tier card back over its trigger. */
    placeOpen: placeOpenPermCard,
    /** Take the listeners and the registry entry down; the node sweep is the feature's teardown's (permissions.ts). */
    dispose() {
      unregisterPopover(popoverKey)
      if (permHoverIntent) permHoverIntent.cancel()
      if (permDocPointerListener) {
        document.removeEventListener('pointerdown', permDocPointerListener)
        permDocPointerListener = null
      }
      if (permResizeListener) {
        window.removeEventListener('resize', permResizeListener)
        window.removeEventListener('scroll', permResizeListener, true)
        permResizeListener = null
      }
      permContainer = null
      permBtn = null
      permLabel = null
      permPopover = null
    },
  }
}
