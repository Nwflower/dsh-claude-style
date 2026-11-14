import * as React from 'react'
import { BRAND_DEFAULT_PRESETS, PALETTE_COLORING_BRAND } from '../../constants'
import { storedSchemes } from '../../shared/palette-scheme'
import { cardSchemes, isPresetScheme, schemeDiscs, schemeLabel, Swatches } from './palette-parts'
import { openPaletteManager } from './palette-manager'
import type { PaletteScheme } from '@dsh-claude-style/contracts/palette-schemes'
import type { Prefs } from '../../constants'
import type { SettingsRow, SettingsView } from './settings-controls'
import { copy } from './copy'

/**
 * The colour cards as the Appearance tab's last rows (D96): one card per
 * scheme — the presets (a preset the reader edited wears its edits), then the
 * reader's own. A card picks its scheme, and its discs, the one under the
 * pointer wearing a pencil, open that scheme in the manager (palette-manager.ts), which
 * holds the rest: making, editing, copying, deleting. The manager's own door
 * stands beside the colour switch (paletteManageButton). The card the page
 * paints wears the accent border; the preset the brand defaults to wears it
 * while the page follows the brand.
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
  // Enter and Space on a card itself pick it; the buttons inside it handle their own keys.
  const keyPick = (event: React.KeyboardEvent<HTMLDivElement>, run: () => void) => {
    if (event.target !== event.currentTarget || (event.key !== 'Enter' && event.key !== ' ')) return
    event.preventDefault()
    run()
  }
  const stored = storedSchemes(prefs)
  const cards = cardSchemes(prefs).map((scheme) => {
    const selected = scheme.id === painted
    const edited = isPresetScheme(scheme) && stored.some((entry) => entry.id === scheme.id)
    const label = schemeLabel(scheme)
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
        'aria-label': label,
        onClick: () => { if (!selected) pick(scheme) },
        onKeyDown: (event: React.KeyboardEvent<HTMLDivElement>) => keyPick(event, () => { if (!selected) pick(scheme) }),
      },
      React.createElement(Swatches, {
        colours: schemeDiscs(scheme, isPresetScheme(scheme) && !edited),
        edit: { label: `${copy('paletteEdit')} ${label}`, run: () => openPaletteManager({ edit: scheme.id }) },
      }),
      React.createElement('span', { className: 'dsh-claude-palette-card-name' }, label),
      edited || (selected && !following)
        ? React.createElement(
          'span',
          { className: 'dsh-claude-palette-card-actions' },
          edited ? React.createElement('span', { className: 'dsh-claude-palette-card-tag' }, copy('paletteEdited')) : null,
          selected && !following
            ? React.createElement('button', {
              type: 'button',
              className: 'dsh-claude-palette-reset',
              'data-action': 'follow-brand',
              onClick: (event: React.MouseEvent<HTMLButtonElement>) => {
                event.stopPropagation()
                follow()
              },
            }, copy('paletteUseBrand'))
            : null,
        )
        : null,
    )
  })
  return React.createElement('div', { className: 'dsh-claude-palette-cards', role: 'group', 'aria-label': copy('paletteCardsTitle') }, cards)
}

/** The manager's door, standing beside the colour switch while the cards are shown. */
export function paletteManageButton() {
  return React.createElement('button', {
    key: 'manage',
    type: 'button',
    className: 'dsh-claude-palette-manage',
    'data-action': 'manage',
    onClick: () => openPaletteManager({}),
  }, copy('paletteManage'))
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
