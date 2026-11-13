import * as React from 'react'
import * as reactDom from 'react-dom/client'
import * as primitives from '@deepseek-ai/dsh-client-ui-primitives'
import { MENU_ROLE_SELECTOR } from '@dsh-claude-style/contracts/dom'
import { observeMatches } from '@dsh-claude-style/engine/bus'
import { hostSidebarPins, registerSlotEntries, withSlots } from '@dsh-claude-style/engine/host'
import type { HostContext } from '@dsh-claude-style/engine/host'
import type { HostPanelActionEntry, HostPanelActionsProps, HostSidebarPins, HostSlotsService } from '@dsh-claude-style/contracts/services'
import { MORE_MENU_ATTR } from '../../constants'
import { prefsFromForm, readPrefs, savePrefs } from '../../core/prefs'
import type { FeatureUi } from '../../core/feature'
import type manifest from './sidebar-entries.manifest'
import { copy } from './copy'
import { openPanelFromAction } from '../../shared/panel-actions'
import { createHostToast } from '../../shared/host-toast'
import { placeBesideLauncher } from './more-placement'

/**
 * The sidebar's panel list as Claude's app keeps it: the reader picks which
 * entries stand on the list in an Edit sidebar dialog, and the ones taken off
 * stay one click away in More, above the host's own rows (D43).
 *
 * The host keeps the pin list: the sidebar draws an unpin button on each row,
 * removes the unpinned rows, and its default More menu lists them with a pin
 * button. That list lives in the sidebar plugin's memory and starts empty on
 * every load, so the host list is the live state and the skin's `sidebarHidden`
 * preference is the stored copy of it: the pass replays the stored ids into the
 * host once, writes every later change of the host list back, and the dialog
 * writes through the same list. A host whose default menu does not list the
 * unpinned entries gets them from the skin's own rows.
 */

/** The host's panel icons, one registration per panel id. */
const PANEL_SLOT = 'sidebar.panellist'
/** The More menu's rows; the sidebar shows More while this list has any. */
const ACTIONS_SLOT = 'sidebar.panellist.actions'
/**
 * The list's own rows. The host wraps each row in a box of its own, and the
 * More launcher in another, so a row is read wherever it stands inside
 * the list; the launcher is the one row that opens a menu, and it is no entry.
 */
const PANEL_LIST_SELECTOR = 'nav[data-dsh-claude-part~="panel-list"]'
const PANEL_ROW_SELECTOR = `${PANEL_LIST_SELECTOR} button[data-dsh-claude-part~="panel-row"]:not([aria-haspopup="menu"])`
const GLYPH_SELECTOR = '[data-dsh-claude-part~="panel-glyph"]'
/** How long an entry's row may take to draw its icon before the entry is unpinned without it. */
const GLYPH_WAIT_MS = 1500

const ICON_CLASS = 'dsh-claude-sidebar-entries-icon'
const NAME_CLASS = 'dsh-claude-sidebar-entries-name'
const CHECK_CLASS = 'dsh-claude-sidebar-entries-check'
const SEPARATOR_CLASS = 'dsh-claude-sidebar-entries-separator'
const DIALOG_CLASS = 'dsh-claude-sidebar-entries-dialog'
const LIST_CLASS = 'dsh-claude-sidebar-entries-list'
const ROW_CLASS = 'dsh-claude-sidebar-entries-row'
const INPUT_CLASS = 'dsh-claude-sidebar-entries-input'
const BOX_CLASS = 'dsh-claude-sidebar-entries-box'
const TICK_CLASS = 'dsh-claude-sidebar-entries-tick'

/** A registration's label: a string, or a thunk re-read so it follows the locale; the sidebar falls back to the id. */
function panelLabel(label: string | (() => string) | undefined, id: string) {
  const text = typeof label === 'function' ? label() : label
  return text ?? id
}

/** Whether two id lists hold the same ids in the same order. */
function sameIds(left: readonly string[], right: readonly string[]) {
  return left.length === right.length && left.every((id, index) => id === right[index])
}

export function install(ctx: HostContext, ui: FeatureUi<typeof manifest>) {
  const rows = observeMatches<HTMLElement>(PANEL_ROW_SELECTOR)
  /**
   * A copy of each panel row's icon, by the row's label. The host removes an
   * unpinned row, so the dialog and the skin's own More rows draw this copy.
   */
  const glyphs = new Map<string, Element>()
  const toast = createHostToast()
  let dialogRoot: reactDom.Root | null = null
  /** The slot registry, once the host has served it to the injected scope. */
  let slots: HostSlotsService | null = null

  /** Every registered panel's id and label, as the host labels its row now. */
  function registeredPanels() {
    const panels = new Map<string, string>()
    if (slots === null) return panels
    for (const entry of slots.entriesOfSlot(PANEL_SLOT)) {
      const id = entry.options.id
      if (id !== undefined) panels.set(id, panelLabel(entry.options.label, id))
    }
    return panels
  }

  /** Keep a copy of the icon of every row the list draws right now. */
  function keepGlyphs() {
    for (const row of rows.all()) {
      const label = row.getAttribute('aria-label') ?? ''
      if (label === '' || glyphs.has(label)) continue
      const glyph = row.querySelector(GLYPH_SELECTOR)?.querySelector('svg, img')
      if (glyph !== null && glyph !== undefined) glyphs.set(label, glyph.cloneNode(true) as Element)
    }
  }

  /** The host's pin list this pass follows, and the undo of its subscription. */
  let pins: HostSidebarPins | null = null
  let unfollow: (() => void) | null = null
  /** The stored ids the host has not been told about yet. */
  const toReplay = new Set<string>()
  /** When each stored id was first seen registered while its icon was still missing. */
  const waitingSince = new Map<string, number>()
  let wake: ReturnType<typeof setTimeout> | null = null

  /** The list the preference should hold: the host's unpinned ids, then the stored ones still waiting to be replayed. */
  function wantedHidden(unpinned: readonly string[]) {
    return unpinned.concat([...toReplay].filter(id => !unpinned.includes(id)))
  }

  /** The host list moved (the sidebar's button, the host's More menu, or the dialog): store it. */
  function storeHostList() {
    if (pins === null) return
    const wanted = wantedHidden(pins.unpinned.getSnapshot())
    if (sameIds(wanted, readPrefs().sidebarHidden)) return
    savePrefs({ sidebarHidden: wanted }).then(saved => {
      if (saved === null) toast.show({ text: copy('saveFailed') })
    })
  }

  /** Follow the sidebar plugin's pin list; a new list means the sidebar plugin reloaded and forgot every unpin. */
  function followPins() {
    if (slots === null || !prefsFromForm()) return
    const served = hostSidebarPins(slots)
    if (served === null) return
    if (pins === null || served.unpinned !== pins.unpinned) {
      if (unfollow !== null) unfollow()
      pins = served
      unfollow = served.unpinned.subscribe(storeHostList)
      toReplay.clear()
      waitingSince.clear()
      for (const id of readPrefs().sidebarHidden) toReplay.add(id)
    }
    replayStored(served)
  }

  /**
   * Tell the host about the stored ids once their panels stand on the list. An
   * entry is unpinned after its row has drawn the icon the dialog copies, since
   * the host removes the row as soon as it is unpinned. An id no panel has
   * registered yet waits for its registration.
   */
  function replayStored(served: HostSidebarPins) {
    if (toReplay.size === 0) return
    const known = registeredPanels()
    const unpinned = served.unpinned.getSnapshot()
    const now = performance.now()
    let waiting = false
    for (const id of [...toReplay]) {
      if (unpinned.includes(id)) {
        toReplay.delete(id)
        continue
      }
      const label = known.get(id)
      if (label === undefined) continue
      if (!waitingSince.has(id)) waitingSince.set(id, now)
      if (!glyphs.has(label) && now - (waitingSince.get(id) ?? now) < GLYPH_WAIT_MS) {
        waiting = true
        continue
      }
      toReplay.delete(id)
      waitingSince.delete(id)
      served.setPinned(id, false)
    }
    if (waiting && wake === null) {
      wake = setTimeout(() => {
        wake = null
        ui.schedule?.()
      }, GLYPH_WAIT_MS)
    }
  }

  function sync() {
    keepGlyphs()
    followPins()
  }

  /** A copy of a panel row's icon; the panel's own component needs the sidebar's kit, which only its row has. */
  function PanelIcon({ label }: { label: string }) {
    const seat = React.useRef<HTMLSpanElement>(null)
    React.useLayoutEffect(() => {
      const node = seat.current
      if (node === null) return
      const glyph = glyphs.get(label)
      node.replaceChildren(...(glyph === undefined ? [] : [glyph.cloneNode(true)]))
    }, [label])
    return React.createElement('span', { ref: seat, className: ICON_CLASS, 'aria-hidden': 'true' })
  }

  /**
   * Whether the host's own More rows list the unpinned entries: the card tells
   * it by holding a row that is not the skin's and names one of them. The skin's
   * rows are drawn only where the host draws none, so one entry is never listed
   * twice. The More card writes the answer when it mounts and clears it when it
   * unmounts.
   */
  let hostListsUnpinned = false
  const hostListsListeners = new Set<() => void>()
  function setHostLists(next: boolean) {
    if (hostListsUnpinned === next) return
    hostListsUnpinned = next
    for (const listener of hostListsListeners) listener()
  }
  function subscribeHostLists(listener: () => void) {
    hostListsListeners.add(listener)
    return () => { hostListsListeners.delete(listener) }
  }

  /**
   * The entries taken off the list, at the head of More, with a hairline under
   * them: the host's own rows that follow start no group of their own here.
   */
  function HiddenPanelRows({ entries, onOpen, onDismiss }: HostPanelActionsProps) {
    const hostLists = React.useSyncExternalStore(subscribeHostLists, () => hostListsUnpinned)
    const listed = entries.filter(entry => !entry.pinned)
    if (listed.length === 0 || hostLists) return null
    return React.createElement(React.Fragment, null,
      listed.map(entry => React.createElement(primitives.MenuItemButton, {
        key: entry.id,
        icon: React.createElement(PanelIcon, { label: entry.label }),
        onSelect: () => {
          onDismiss()
          if (!openPanelFromAction(entry.id)) onOpen(entry.id)
        },
        children: React.createElement('span', { className: NAME_CLASS },
          entry.label,
          entry.active === true ? React.createElement(primitives.IconCheckOutlineRegular, { size: 16, className: CHECK_CLASS }) : null,
        ),
      })),
      React.createElement('div', { role: 'separator', className: SEPARATOR_CLASS }))
  }

  /**
   * The last row of More, in a group of its own; its empty icon seat lines its
   * words up with the rows above. The row renders inside the host's card on
   * every opening, so it stamps that card for the stylesheet and seats it
   * beside its launcher before the first paint, and the card goes with the
   * stamp when the menu closes. It also reads the card for the host's own rows
   * of unpinned entries (hostListsUnpinned).
   */
  function EditSidebarRow({ entries, onDismiss, onPinnedChange }: HostPanelActionsProps) {
    const seat = React.useRef<HTMLSpanElement>(null)
    const unpinnedLabels = entries.filter(entry => !entry.pinned).map(entry => entry.label).join('\n')
    React.useLayoutEffect(() => {
      const card = seat.current?.closest(MENU_ROLE_SELECTOR) ?? null
      if (!(card instanceof HTMLElement)) return
      card.setAttribute(MORE_MENU_ATTR, '')
      const releasePlace = placeBesideLauncher(card)
      const labels = unpinnedLabels === '' ? [] : unpinnedLabels.split('\n')
      let hostRow = false
      for (const item of card.querySelectorAll<HTMLElement>('[role="menuitem"]')) {
        if (item.querySelector(`.${NAME_CLASS}`) !== null) continue
        if (labels.includes((item.textContent ?? '').trim())) hostRow = true
      }
      setHostLists(hostRow)
      return () => {
        setHostLists(false)
        releasePlace()
        card.removeAttribute(MORE_MENU_ATTR)
      }
    }, [unpinnedLabels])
    return React.createElement(primitives.MenuItemButton, {
      separatorBefore: true,
      icon: React.createElement('span', { ref: seat, className: ICON_CLASS, 'aria-hidden': 'true' }),
      onSelect: () => {
        onDismiss()
        openDialog(entries, onPinnedChange)
      },
      children: copy('editRow'),
    })
  }

  /**
   * The box a checkbox row draws: the input holds the state and the keyboard,
   * this only wears it. A native tick cannot be animated — a replaced control
   * paints its own — so the tick is one path whose dash is the whole of it.
   */
  function TickBox() {
    return React.createElement('span', { className: BOX_CLASS, 'aria-hidden': 'true' },
      React.createElement('svg', { className: TICK_CLASS, viewBox: '0 0 16 16' },
        React.createElement('path', { d: 'M4 8.4 6.6 11 12 4.9', pathLength: 1 }),
      ),
    )
  }

  /**
   * One checkbox per customizable panel. A box flips at once and the host's pin
   * list follows it; the pin list's own subscription stores the choice.
   */
  function EditSidebarDialog({ entries, onPinnedChange }: { entries: readonly HostPanelActionEntry[], onPinnedChange: HostPanelActionsProps['onPinnedChange'] }) {
    const [shown, setShown] = React.useState(() => new Map(entries.map(entry => [entry.id, entry.pinned])))
    function toggle(id: string, next: boolean) {
      setShown(previous => new Map(previous).set(id, next))
      onPinnedChange(id, next)
    }
    return React.createElement(primitives.Modal, {
      open: true,
      onClose: closeDialog,
      title: copy('editTitle'),
      description: copy('editDesc'),
      closeLabel: copy('editClose'),
      className: DIALOG_CLASS,
      footer: React.createElement(primitives.Button, { variant: 'primary', size: 'sm', onClick: closeDialog }, copy('editDone')),
    }, React.createElement('div', { className: LIST_CLASS },
      entries.map((entry, index) => React.createElement('label', { key: entry.id, className: ROW_CLASS },
        React.createElement('input', {
          type: 'checkbox',
          className: INPUT_CLASS,
          checked: shown.get(entry.id) === true,
          onChange: (event: React.ChangeEvent<HTMLInputElement>) => { toggle(entry.id, event.currentTarget.checked) },
          'data-modal-autofocus': index === 0 ? '' : undefined,
        }),
        React.createElement(TickBox),
        React.createElement(PanelIcon, { label: entry.label }),
        React.createElement('span', null, entry.label),
      )),
    ))
  }

  /** The dialog lists the panels More was opened with; the Modal portals itself into the page. */
  function openDialog(entries: readonly HostPanelActionEntry[], onPinnedChange: HostPanelActionsProps['onPinnedChange']) {
    if (dialogRoot === null) dialogRoot = reactDom.createRoot(document.createElement('div'))
    dialogRoot.render(React.createElement(EditSidebarDialog, { entries, onPinnedChange }))
  }

  function closeDialog() {
    if (dialogRoot !== null) dialogRoot.render(null)
  }

  // The registry the pass reads labels and the pin list from is the one the injected scope holds;
  // its arrival asks for a pass, since stored ids wait on it.
  const slotsFiber = withSlots(ctx, (served, scope) => {
    slots = served
    scope.effect(() => () => { slots = null }, 'dsh-claude-style: sidebar entries registry')
    ui.schedule?.()
  })
  // Ordered around the host's own rows (order 0): the hidden entries before them, the dialog's row after.
  const rowsFiber = registerSlotEntries(ctx, [
    { options: { name: ACTIONS_SLOT, id: 'claude-style-hidden-panels', order: -10 }, component: HiddenPanelRows },
    { options: { name: ACTIONS_SLOT, id: 'claude-style-edit-sidebar', order: 10 }, component: EditSidebarRow },
  ], 'dsh-claude-style: sidebar entries')

  ui.sidebarEntries = { sync, skipOnContentOnly: true }

  return () => {
    if (rowsFiber !== null) rowsFiber.dispose()
    if (slotsFiber !== null) slotsFiber.dispose()
    if (unfollow !== null) unfollow()
    if (wake !== null) clearTimeout(wake)
    toast.dispose()
    if (dialogRoot !== null) {
      dialogRoot.unmount()
      dialogRoot = null
    }
    glyphs.clear()
    rows.release()
    delete ui.sidebarEntries
  }
}
