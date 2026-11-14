import * as React from 'react'
import { useModalLayer } from '@deepseek-ai/dsh-client-ui-primitives'
import * as reactDom from 'react-dom/client'
import { BRAND_DEFAULT_PRESETS, PALETTE_COLORING_BRAND } from '../../constants'
import { readPrefs, savePrefs, subscribePrefs } from '../../core/prefs'
import { registerPopover, unregisterPopover } from '../../shared/popover'
import { canAddScheme, newSchemeId, selectSchemePatch, storedSchemes } from '../../shared/palette-scheme'
import { PALETTE_SCHEME_LIMIT } from '@dsh-claude-style/contracts/palette-schemes'
import { editedScheme, PaletteEditor } from './palette-editor'
import { cardSchemes, Glyph, isPresetScheme, schemeDiscs, SchemeDots, schemeLabel } from './palette-parts'
import { useSlidingPill } from './settings-controls'
import type { PaletteScheme } from '@dsh-claude-style/contracts/palette-schemes'
import type { Prefs } from '../../constants'
import { copy } from './copy'

/**
 * The colour schemes' manager (D96): a modal on <body>, over the settings
 * dialog that would clip it. Its left column lists every scheme — the presets
 * and the reader's own — under a highlight that slides to the one in hand, and
 * makes a new one; its right column is that scheme's editor
 * (palette-editor.ts). It reads the preferences and writes through the same
 * store the settings page does, so the page's cards and the manager stay in
 * step.
 */

/** Where the manager opens: on the scheme the page paints, or on the one named. */
export interface PaletteManagerOpen {
  /** The scheme whose editor opens first. */
  edit?: string
}

const PANEL_CLASS = 'dsh-claude-scheme-panel'
/** On the manager's node while it plays its way out. */
const LEAVING_ATTR = 'data-leaving'

/** The open manager's own node and React root, if any. */
let host: HTMLElement | null = null
let root: reactDom.Root | null = null

/** The scheme in hand, the one just made while its record is on its way, and the side its editor arrives from. */
interface View {
  id: string
  created: PaletteScheme | undefined
  enter: 'above' | 'below' | null
}

/** The scheme the page paints: the selected one, or the brand's default while the selection follows the brand. */
function paintedScheme(prefs: Prefs) {
  return prefs.paletteColors === PALETTE_COLORING_BRAND ? BRAND_DEFAULT_PRESETS[prefs.brand] : prefs.paletteColors
}

/** One line of the list. */
function SchemeItem(props: { prefs: Prefs, scheme: PaletteScheme, active: boolean, pick(): void }) {
  const { prefs, scheme } = props
  const preset = isPresetScheme(scheme)
  const edited = preset && storedSchemes(prefs).some((entry) => entry.id === scheme.id)
  return React.createElement(
    'button',
    {
      type: 'button',
      className: 'dsh-claude-scheme-item',
      'data-scheme': scheme.id,
      'data-active': props.active ? '' : undefined,
      'aria-pressed': props.active ? 'true' : 'false',
      onClick: props.pick,
    },
    React.createElement(SchemeDots, { colours: schemeDiscs(scheme, preset && !edited) }),
    React.createElement('span', { className: 'dsh-claude-scheme-item-name' }, schemeLabel(scheme)),
    scheme.id === paintedScheme(prefs)
      ? React.createElement('span', { className: 'dsh-claude-scheme-item-mark', role: 'img', 'aria-label': copy('paletteInUse') }, React.createElement(Glyph, { name: 'check' }))
      : null,
  )
}

function Manager(props: { first: PaletteManagerOpen, close(): void }) {
  const prefs = React.useSyncExternalStore(subscribePrefs, readPrefs)
  const [view, setView] = React.useState<View>(() => ({ id: props.first.edit ?? paintedScheme(prefs), created: undefined, enter: null }))
  const panel = React.useRef<HTMLDivElement>(null)
  const items = React.useRef<HTMLDivElement>(null)
  // The host owns nested-dialog keyboard handling and restores the settings control's focus (D43).
  useModalLayer(panel, true, props.close)
  useSlidingPill(items)
  const schemes = cardSchemes(prefs)
  // A scheme just made stands in the list from the moment it is opened, ahead of its record.
  const listed = view.created !== undefined && !schemes.some((scheme) => scheme.id === view.created!.id) ? [...schemes, view.created] : schemes
  // A scheme that left the records behind the manager's back gives the pane to the one the page paints.
  const current = editedScheme(prefs, view.id, view.created) === undefined ? paintedScheme(prefs) : view.id
  const open = (id: string, created?: PaletteScheme) => {
    const from = listed.findIndex((scheme) => scheme.id === current)
    const to = created === undefined ? listed.findIndex((scheme) => scheme.id === id) : listed.length
    setView({ id, created, enter: to < from ? 'above' : 'below' })
  }
  const create = () => {
    const id = newSchemeId(prefs)
    const scheme: PaletteScheme = { id, name: copy('paletteDefaultName'), base: BRAND_DEFAULT_PRESETS[prefs.brand] }
    savePrefs(selectSchemePatch(prefs, scheme))
    open(id, scheme)
  }
  const following = prefs.paletteColors === PALETTE_COLORING_BRAND
  return React.createElement(
    'div',
    {
      className: 'dsh-claude-scheme-modal',
      onPointerDown: (event: React.PointerEvent<HTMLDivElement>) => {
        event.stopPropagation()
        if (event.target === event.currentTarget) props.close()
      },
    },
    React.createElement(
      'div',
      { ref: panel, className: PANEL_CLASS, tabIndex: -1, role: 'dialog', 'aria-modal': 'true', 'aria-label': copy('paletteManagerTitle') },
      React.createElement(
        'nav',
        { className: 'dsh-claude-scheme-rail', 'aria-label': copy('paletteManagerTitle') },
        React.createElement('h2', { className: 'dsh-claude-scheme-rail-title' }, copy('paletteManagerTitle')),
        React.createElement(
          'div',
          { className: 'dsh-claude-scheme-rail-scroll' },
          React.createElement(
            'div',
            { ref: items, className: 'dsh-claude-scheme-items' },
            listed.map((scheme) => React.createElement(SchemeItem, { key: scheme.id, prefs, scheme, active: scheme.id === current, pick: () => { if (scheme.id !== current) open(scheme.id) } })),
          ),
          React.createElement(
            'button',
            { type: 'button', className: 'dsh-claude-scheme-item dsh-claude-scheme-add', disabled: !canAddScheme(prefs), onClick: create },
            React.createElement(Glyph, { name: 'plus' }),
            React.createElement('span', { className: 'dsh-claude-scheme-item-name' }, copy('paletteNew')),
          ),
        ),
        React.createElement(
          'div',
          { className: 'dsh-claude-scheme-rail-foot' },
          following ? null : React.createElement('button', { type: 'button', className: 'dsh-claude-palette-reset', onClick: () => { savePrefs({ paletteColors: PALETTE_COLORING_BRAND }) } }, copy('paletteUseBrand')),
          React.createElement('span', { className: 'dsh-claude-scheme-limit' }, copy('paletteLimit', { count: String(PALETTE_SCHEME_LIMIT) })),
        ),
      ),
      React.createElement(
        'div',
        { className: 'dsh-claude-scheme-pane' },
        React.createElement(PaletteEditor, {
          key: current,
          prefs,
          id: current,
          created: view.created,
          enter: view.enter,
          open,
          leave: () => setView({ id: paintedScheme(readPrefs()), created: undefined, enter: 'above' }),
        }),
      ),
      React.createElement('button', { type: 'button', className: 'dsh-claude-scheme-close', 'aria-label': copy('paletteManagerClose'), onClick: props.close }, React.createElement(Glyph, { name: 'close' })),
    ),
  )
}

/** Open the manager over the page, replacing one that is already up. */
export function openPaletteManager(first: PaletteManagerOpen) {
  remove()
  host = document.createElement('div')
  host.className = 'dsh-claude-scheme-host'
  document.body.append(host)
  root = reactDom.createRoot(host)
  root.render(React.createElement(Manager, { first, close: closePaletteManager }))
  registerPopover('palette-manager', closePaletteManager)
}

/** Take the open manager out of the module's hands and return what takes it off the page. */
function release() {
  if (host === null) return null
  const closing = root
  const node = host
  root = null
  host = null
  unregisterPopover('palette-manager')
  // A root that unmounts while React is rendering the page raises a warning; the next task is out of any render.
  return { node, unmount: () => queueMicrotask(() => {
    closing?.unmount()
    node.remove()
  }) }
}

/** Take the manager off the page at once. */
function remove() {
  release()?.unmount()
}

/** Close the manager, if one stands: it plays its way out (palette-schemes.css) and leaves the page when the panel's exit ends. */
export function closePaletteManager() {
  const released = release()
  if (released === null) return
  const panel = released.node.querySelector(`.${PANEL_CLASS}`)
  if (panel === null) {
    released.unmount()
    return
  }
  released.node.setAttribute(LEAVING_ATTR, '')
  panel.addEventListener('animationend', (event) => {
    // The editor's own entrance ends inside the panel too; only the panel's exit takes the manager away.
    if (event.target === panel) released.unmount()
  })
}
