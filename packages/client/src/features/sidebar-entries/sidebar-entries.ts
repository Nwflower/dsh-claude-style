import * as React from 'react'
import * as reactDom from 'react-dom/client'
import * as primitives from '@deepseek-ai/dsh-client-ui-primitives'
import { MENU_ROLE_SELECTOR } from '@dsh-claude-style/contracts/dom'
import { observeMatches } from '@dsh-claude-style/engine/bus'
import { registerSlotEntries, withSlots } from '@dsh-claude-style/engine/host'
import { setAttributeIfChanged } from '@dsh-claude-style/engine/dom'
import type { HostContext } from '@dsh-claude-style/engine/host'
import type { HostPanelActionEntry, HostPanelActionsProps, HostSlotsService } from '@dsh-claude-style/contracts/services'
import { MORE_MENU_ATTR, PANEL_HIDDEN_ATTR } from '../../constants'
import { readPrefs, savePrefs, subscribePrefs } from '../../core/prefs'
import type { FeatureUi } from '../../core/feature'
import type manifest from './sidebar-entries.manifest'
import { copy } from './copy'
import { openPanelFromAction } from '../../shared/panel-actions'

/**
 * The sidebar's panel list as Claude's app keeps it: the reader picks which
 * entries stand on the list in an Edit sidebar dialog, and the ones taken off
 * stay one click away in More, above the host's own rows (D43).
 *
 * The host keeps a pin list of its own, but only in memory, and a panel it
 * unpins leaves the page with its icon, which the menu and the dialog still
 * draw. So the choice is a preference of the skin's, the host renders every
 * row as before, and the pass hides the rows the preference names; a row is
 * known by its label, which the panel's registration resolves from its id.
 */

/** The host's panel icons, one registration per panel id. */
const PANEL_SLOT = 'sidebar.panellist'
/** The More menu's rows; the sidebar shows More while this list has any. */
const ACTIONS_SLOT = 'sidebar.panellist.actions'
/**
 * The list's own rows. The host wraps each row in a box of its own (0.2.2-alpha.3),
 * and the More launcher in another, so a row is read wherever it stands inside
 * the list; the launcher is the one row that opens a menu, and it is no entry.
 */
const PANEL_LIST_SELECTOR = 'nav[data-dsh-claude-part~="panel-list"]'
const PANEL_ROW_SELECTOR = `${PANEL_LIST_SELECTOR} button[data-dsh-claude-part~="panel-row"]:not([aria-haspopup="menu"])`
const GLYPH_SELECTOR = '[data-dsh-claude-part~="panel-glyph"]'

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
const ERROR_CLASS = 'dsh-claude-sidebar-entries-error'

/** A registration's label: a string, or a thunk re-read so it follows the locale; the sidebar falls back to the id. */
function panelLabel(label: string | (() => string) | undefined, id: string) {
  const text = typeof label === 'function' ? label() : label
  return text ?? id
}

export function install(ctx: HostContext, ui: FeatureUi<typeof manifest>) {
  const rows = observeMatches<HTMLElement>(PANEL_ROW_SELECTOR)
  const hiddenRows = new Set<HTMLElement>()
  /**
   * The boxes the hidden rows stand in. The host paints the row from its box and
   * lays that box out in the list, so an emptied box would leave the list's own
   * gap behind; the set is what the last pass hid, re-read every pass.
   */
  const hiddenBoxes = new Set<HTMLElement>()
  let dialogRoot: reactDom.Root | null = null
  /** The slot registry, once the host has served it to the injected scope. */
  let slots: HostSlotsService | null = null

  /** The labels of the panels the reader took off the list, as the host labels their rows now. */
  function hiddenLabels() {
    const labels = new Set<string>()
    const hidden = readPrefs().sidebarHidden
    if (hidden.length === 0 || slots === null) return labels
    for (const entry of slots.entriesOfSlot(PANEL_SLOT)) {
      const id = entry.options.id
      if (id !== undefined && hidden.includes(id)) labels.add(panelLabel(entry.options.label, id))
    }
    return labels
  }

  /** The box the list lays a row out in: the row itself where the host draws it as the list's own child. */
  function boxOf(row: HTMLElement) {
    let node = row
    let parent = node.parentElement
    while (parent !== null && !parent.matches(PANEL_LIST_SELECTOR)) {
      node = parent
      parent = node.parentElement
    }
    return node
  }

  function sync() {
    const labels = hiddenLabels()
    const wanted = new Set<HTMLElement>()
    for (const row of rows.all()) {
      const box = boxOf(row)
      if (labels.has(row.getAttribute('aria-label') ?? '')) {
        setAttributeIfChanged(row, PANEL_HIDDEN_ATTR, '')
        setAttributeIfChanged(box, PANEL_HIDDEN_ATTR, '')
        hiddenRows.add(row)
        wanted.add(box)
      } else if (hiddenRows.delete(row)) {
        row.removeAttribute(PANEL_HIDDEN_ATTR)
      }
    }
    for (const row of hiddenRows) {
      if (!row.isConnected) hiddenRows.delete(row)
    }
    // A box whose entry stands on the list again hands its place back, and a box
    // that lost its row with it: the mark outlives the row it was set for.
    for (const box of hiddenBoxes) {
      if (wanted.has(box) && box.isConnected) continue
      box.removeAttribute(PANEL_HIDDEN_ATTR)
      hiddenBoxes.delete(box)
    }
    for (const box of wanted) hiddenBoxes.add(box)
  }

  /** The icon the host drew on a panel's row, hidden rows included: the menu and the dialog draw a copy of it. */
  function glyphOf(label: string) {
    for (const row of rows.all()) {
      if (row.getAttribute('aria-label') !== label) continue
      return row.querySelector(GLYPH_SELECTOR)?.querySelector('svg, img') ?? null
    }
    return null
  }

  /** A copy of a panel's row icon; the panel's own component needs the sidebar's kit, which only its row has. */
  function PanelIcon({ label }: { label: string }) {
    const seat = React.useRef<HTMLSpanElement>(null)
    React.useLayoutEffect(() => {
      const node = seat.current
      if (node === null) return
      const glyph = glyphOf(label)
      node.replaceChildren(...(glyph === null ? [] : [glyph.cloneNode(true)]))
    }, [label])
    return React.createElement('span', { ref: seat, className: ICON_CLASS, 'aria-hidden': 'true' })
  }

  function usePrefs() {
    return React.useSyncExternalStore(subscribePrefs, readPrefs)
  }

  /**
   * The entries taken off the list, at the head of More, with a hairline under
   * them: the host's own rows that follow start no group of their own here.
   */
  function HiddenPanelRows({ entries, onOpen, onDismiss }: HostPanelActionsProps) {
    const hidden = usePrefs().sidebarHidden
    const listed = entries.filter(entry => hidden.includes(entry.id))
    if (listed.length === 0) return null
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
   * every opening, so it stamps that card for the stylesheet before the first
   * paint, and the card goes with the stamp when the menu closes.
   */
  function EditSidebarRow({ entries, onDismiss }: HostPanelActionsProps) {
    const seat = React.useRef<HTMLSpanElement>(null)
    React.useLayoutEffect(() => {
      const card = seat.current?.closest(MENU_ROLE_SELECTOR) ?? null
      if (card === null) return
      card.setAttribute(MORE_MENU_ATTR, '')
      return () => { card.removeAttribute(MORE_MENU_ATTR) }
    }, [])
    return React.createElement(primitives.MenuItemButton, {
      separatorBefore: true,
      icon: React.createElement('span', { ref: seat, className: ICON_CLASS, 'aria-hidden': 'true' }),
      onSelect: () => {
        onDismiss()
        openDialog(entries)
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
   * One checkbox per customizable panel. A box flips at once and the write
   * follows; a refused write puts the boxes back to what is stored and says so.
   * An id stored for a panel that is not on the page now stays stored.
   */
  function EditSidebarDialog({ entries }: { entries: readonly HostPanelActionEntry[] }) {
    const [hidden, setHidden] = React.useState(() => readPrefs().sidebarHidden)
    const [failed, setFailed] = React.useState(false)
    function toggle(id: string, shown: boolean) {
      const next = shown ? hidden.filter(entry => entry !== id) : hidden.concat(id)
      setHidden(next)
      setFailed(false)
      savePrefs({ sidebarHidden: next }).then(result => {
        if (result !== null) return
        setHidden(readPrefs().sidebarHidden)
        setFailed(true)
      })
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
          checked: !hidden.includes(entry.id),
          onChange: (event: React.ChangeEvent<HTMLInputElement>) => { toggle(entry.id, event.currentTarget.checked) },
          'data-modal-autofocus': index === 0 ? '' : undefined,
        }),
        React.createElement(TickBox),
        React.createElement(PanelIcon, { label: entry.label }),
        React.createElement('span', null, entry.label),
      )),
      failed ? React.createElement('p', { className: ERROR_CLASS, role: 'alert' }, copy('saveFailed')) : null,
    ))
  }

  /** The dialog lists the panels More was opened with; the Modal portals itself into the page. */
  function openDialog(entries: readonly HostPanelActionEntry[]) {
    if (dialogRoot === null) dialogRoot = reactDom.createRoot(document.createElement('div'))
    dialogRoot.render(React.createElement(EditSidebarDialog, { entries }))
  }

  function closeDialog() {
    if (dialogRoot !== null) dialogRoot.render(null)
  }

  // The registry the pass reads labels from is the one the injected scope holds;
  // its arrival asks for a pass, since rows already hidden by preference wait on it.
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
    if (dialogRoot !== null) {
      dialogRoot.unmount()
      dialogRoot = null
    }
    for (const row of hiddenRows) row.removeAttribute(PANEL_HIDDEN_ATTR)
    hiddenRows.clear()
    for (const box of hiddenBoxes) box.removeAttribute(PANEL_HIDDEN_ATTR)
    hiddenBoxes.clear()
    rows.release()
    delete ui.sidebarEntries
  }
}
