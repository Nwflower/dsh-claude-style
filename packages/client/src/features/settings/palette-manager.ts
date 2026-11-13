import * as React from 'react'
import { useModalLayer } from '@deepseek-ai/dsh-client-ui-primitives'
import * as reactDom from 'react-dom/client'
import { BRAND_DEFAULT_PRESETS, PALETTE_COLORING_BRAND } from '../../constants'
import { readPrefs, savePrefs, subscribePrefs } from '../../core/prefs'
import { registerPopover, unregisterPopover } from '../../shared/popover'
import { canAddScheme, duplicateScheme, newSchemeId, removeSchemePatch, selectSchemePatch, storedSchemes } from '../../shared/palette-scheme'
import { PALETTE_SCHEME_LIMIT, PALETTE_SCHEME_NAME_MAX } from '@dsh-claude-style/contracts/palette-schemes'
import { PaletteEditor } from './palette-editor'
import { cardSchemes, isPresetScheme, schemeDiscs, schemeLabel, Swatches } from './palette-parts'
import type { PaletteScheme } from '@dsh-claude-style/contracts/palette-schemes'
import type { Prefs } from '../../constants'
import { copy } from './copy'

/**
 * The colour schemes' manager (D96): a modal on <body>, over the settings
 * dialog that would clip it. Its first view lists every scheme — the presets
 * and the reader's own — with the ways to use, edit, copy and delete each; its
 * second view is the editor of one scheme (palette-editor.ts). It reads the
 * preferences and writes through the same store the settings page does, so the
 * page's cards and the manager stay in step.
 */

/** Where the manager opens: the list, or one scheme's editor. */
export interface PaletteManagerOpen {
  /** The scheme whose editor opens first. */
  edit?: string
  /** A scheme just made whose record is still on its way to the form. */
  created?: PaletteScheme
}

/** The open manager's own node and React root, if any. */
let host: HTMLElement | null = null
let root: reactDom.Root | null = null

type View = { kind: 'list' } | { kind: 'edit', id: string, created: PaletteScheme | undefined }

/** One row of the list. */
function SchemeRow(props: { prefs: Prefs, scheme: PaletteScheme, open(id: string, created?: PaletteScheme): void }) {
  const { prefs, scheme } = props
  const [confirming, setConfirming] = React.useState(false)
  const stored = storedSchemes(prefs)
  const preset = isPresetScheme(scheme)
  const edited = preset && stored.some((entry) => entry.id === scheme.id)
  const following = prefs.paletteColors === PALETTE_COLORING_BRAND
  const selected = scheme.id === (following ? BRAND_DEFAULT_PRESETS[prefs.brand] : prefs.paletteColors)
  const button = (label: string, run: () => void, className = '', disabled = false) => React.createElement('button', {
    type: 'button',
    className: `dsh-claude-settings-button dsh-claude-scheme-button ${className}`.trim(),
    disabled,
    onClick: run,
  }, label)
  const copied = () => {
    const next = duplicateScheme(prefs, scheme, copy('paletteCopyName', { name: schemeLabel(scheme) }).slice(0, PALETTE_SCHEME_NAME_MAX))
    savePrefs(selectSchemePatch(prefs, next))
    props.open(next.id, next)
  }
  return React.createElement(
    'li',
    { className: 'dsh-claude-scheme-row', 'data-scheme': scheme.id, 'data-active': selected ? '' : undefined },
    React.createElement(Swatches, { colours: schemeDiscs(scheme, preset && !edited) }),
    React.createElement(
      'span',
      { className: 'dsh-claude-scheme-row-name' },
      schemeLabel(scheme),
      edited ? React.createElement('span', { className: 'dsh-claude-palette-card-tag' }, copy('paletteEdited')) : null,
    ),
    React.createElement(
      'span',
      { className: 'dsh-claude-scheme-row-actions' },
      button(selected && !following ? copy('paletteInUse') : copy('paletteUse'), () => { savePrefs({ paletteColors: scheme.id }) }, '', selected && !following),
      button(copy('paletteEdit'), () => props.open(scheme.id)),
      button(copy('paletteDuplicate'), copied, '', !canAddScheme(prefs)),
      preset
        ? button(copy('paletteRestore'), () => { savePrefs(removeSchemePatch(prefs, scheme.id)) }, '', !edited)
        : React.createElement('button', {
          type: 'button',
          className: 'dsh-claude-settings-button dsh-claude-scheme-button dsh-claude-scheme-danger',
          onClick: () => {
            if (confirming) savePrefs(removeSchemePatch(prefs, scheme.id))
            else setConfirming(true)
          },
          onBlur: () => setConfirming(false),
        }, confirming ? copy('paletteDeleteConfirm') : copy('paletteDelete')),
    ),
  )
}

function Manager(props: { first: PaletteManagerOpen, close(): void }) {
  const prefs = React.useSyncExternalStore(subscribePrefs, readPrefs)
  const [view, setView] = React.useState<View>(props.first.edit === undefined ? { kind: 'list' } : { kind: 'edit', id: props.first.edit, created: props.first.created })
  const panel = React.useRef<HTMLDivElement>(null)
  // The host owns nested-dialog keyboard handling and restores the settings control's focus (D43).
  useModalLayer(panel, true, props.close)
  const open = (id: string, created?: PaletteScheme) => setView({ kind: 'edit', id, created })
  const back = () => setView({ kind: 'list' })
  const create = () => {
    const id = newSchemeId(prefs)
    const scheme: PaletteScheme = { id, name: copy('paletteDefaultName'), base: BRAND_DEFAULT_PRESETS[prefs.brand] }
    savePrefs(selectSchemePatch(prefs, scheme))
    open(id, scheme)
  }
  const editing = view.kind === 'edit'
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
      { ref: panel, className: 'dsh-claude-scheme-panel', tabIndex: -1, role: 'dialog', 'aria-modal': 'true', 'aria-label': copy('paletteManagerTitle') },
      React.createElement(
        'header',
        { className: 'dsh-claude-scheme-head' },
        editing ? React.createElement('button', { type: 'button', className: 'dsh-claude-settings-button dsh-claude-scheme-icon', 'aria-label': copy('paletteBack'), onClick: back }, '‹') : null,
        React.createElement('h3', null, copy('paletteManagerTitle')),
        React.createElement('button', { type: 'button', className: 'dsh-claude-settings-button dsh-claude-scheme-icon', 'aria-label': copy('paletteManagerClose'), onClick: props.close }, '✕'),
      ),
      editing
        ? React.createElement(PaletteEditor, { key: view.id, prefs, id: view.id, created: view.created, open, back })
        : React.createElement(
          'div',
          { className: 'dsh-claude-scheme-list' },
          React.createElement('ul', { className: 'dsh-claude-scheme-rows' }, cardSchemes(prefs).map((scheme) => React.createElement(SchemeRow, { key: scheme.id, prefs, scheme, open }))),
          React.createElement(
            'div',
            { className: 'dsh-claude-scheme-actions' },
            React.createElement('button', { type: 'button', className: 'dsh-claude-settings-button dsh-claude-scheme-button dsh-claude-scheme-primary', disabled: !canAddScheme(prefs), onClick: create }, copy('paletteNew')),
            prefs.paletteColors === PALETTE_COLORING_BRAND ? null : React.createElement('button', { type: 'button', className: 'dsh-claude-settings-button dsh-claude-scheme-button', onClick: () => { savePrefs({ paletteColors: PALETTE_COLORING_BRAND }) } }, copy('paletteUseBrand')),
            React.createElement('span', { className: 'dsh-claude-scheme-limit' }, copy('paletteLimit', { count: String(PALETTE_SCHEME_LIMIT) })),
          ),
        ),
    ),
  )
}

/** Open the manager over the page, closing one that is already up. */
export function openPaletteManager(first: PaletteManagerOpen) {
  closePaletteManager()
  host = document.createElement('div')
  host.className = 'dsh-claude-scheme-host'
  document.body.append(host)
  root = reactDom.createRoot(host)
  root.render(React.createElement(Manager, { first, close: closePaletteManager }))
  registerPopover('palette-manager', closePaletteManager)
}

/** Close the manager, if one stands. */
export function closePaletteManager() {
  if (host === null) return
  const closing = root
  const node = host
  root = null
  host = null
  unregisterPopover('palette-manager')
  // A root that unmounts while React is rendering the page raises a warning; the next task is out of any render.
  queueMicrotask(() => {
    closing?.unmount()
    node.remove()
  })
}
