import * as React from 'react'
import { BACKGROUND_OPACITY_DEFAULT, BACKGROUND_OPACITY_MAX, BACKGROUND_OPACITY_MIN, PALETTE_CLAUDE, PALETTE_HOST, TYPEFACE_CLAUDE, TYPEFACE_HOST, TYPEFACE_SYSTEM } from '../../constants'
import { backgroundOpacityPercent } from '../../shared/background-opacity'
import { missingWebfonts } from '../../shared/webfont-rules'
import { webfontsInPlace } from '../../shared/webfonts'
import { brandRows } from './settings-brand'
import { paletteCardsRow } from './palette-cards'
import { PercentControl } from './settings-percent-control'
import { copy } from './copy'
import { noteDesc } from './settings-controls'
import type { Prefs } from '../../constants'
import type { SettingsRow, SettingsTab, SettingsView } from './settings-controls'

/**
 * The settings page's Appearance tab: the custom brand rows that open it
 * (settings-brand.ts), whether it sets the type, and the colours last: whether
 * the skin paints them, the scheme cards and manager (palette-cards.ts) and the
 * background fill's opacity under them. The home layout, the mascot and where
 * it stands are the features' own rows, placed here by their manifests (D76).
 */
/**
 * The background fill's opacity row: the percentage field and the seekbar the
 * page's own scale row shares its control with (settings-percent-control.ts),
 * writing the preference the canvas fills read as a colour mix toward
 * transparent (shared/background-opacity.ts). The row stands only under the
 * skin's own palette, like the colour cards above it, and only while a
 * wallpaper plugin holds a layer behind the canvas for it to show through
 * (theme/third-party.css reads that plugin's mark on the body).
 */
function backgroundOpacityRow(view: SettingsView): SettingsRow {
  return {
    rank: 52,
    node: view.controls.row(
      'backgroundOpacity',
      copy('backgroundOpacityTitle'),
      copy('backgroundOpacityDesc'),
      React.createElement(PercentControl, {
        percent: backgroundOpacityPercent(view.prefs.backgroundOpacity),
        min: BACKGROUND_OPACITY_MIN,
        max: BACKGROUND_OPACITY_MAX,
        defaultPercent: Number(BACKGROUND_OPACITY_DEFAULT),
        fieldLabel: copy('backgroundOpacityPercentLabel'),
        trackLabel: copy('backgroundOpacityTrackLabel'),
        resetLabel: copy('backgroundOpacityReset'),
        onPick: percent => { view.write({ backgroundOpacity: String(percent) }) },
        onReset: () => { view.write({ backgroundOpacity: BACKGROUND_OPACITY_DEFAULT }) },
      }),
      { experimental: true, mark: 'backgroundOpacity', sub: true },
    ),
  }
}

/**
 * The typeface row's description, with the faces the drop point is missing
 * under it while the skin's own faces are chosen (D75). The answer is the one
 * the page already holds (shared/webfonts.ts), read here rather than asked
 * again; before it arrives nothing is claimed about the faces.
 */
function typefaceDesc(prefs: Prefs): React.ReactNode {
  const faces = webfontsInPlace()
  if (prefs.typeface !== TYPEFACE_CLAUDE || faces === null) return copy('typefaceDesc')
  const missing = missingWebfonts(faces)
  if (missing.length === 0) return copy('typefaceDesc')
  return noteDesc(copy('typefaceDesc'), copy('typefaceMissing', { names: missing.join(' / ') }))
}

export function createSettingsAppearanceTab(): SettingsTab {
  function rows(view: SettingsView) {
    const prefs = view.prefs
    const write = view.write
    const controls = view.controls
    return [
      ...brandRows(view),
      // Both are the skin's own or the host's, nothing between: a switch, on for the skin's.
      {
        rank: 50,
        node: controls.row(
          'palette',
          copy('paletteTitle'),
          copy('paletteDesc'),
          controls.toggle(prefs.palette !== PALETTE_HOST, on => { write({ palette: on ? PALETTE_CLAUDE : PALETTE_HOST }) }),
        ),
      },
      // The cards belong to the skin's own colours: following the host leaves nothing to pick.
      ...(prefs.palette === PALETTE_HOST ? [] : [paletteCardsRow(view)]),
      // The opacity paints the skin's own canvas: following the host leaves nothing to see through.
      ...(prefs.palette === PALETTE_HOST ? [] : [backgroundOpacityRow(view)]),
      {
        rank: 20,
        node: controls.row(
          'typeface',
          copy('typefaceTitle'),
          typefaceDesc(prefs),
          controls.segment([
            { value: TYPEFACE_CLAUDE, label: copy('typefaceClaude') },
            { value: TYPEFACE_SYSTEM, label: copy('typefaceSystem') },
            { value: TYPEFACE_HOST, label: copy('typefaceHost') },
          ], prefs.typeface, value => { write({ typeface: value }) }),
        ),
      },
    ]
  }
  return { id: 'appearance', label: () => copy('tabAppearance'), rows }
}
