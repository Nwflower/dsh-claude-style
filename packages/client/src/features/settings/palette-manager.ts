import * as React from 'react'
import { BRAND_DEFAULT_PRESETS, PALETTE_COLORING_BRAND } from '../../constants'
import { readPrefs, savePrefs, subscribePrefs } from '../../core/prefs'
import { canAddScheme, newSchemeId, selectSchemePatch, storedSchemes } from '../../shared/palette-scheme'
import { PALETTE_SCHEME_LIMIT } from '@dsh-claude-style/contracts/palette-schemes'
import { editedScheme, PaletteEditor } from './palette-editor'
import { cardSchemes, isPresetScheme, schemeDiscs, SchemeDots, schemeLabel } from './palette-parts'
import { createModalHost, SchemeItem, SchemeModal } from './scheme-modal'
import type { PaletteScheme } from '@dsh-claude-style/contracts/palette-schemes'
import type { Prefs } from '../../constants'
import { copy } from './copy'

/**
 * The colour schemes' manager (D96) in the frame the managers share
 * (scheme-modal.ts): its list holds every scheme — the presets and the
 * reader's own — and makes a new one; its editor is that scheme's
 * (palette-editor.ts). It reads the preferences and writes through the same
 * store the settings page does, so the page's cards and the manager stay in
 * step.
 */

/** Where the manager opens: on the scheme the page paints, or on the one named. */
export interface PaletteManagerOpen {
  /** The scheme whose editor opens first. */
  edit?: string
}

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

function Manager(props: PaletteManagerOpen & { close(): void }) {
  const prefs = React.useSyncExternalStore(subscribePrefs, readPrefs)
  const [view, setView] = React.useState<View>(() => ({ id: props.edit ?? paintedScheme(prefs), created: undefined, enter: null }))
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
  const stored = storedSchemes(prefs)
  const following = prefs.paletteColors === PALETTE_COLORING_BRAND
  return React.createElement(SchemeModal, {
    title: copy('paletteManagerTitle'),
    close: props.close,
    items: listed.map((scheme) => {
      const preset = isPresetScheme(scheme)
      const edited = preset && stored.some((entry) => entry.id === scheme.id)
      return React.createElement(SchemeItem, {
        key: scheme.id,
        id: scheme.id,
        lead: React.createElement(SchemeDots, { colours: schemeDiscs(scheme, preset && !edited) }),
        name: schemeLabel(scheme),
        active: scheme.id === current,
        inUse: scheme.id === paintedScheme(prefs),
        pick: () => { if (scheme.id !== current) open(scheme.id) },
      })
    }),
    add: { label: copy('paletteNew'), disabled: !canAddScheme(prefs), run: create },
    foot: [
      following ? null : React.createElement('button', { key: 'follow', type: 'button', className: 'dsh-claude-palette-reset', onClick: () => { savePrefs({ paletteColors: PALETTE_COLORING_BRAND }) } }, copy('paletteUseBrand')),
      React.createElement('span', { key: 'limit', className: 'dsh-claude-scheme-limit' }, copy('paletteLimit', { count: String(PALETTE_SCHEME_LIMIT) })),
    ],
    pane: React.createElement(PaletteEditor, {
      key: current,
      prefs,
      id: current,
      created: view.created,
      enter: view.enter,
      open,
      leave: () => setView({ id: paintedScheme(readPrefs()), created: undefined, enter: 'above' }),
    }),
  })
}

const manager = createModalHost<PaletteManagerOpen>('palette-manager', Manager)

/** Open the manager over the page, replacing one that is already up. */
export function openPaletteManager(first: PaletteManagerOpen) {
  manager.open(first)
}

/** Close the manager, if one stands. */
export function closePaletteManager() {
  manager.close()
}
