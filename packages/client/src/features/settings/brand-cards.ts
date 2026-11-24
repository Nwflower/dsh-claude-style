import * as React from 'react'
import { brandingVendorOf } from '@dsh-claude-style/contracts/branding-presets'
import { brandingInkOf } from '../../shared/branding-presets'
import { activateOnCardKey } from '../../shared/preview-cards'
import { brandingLabel, SeatArt, useBrandImages, usePageAppearance, WordArt } from './brand-art'
import { openBrandManager } from './brand-manager'
import { Glyph } from './palette-parts'
import type { Prefs } from '../../constants'
import type { SettingsView } from './settings-controls'
import { copy } from './copy'

/**
 * The brand set the page paints, as one card under the brand switch drawn the
 * way the colour cards are (palette-cards.ts): its lockup in the appearance
 * and the ink the page shows, and its name. The card and the pencil on the
 * seat under the pointer open that set in the manager (brand-manager.ts),
 * which holds the rest: picking another set, making, editing, copying,
 * deleting.
 */

/** One seat of the card's lockup: the art, which fades under the pencil while the pointer is on it. */
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

function BrandCard(props: { prefs: Prefs }) {
  const { prefs } = props
  const id = prefs.brandingPreset
  const mode = usePageAppearance()
  const images = useBrandImages(prefs, id, mode)
  const ink = brandingInkOf(prefs, id)
  // A built-in set draws the art its lockup carries; only the reader's own set falls back to the brand's art.
  const absent = brandingVendorOf(id) === undefined ? 'brand' : 'none'
  const label = brandingLabel(prefs, id)
  const edit = () => openBrandManager({ edit: id })
  const editLabel = `${copy('paletteEdit')} ${label}`
  return React.createElement(
    'div',
    { className: 'dsh-claude-palette-cards dsh-claude-brand-cards' },
    React.createElement(
      'div',
      {
        className: 'dsh-claude-palette-card dsh-claude-brand-set-card',
        role: 'button',
        tabIndex: 0,
        'data-branding': id,
        'data-active': '',
        'aria-label': label,
        onClick: edit,
        onKeyDown: (event: React.KeyboardEvent<HTMLDivElement>) => activateOnCardKey(event, edit),
      },
      React.createElement(
        'span',
        { className: 'dsh-claude-brand-card-art' },
        React.createElement(CardSeat, { label: editLabel, edit, art: React.createElement(SeatArt, { kind: 'mark', image: images.mark, prefs, ink, absent }) }),
        React.createElement(CardSeat, { label: editLabel, edit, art: React.createElement(WordArt, { images, prefs, ink }) }),
      ),
      React.createElement('span', { className: 'dsh-claude-palette-card-name' }, label),
    ),
  )
}

/** The manager's door, standing beside the brand switch while the card is shown. */
export function brandManageButton() {
  return React.createElement('button', {
    key: 'manage',
    type: 'button',
    className: 'dsh-claude-palette-manage',
    'data-action': 'manage-brand',
    onClick: () => openBrandManager({}),
  }, copy('paletteManage'))
}

/** The card as a block row without a title of its own, under the brand switch. */
export function brandCardsNode(view: SettingsView) {
  return view.controls.row('brandLockup', null, null, React.createElement(BrandCard, { prefs: view.prefs }), { block: true })
}
