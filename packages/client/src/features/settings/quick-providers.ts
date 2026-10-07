import { MODEL_OFFICIAL_GROUP } from '../model/copy-fallbacks'
import { settingsCopy } from '../../core/i18n'
import { readPrefs } from '../../core/prefs'
import { buildElement } from '../../shared/dom'
import { POPOVER_CHECK_SVG, buildPopoverItem, closeOtherPopovers, positionAnchoredPopover, registerPopover, setMenuPopoverOpen, unregisterPopover } from '../../shared/popover'
import type { HostContext } from '../../core/host'
import type { CloseReason, FeatureHandle, Ui } from '../../core/scheduler'
import type { CatalogProvider } from '../model/catalog'

/** Writes the chosen provider ids back to the preferences. */
type QuickProvidersWrite = (next: string[]) => void

/** The quick-provider picker's handle: the settings row opens and closes the card through it. */
export interface QuickProvidersHandle extends FeatureHandle {
  toggle(trigger: HTMLElement, write: QuickProvidersWrite): void
  isOpen(): boolean
}

/**
 * The settings page's quick-provider picker — the providers whose models the
 * model picker's first level carries.
 *
 * It is the permission popover's design in multi-select form: the shared
 * popover card and rows (shared/popover.css), with the accent check marking
 * the chosen providers. It is a
 * settings control rather than a takeover, so it opens on click only —
 * hovering a settings row should not unfold a menu — and it stays open while
 * rows are toggled.
 *
 * The card is appended to <body> rather than rendered inside the settings row:
 * a dialog clips and may transform its own subtree, so a `position: fixed`
 * card in there would be positioned against the dialog, not the viewport.
 */
export function install(ctx: HostContext, ui: Ui) {
  let card: HTMLElement | null = null
  let cardBody: HTMLElement | null = null
  let anchor: HTMLElement | null = null
  let onWrite: QuickProvidersWrite | null = null
  let providers: CatalogProvider[] = []
  let unsubscribe: (() => void) | null = null

  function close() {
    if (card !== null && card.parentElement) card.parentElement.removeChild(card)
    if (anchor !== null) anchor.setAttribute('aria-expanded', 'false')
    card = null
    cardBody = null
    anchor = null
    onWrite = null
    document.removeEventListener('pointerdown', onOutsidePointerDown, true)
    document.removeEventListener('keydown', onKeyDown, true)
  }

  function onOutsidePointerDown(e: PointerEvent) {
    if (card === null) return
    const target = e.target as Node | null
    if (card.contains(target)) return
    if (anchor !== null && anchor.contains(target)) return
    close()
  }

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape') close()
  }

  /** One provider: its name, how many models it offers, and a check when chosen. */
  function buildRow(provider: CatalogProvider, chosen: boolean, stale: boolean) {
    const built = buildPopoverItem({ role: 'menuitemcheckbox', badge: true, check: true })
    const row = built.row
    if (stale) row.classList.add('dsh-claude-popover-item-stale')
    row.setAttribute('aria-checked', chosen ? 'true' : 'false')
    built.text.textContent = provider.name
    // badge and check were both asked for above.
    built.badge!.textContent = stale ? settingsCopy('quickRemoved', 'Removed') : String(provider.count)
    built.check!.innerHTML = chosen ? POPOVER_CHECK_SVG : ''
    row.addEventListener('click', e => {
      e.stopPropagation()
      const next = readPrefs().quickProviders.slice()
      const at = next.indexOf(provider.id)
      if (at === -1) next.push(provider.id)
      else next.splice(at, 1)
      if (typeof onWrite === 'function') onWrite(next)
      renderBody()
    })
    return row
  }

  function renderBody() {
    if (cardBody === null) return
    while (cardBody.firstChild) cardBody.removeChild(cardBody.firstChild)
    if (providers.length === 0) {
      cardBody.appendChild(buildElement('div', 'dsh-claude-popover-status', settingsCopy('quickLoading', 'Loading providers…')))
      return
    }
    const chosen = readPrefs().quickProviders
    // The official service always leads the first level, so it is not a
    // choice here: it is never listed, and a stored id for it is pruned on
    // load. A provider that vanished from the catalog still appears, marked
    // removed, so it can be unchecked out of the stored list instead of
    // lingering invisibly.
    const known: Record<string, boolean> = {}
    for (let i = 0; i < providers.length; i++) {
      if (providers[i].id === MODEL_OFFICIAL_GROUP) continue
      known[providers[i].id] = true
      cardBody.appendChild(buildRow(providers[i], chosen.includes(providers[i].id), false))
    }
    for (let s = 0; s < chosen.length; s++) {
      if (chosen[s] === MODEL_OFFICIAL_GROUP || known[chosen[s]]) continue
      cardBody.appendChild(buildRow({ id: chosen[s], name: chosen[s], count: 0 }, true, true))
    }
  }

  function open(trigger: HTMLElement, write: QuickProvidersWrite) {
    closeOtherPopovers('quickProviders')
    anchor = trigger
    anchor.setAttribute('aria-expanded', 'true')
    onWrite = write
    providers = typeof ui.model?.providers === 'function' ? ui.model.providers() : []
    card = buildElement('div', 'dsh-claude-popover-card dsh-claude-quick-popover')
    setMenuPopoverOpen(card, true)
    cardBody = buildElement('div', 'dsh-claude-popover-body')
    card.appendChild(cardBody)
    renderBody()
    document.body.appendChild(card)
    positionAnchoredPopover(trigger, card, { side: 'above', gap: 6, important: true })
    document.addEventListener('pointerdown', onOutsidePointerDown, true)
    document.addEventListener('keydown', onKeyDown, true)
  }

  function toggle(trigger: HTMLElement, write: QuickProvidersWrite) {
    if (card === null) open(trigger, write)
    else close()
  }

  // The catalog arrives after the settings page may already be open, so an
  // open card follows it rather than showing an empty list until reopened.
  if (typeof ui.model?.onProviders === 'function') {
    unsubscribe = ui.model.onProviders(list => {
      providers = list
      if (card !== null) renderBody()
    })
  }

  registerPopover('quickProviders', close)

  const handle: QuickProvidersHandle = {
    toggle,
    /**
     * The card closes on composer focus (and when the settings page tears it
     * down, which calls this with no reason). Esc and an outside press are
     * NOT its dismiss routes, so those reasons are ignored.
     */
    close(reason?: CloseReason) {
      if (reason === 'escape' || reason === 'outside') return
      close()
    },
    isOpen() { return card !== null },
  }
  ui.quickProviders = handle
  return () => {
    close()
    unregisterPopover('quickProviders')
    if (unsubscribe !== null) {
      unsubscribe()
      unsubscribe = null
    }
    delete ui.quickProviders
  }
}
