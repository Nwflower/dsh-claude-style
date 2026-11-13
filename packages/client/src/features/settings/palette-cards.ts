import * as React from 'react'
import { BRAND_DEFAULT_PRESETS, PALETTE_COLORING_BRAND } from '../../constants'
import { canAddScheme, newSchemeId, selectSchemePatch, storedSchemes } from '../../shared/palette-scheme'
import { cardSchemes, isPresetScheme, schemeDiscs, schemeLabel, Swatches } from './palette-parts'
import { openPaletteManager } from './palette-manager'
import type { PaletteScheme } from '@dsh-claude-style/contracts/palette-schemes'
import type { Prefs } from '../../constants'
import type { SettingsRow, SettingsView } from './settings-controls'
import { copy } from './copy'

/**
 * The colour cards as the Appearance tab's last rows (D96): one card per
 * scheme — the presets (a preset the reader edited wears its edits), then the
 * reader's own — and a card that makes a new one. A card picks its scheme; the
 * manager (palette-manager.ts) holds the rest: editing, copying, deleting. The
 * card the page paints wears the accent border; the preset the brand defaults
 * to wears it while the page follows the brand.
 */

const BRAND_PRESETS: readonly string[] = Object.values(BRAND_DEFAULT_PRESETS)

/** Whether the scheme is the preset a brand defaults to: the card a brand's own mark is drawn beside. */
function isBrandPreset(scheme: PaletteScheme) {
  return BRAND_PRESETS.includes(scheme.id)
}

function PaletteCards(props: { prefs: Prefs, write: SettingsView['write'] }) {
  const { prefs, write } = props
  const following = prefs.paletteColors === PALETTE_COLORING_BRAND
  const painted = following ? BRAND_DEFAULT_PRESETS[prefs.brand] : prefs.paletteColors
  const follow = () => write({ paletteColors: PALETTE_COLORING_BRAND })
  const pick = (scheme: PaletteScheme) => write({ paletteColors: scheme.id })
  const create = () => {
    const id = newSchemeId(prefs)
    const scheme: PaletteScheme = { id, name: copy('paletteDefaultName'), base: BRAND_DEFAULT_PRESETS[prefs.brand] }
    write(selectSchemePatch(prefs, scheme))
    // The record is still on its way to the form: the editor starts from the scheme in hand.
    openPaletteManager({ edit: id, created: scheme })
  }
  // Enter and Space on a card itself pick it; the buttons inside it handle their own keys.
  const keyPick = (event: React.KeyboardEvent<HTMLDivElement>, run: () => void) => {
    if (event.target !== event.currentTarget || (event.key !== 'Enter' && event.key !== ' ')) return
    event.preventDefault()
    run()
  }
  const inner = (label: string, action: string, run: () => void) => React.createElement('button', {
    type: 'button',
    className: 'dsh-claude-palette-reset',
    'data-action': action,
    onClick: (event: React.MouseEvent<HTMLButtonElement>) => {
      event.stopPropagation()
      run()
    },
  }, label)
  const stored = storedSchemes(prefs)
  const cards = cardSchemes(prefs).map((scheme) => {
    const selected = scheme.id === painted
    const edited = isPresetScheme(scheme) && stored.some((entry) => entry.id === scheme.id)
    return React.createElement(
      'div',
      {
        key: scheme.id,
        className: 'dsh-claude-palette-card',
        role: 'button',
        tabIndex: 0,
        'data-brand': isBrandPreset(scheme) ? scheme.id : undefined,
        'data-scheme': isBrandPreset(scheme) ? undefined : scheme.id,
        'data-active': selected ? '' : undefined,
        'aria-pressed': selected ? 'true' : 'false',
        'aria-label': schemeLabel(scheme),
        onClick: () => { if (!selected) pick(scheme) },
        onKeyDown: (event: React.KeyboardEvent<HTMLDivElement>) => keyPick(event, () => { if (!selected) pick(scheme) }),
      },
      React.createElement(Swatches, { colours: schemeDiscs(scheme, isPresetScheme(scheme) && !edited) }),
      React.createElement('span', { className: 'dsh-claude-palette-card-name' }, schemeLabel(scheme)),
      React.createElement(
        'span',
        { className: 'dsh-claude-palette-card-actions' },
        edited ? React.createElement('span', { className: 'dsh-claude-palette-card-tag' }, copy('paletteEdited')) : null,
        inner(copy('paletteEdit'), 'edit', () => openPaletteManager({ edit: scheme.id })),
        selected && !following ? inner(copy('paletteUseBrand'), 'follow-brand', follow) : null,
      ),
    )
  })
  const add = React.createElement(
    'button',
    {
      key: 'new',
      type: 'button',
      className: 'dsh-claude-palette-card dsh-claude-palette-new',
      disabled: !canAddScheme(prefs),
      onClick: create,
    },
    React.createElement('span', { className: 'dsh-claude-palette-new-mark', 'aria-hidden': 'true' }, '+'),
    React.createElement('span', { className: 'dsh-claude-palette-card-name' }, copy('paletteNew')),
  )
  return React.createElement(
    'div',
    { className: 'dsh-claude-palette-block' },
    React.createElement('div', { className: 'dsh-claude-palette-cards', role: 'group', 'aria-label': copy('paletteCardsTitle') }, cards, add),
    React.createElement(
      'div',
      { className: 'dsh-claude-palette-toolbar' },
      React.createElement('button', {
        type: 'button',
        className: 'dsh-claude-palette-reset',
        'data-action': 'manage',
        onClick: () => openPaletteManager({}),
      }, copy('paletteManage')),
    ),
  )
}

/**
 * The cards as a block row without a title of its own, ahead of the background
 * opacity under the same switch.
 */
export function paletteCardsRow(view: SettingsView): SettingsRow {
  return {
    rank: 51,
    node: view.controls.row('paletteCards', null, null, React.createElement(PaletteCards, { prefs: view.prefs, write: view.write }), { block: true }),
  }
}
