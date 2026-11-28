import { MODEL_ACCOUNT_GROUP, MODEL_OFFICIAL_GROUP } from '../../shared/model-labels'
import { modelGroupName } from '../../shared/provider-name'
import { readPrefs } from '../../core/prefs'
import { buildElement } from '@dsh-claude-style/engine/dom'
import { POPOVER_CHECK_SVG, buildPopoverItem, closeOtherPopovers, positionAnchoredPopover, registerPopover, setMenuPopoverOpen, unregisterPopover } from '../../shared/popover'
import type { HostContext } from '@dsh-claude-style/engine/host'
import type { CloseReason, FeatureHandle } from '@dsh-claude-style/engine/scheduler'
import type { FeatureUi } from '../../core/feature'
import type manifest from './quick-providers.manifest'
import type { CatalogProvider } from '../../shared/model-catalog'
import { copy } from './copy'

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
export function install(_ctx: HostContext, ui: FeatureUi<typeof manifest>) {
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
    if (unsubscribe !== null) {
      unsubscribe()
      unsubscribe = null
    }
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
    built.text.textContent = modelGroupName(provider.id, provider.name)
    // badge and check were both asked for above.
    built.badge!.textContent = stale ? copy('quickRemoved') : String(provider.count)
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
      cardBody.appendChild(buildElement('div', 'dsh-claude-popover-status', copy('quickLoading')))
      return
    }
    const chosen = readPrefs().quickProviders
    // The provider that leads the first level is not a choice here: the
    // official route while it advertises models, and the account route when it
    // takes that place. A stored id for either is left out; a provider that
    // vanished from the catalog still appears, marked removed, so it can be
    // unchecked out of the stored list instead of lingering invisibly.
    const accountLeads = !providers.some(provider => provider.id === MODEL_OFFICIAL_GROUP)
    const known: Record<string, boolean> = {}
    for (let i = 0; i < providers.length; i++) {
      if (providers[i].id === MODEL_OFFICIAL_GROUP) continue
      if (accountLeads && providers[i].id === MODEL_ACCOUNT_GROUP) continue
      known[providers[i].id] = true
      cardBody.appendChild(buildRow(providers[i], chosen.includes(providers[i].id), false))
    }
    for (let s = 0; s < chosen.length; s++) {
      if (chosen[s] === MODEL_OFFICIAL_GROUP || (accountLeads && chosen[s] === MODEL_ACCOUNT_GROUP) || known[chosen[s]]) continue
      cardBody.appendChild(buildRow({ id: chosen[s], name: chosen[s], count: 0 }, true, true))
    }
  }

  function open(trigger: HTMLElement, write: QuickProvidersWrite) {
    closeOtherPopovers('quickProviders')
    anchor = trigger
    anchor.setAttribute('aria-expanded', 'true')
    onWrite = write
    providers = typeof ui.model?.providers === 'function' ? ui.model.providers() : []
    // The catalog arrives after the card is up, and the picker's own switch
    // takes the handle away and installs a fresh one, so the follow is taken
    // per opening rather than once at install.
    if (typeof ui.model?.onProviders === 'function') {
      unsubscribe = ui.model.onProviders(list => {
        providers = list
        renderBody()
      })
    }
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
    delete ui.quickProviders
  }
}
