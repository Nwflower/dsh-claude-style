import { buildElement, setAttributeIfChanged } from '@dsh-claude-style/engine/dom'
import { AUTO_POPOVER_ALL } from '../../constants'
import { readPrefs } from '../../core/prefs'
import { POPOVER_CHECK_SVG, POPOVER_CLOSE_DELAY, POPOVER_OPEN_DELAY, buildPopoverItem, closeOtherPopovers, createHoverIntent, positionAnchoredPopover, pressKeepsPopoverOpen, registerPopover, removeStrayNodes, setMenuPopoverOpen, unregisterPopover } from '../../shared/popover'
import { copy } from './copy'
import type { CopyKey } from './copy'
import type { WorkspaceView } from './view-store'

/** The menu's three views, in the order the rows stand: 工作区 is the default. */
export const VIEWS: { id: WorkspaceView, key: CopyKey }[] = [
  { id: 'active', key: 'viewActive' },
  { id: 'archived', key: 'viewArchived' },
  { id: 'all', key: 'viewAll' }
]

/** The registry name this menu closes its siblings under. */
const POPOVER_KEY = 'workspace-view'
/** Where the card hangs off its trigger: under it while it fits, over it otherwise, left edges aligned. */
const PLACEMENT = { side: 'below-left', gap: 6 } as const
/** The trigger's own chevron, drawn in the trigger's ink. */
const CARET_SVG = '<svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6l4 4 4-4"/></svg>'

/**
 * The 工作区 / 已归档 / 全部 view menu, stood in the section heading's place:
 * the trigger names the view in force and opens a card of the three views,
 * each writing the host's view store (the follower's drive). The trigger
 * replaces the heading's words in every view (workspace.css); its hover plate
 * grows around the words without moving them.
 */
export function createViewMenu(onSelect: (view: WorkspaceView) => void) {
  /** The trigger and its card, kept while the section stands; released with it. */
  let trigger: HTMLButtonElement | null = null
  let label: HTMLElement | null = null
  let card: HTMLElement | null = null
  let hoverIntent: ReturnType<typeof createHoverIntent> | null = null
  let docPointerListener: ((e: PointerEvent) => void) | null = null
  let resizeListener: (() => void) | null = null

  /** Whether the hover preference covers this picker: the `all` scope alone. */
  function hoverOn() {
    return readPrefs().autoPopover === AUTO_POPOVER_ALL
  }

  /**
   * Whether this press leaves the card alone
   * (shared/popover.ts::pressKeepsPopoverOpen): the dwell opened it, the
   * pointer is on the trigger, so the press is not a second decision.
   */
  function pressKeepsOpen() {
    return pressKeepsPopoverOpen(hoverOn(), trigger !== null && trigger.getAttribute('data-open') === 'true')
  }

  /** Every dismiss route (row pick, outside pointer, resize/scroll) closes through this one path. */
  function close() {
    if (trigger === null || card === null) return
    trigger.removeAttribute('data-open')
    setMenuPopoverOpen(card, false, trigger)
  }

  function open() {
    if (trigger === null || card === null) return
    hoverIntent?.cancel()
    closeOtherPopovers(POPOVER_KEY)
    positionAnchoredPopover(trigger, card, PLACEMENT)
    trigger.setAttribute('data-open', 'true')
    setMenuPopoverOpen(card, true, trigger)
  }

  function build() {
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = 'dsh-claude-ws-menu-trigger'
    btn.setAttribute('aria-haspopup', 'menu')
    btn.setAttribute('aria-expanded', 'false')
    const text = buildElement('span', 'dsh-claude-ws-menu-label')
    const caret = buildElement('span', 'dsh-claude-ws-menu-caret')
    caret.innerHTML = CARET_SVG
    btn.appendChild(text)
    btn.appendChild(caret)

    const pop = buildElement('div', 'dsh-claude-popover-card dsh-claude-ws-menu')
    setMenuPopoverOpen(pop, false)
    for (let i = 0; i < VIEWS.length; i++) {
      const built = buildPopoverItem({ role: 'menuitemradio', check: true })
      const row = built.row
      row.setAttribute('data-view', VIEWS[i].id)
      // A check was asked for, so the slot is there; the current view's row
      // un-hides it in sync.
      built.check!.innerHTML = POPOVER_CHECK_SVG
      built.check!.hidden = true
      row.addEventListener('click', event => {
        event.stopPropagation()
        close()
        onSelect(VIEWS[i].id)
      })
      pop.appendChild(row)
    }

    hoverIntent = createHoverIntent(open, close, POPOVER_OPEN_DELAY, POPOVER_CLOSE_DELAY)
    btn.addEventListener('mouseenter', () => {
      if (hoverOn()) hoverIntent!.scheduleOpen()
    })
    btn.addEventListener('mouseleave', () => {
      if (hoverOn()) hoverIntent!.scheduleClose()
    })
    pop.addEventListener('mouseenter', () => {
      hoverIntent!.cancel()
    })
    pop.addEventListener('mouseleave', () => {
      hoverIntent!.scheduleClose()
    })
    btn.addEventListener('click', event => {
      event.stopPropagation()
      if (btn.getAttribute('data-open') === 'true') {
        // A press on the card the dwell just opened leaves it up: the reader's
        // hand is already on the trigger, and it is the leave that closes.
        if (pressKeepsOpen()) return
        close()
      } else {
        open()
      }
    })

    docPointerListener = event => {
      if (card === null || trigger === null || card.getAttribute('data-open') !== 'true') return
      // A SECOND button of the mouse must not fold the card either: the
      // pointer never left the trigger, so this is not the reader's way out.
      if (trigger.contains(event.target as Node)) {
        if (!pressKeepsOpen()) close()
        return
      }
      if (!card.contains(event.target as Node)) close()
    }
    document.addEventListener('pointerdown', docPointerListener)
    resizeListener = () => {
      if (card !== null && card.getAttribute('data-open') === 'true') close()
    }
    window.addEventListener('resize', resizeListener)
    window.addEventListener('scroll', resizeListener, true)

    registerPopover(POPOVER_KEY, close)
    trigger = btn
    label = text
    card = pop
  }

  return {
    /**
     * Seat the trigger in the section's header and bring it and the rows to
     * the view in force: the trigger's words, the checked row and the copy's
     * current language.
     */
    sync(header: HTMLElement, view: WorkspaceView) {
      if (trigger === null || trigger.parentElement !== header) {
        if (trigger !== null && trigger.parentElement !== null) trigger.parentElement.removeChild(trigger)
        if (card !== null && card.parentElement !== null) card.parentElement.removeChild(card)
        build()
        header.insertBefore(trigger!, header.firstChild)
        document.body.appendChild(card!)
        // A client reload drops the previous generation's disposals: its
        // trigger and card can still stand where this pass seats its own.
        removeStrayNodes(header, '.dsh-claude-ws-menu-trigger', [trigger])
        removeStrayNodes(document.body, '.dsh-claude-ws-menu', [card])
      }
      const current = VIEWS.find(entry => entry.id === view)
      const words = current === undefined ? '' : copy(current.key)
      if (label !== null && label.textContent !== words) label.textContent = words
      if (card === null) return
      const rows = card.querySelectorAll('[data-view]')
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i]
        const id = row.getAttribute('data-view')
        for (let v = 0; v < VIEWS.length; v++) {
          if (VIEWS[v].id !== id) continue
          const text = copy(VIEWS[v].key)
          const slot = row.querySelector('.dsh-claude-popover-item-text')
          if (slot !== null && slot.textContent !== text) slot.textContent = text
        }
        const on = id === view
        setAttributeIfChanged(row, 'aria-checked', on ? 'true' : 'false')
        row.toggleAttribute('data-active', on)
        const check = row.querySelector<HTMLElement>('.dsh-claude-popover-check')
        if (check !== null) check.toggleAttribute('hidden', !on)
      }
    },
    /** Stand the menu down: the card, the trigger and the listeners leave with the section. */
    release() {
      close()
      unregisterPopover(POPOVER_KEY)
      if (hoverIntent !== null) hoverIntent.cancel()
      if (docPointerListener !== null) {
        document.removeEventListener('pointerdown', docPointerListener)
        docPointerListener = null
      }
      if (resizeListener !== null) {
        window.removeEventListener('resize', resizeListener)
        window.removeEventListener('scroll', resizeListener, true)
        resizeListener = null
      }
      if (trigger !== null && trigger.parentElement !== null) trigger.parentElement.removeChild(trigger)
      if (card !== null && card.parentElement !== null) card.parentElement.removeChild(card)
      trigger = null
      label = null
      card = null
    },
  }
}
