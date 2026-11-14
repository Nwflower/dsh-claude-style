import * as React from 'react'
import type { BrandingAppearance, BrandingPreset } from '@dsh-claude-style/contracts/branding-presets'
import { storedBrandingPresets } from '../../shared/branding-presets'
import { brandingLabel, SeatArt, useBrandImages, usePageAppearance, WordArt } from './brand-art'
import { openBrandManager } from './brand-manager'
import { Glyph } from './palette-parts'
import type { Prefs } from '../../constants'
import type { SettingsView } from './settings-controls'
import { copy } from './copy'

/**
 * The brand marks as cards under the brand switch, drawn the way the colour
 * cards are (palette-cards.ts): one card for the images kept outside any
 * preset, then one per preset, each showing its lockup in the appearance the
 * page shows. A card picks its set; the seat under the pointer wears a pencil
 * and opens that set in the manager (brand-manager.ts), which holds the rest:
 * making, editing, copying, deleting. The card the page paints wears the
 * accent border.
 */

/** One seat of a card's lockup: the art, which fades under the pencil while the pointer is on it. */
function CardSeat(props: { label: string, edit(): void, art: React.ReactNode }) {
  return React.createElement(
    'button',
    {
      type: 'button',
      className: 'dsh-claude-brand-card-seat',
      'data-action': 'edit',
      'aria-label': props.label,
      onClick: (event: React.MouseEvent<HTMLButtonElement>) => {
        event.stopPropagation()
        props.edit()
      },
    },
    props.art,
    React.createElement(Glyph, { name: 'pencil' }),
  )
}

function BrandCard(props: { prefs: Prefs, preset: BrandingPreset | undefined, mode: BrandingAppearance, pick(): void }) {
  const { prefs, preset } = props
  const images = useBrandImages(preset, props.mode)
  const selected = prefs.brandingPreset === (preset?.id ?? '')
  const label = brandingLabel(preset)
  const edit = () => openBrandManager({ edit: preset?.id ?? '' })
  const editLabel = `${copy('paletteEdit')} ${label}`
  return React.createElement(
    'div',
    {
      className: 'dsh-claude-palette-card dsh-claude-brand-card',
      role: 'button',
      tabIndex: 0,
      'data-branding': preset?.id ?? '',
      'data-active': selected ? '' : undefined,
      'aria-pressed': selected ? 'true' : 'false',
      'aria-label': label,
      onClick: () => { if (!selected) props.pick() },
      // Enter and Space on a card itself pick it; the seats inside it handle their own keys.
      onKeyDown: (event: React.KeyboardEvent<HTMLDivElement>) => {
        if (event.target !== event.currentTarget || (event.key !== 'Enter' && event.key !== ' ')) return
        event.preventDefault()
        if (!selected) props.pick()
      },
    },
    React.createElement(
      'span',
      { className: 'dsh-claude-brand-card-art' },
      React.createElement(CardSeat, { label: editLabel, edit, art: React.createElement(SeatArt, { kind: 'mark', image: images.mark, prefs }) }),
      React.createElement(CardSeat, { label: editLabel, edit, art: React.createElement(WordArt, { images, prefs }) }),
    ),
    React.createElement('span', { className: 'dsh-claude-palette-card-name' }, label),
  )
}

function BrandCards(props: { prefs: Prefs, write: SettingsView['write'] }) {
  const { prefs, write } = props
  const mode = usePageAppearance()
  const sets: (BrandingPreset | undefined)[] = [undefined, ...storedBrandingPresets(prefs)]
  return React.createElement(
    'div',
    { className: 'dsh-claude-palette-cards dsh-claude-brand-cards', role: 'group', 'aria-label': copy('brandingPresetLabel') },
    sets.map(preset => React.createElement(BrandCard, {
      key: preset?.id ?? '',
      prefs,
      preset,
      mode,
      pick: () => write({ brandingPreset: preset?.id ?? '' }),
    })),
  )
}

/** The manager's door, standing beside the brand switch while the cards are shown. */
export function brandManageButton() {
  return React.createElement('button', {
    key: 'manage',
    type: 'button',
    className: 'dsh-claude-palette-manage',
    'data-action': 'manage-brand',
    onClick: () => openBrandManager({}),
  }, copy('paletteManage'))
}

/** The cards as a block row without a title of its own, under the brand switch. */
export function brandCardsNode(view: SettingsView) {
  return view.controls.row('brandLockup', null, null, React.createElement(BrandCards, { prefs: view.prefs, write: view.write }), { block: true })
}
