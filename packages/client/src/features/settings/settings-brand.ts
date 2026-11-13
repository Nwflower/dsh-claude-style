import * as React from 'react'
import { BRAND_INK_ACCENT, BRAND_INK_ORIGINAL, BRAND_DEFAULT_PRESETS, BRAND_INK_TEXT, PALETTE_COLORING_BRAND, PALETTE_COLORING_CUSTOM, PALETTE_PRESETS } from '../../constants'
import { PALETTE_CARDS } from 'virtual:dsh-claude-style/generated'
import { BrandLockup } from './settings-brand-lockup'
import { withoutTransition } from '../../shared/transition'
import { newCustomScheme, selectedReaderScheme, selectSchemePatch } from '../../shared/palette-scheme'
import type { PaletteScheme } from '@dsh-claude-style/contracts/palette-schemes'
import type { SegmentOption, SettingsRow, SettingsView } from './settings-controls'
import type { Prefs } from '../../constants'
import { copy } from './copy'

/**
 * The Appearance tab's custom brand rows (D30), which open the tab: the switch
 * that keeps the sidebar's brand area on the page, then the brand area drawn as
 * the lockup the reader edits in place (settings-brand-lockup.ts), with how the
 * images are inked as its sub-row. The name and the two images are the reader's
 * own data, written through the page's write path and the host half's brand
 * routes, so the lockup edits the same values the sidebar paints. The colour
 * cards stand apart from them as Colours' sub-row (paletteCardsRow).
 */

/**
 * One colour of a card: its name, the preset's own value, the value the
 * reader's scheme carries, and the scheme with that colour set. The code colour
 * the swatch shows is the light one; picking it sets both appearances.
 */
const COLOURS = [
  { field: 'accent', label: 'paletteSwatchAccent', pick: (card: Card) => card.accent, own: (scheme: PaletteScheme) => scheme.accent, set: (scheme: PaletteScheme, value: string): PaletteScheme => ({ ...scheme, accent: value }) },
  { field: 'canvasLight', label: 'paletteSwatchLight', pick: (card: Card) => card.canvas.light, own: (scheme: PaletteScheme) => scheme.background?.light, set: (scheme: PaletteScheme, value: string): PaletteScheme => ({ ...scheme, background: { ...scheme.background, light: value } }) },
  { field: 'canvasDark', label: 'paletteSwatchDark', pick: (card: Card) => card.canvas.dark, own: (scheme: PaletteScheme) => scheme.background?.dark, set: (scheme: PaletteScheme, value: string): PaletteScheme => ({ ...scheme, background: { ...scheme.background, dark: value } }) },
  { field: 'textLight', label: 'paletteSwatchTextLight', pick: (card: Card) => card.text.light, own: (scheme: PaletteScheme) => scheme.text?.light, set: (scheme: PaletteScheme, value: string): PaletteScheme => ({ ...scheme, text: { ...scheme.text, light: value } }) },
  { field: 'textDark', label: 'paletteSwatchTextDark', pick: (card: Card) => card.text.dark, own: (scheme: PaletteScheme) => scheme.text?.dark, set: (scheme: PaletteScheme, value: string): PaletteScheme => ({ ...scheme, text: { ...scheme.text, dark: value } }) },
  { field: 'code', label: 'paletteSwatchCode', pick: (card: Card) => card.code.light, own: (scheme: PaletteScheme) => scheme.code?.light, set: (scheme: PaletteScheme, value: string): PaletteScheme => ({ ...scheme, code: { light: value, dark: value } }) },
] as const

type Card = (typeof PALETTE_CARDS)[number]
type ColourField = (typeof COLOURS)[number]['field']

/** The brand cards in the settings page's brand order, each with the id the preference stores. */
const BRAND_CARDS = PALETTE_PRESETS.map((id) => {
  const card = PALETTE_CARDS.find((entry) => entry.id === id)
  if (card === undefined) throw new Error(`settings: the palette carries no ${id} card`)
  return { id, card }
})

/** The name a card goes by, in the settings page's own language. */
function cardName(card: Card) {
  return card.id === 'claude' ? copy('brandClaude') : copy('brandDeepseek')
}

/**
 * Puts the group's one hint over a disc (transitions.dev's "Tooltip open/close",
 * MIT): while it shows it travels there and takes the new label's width; while
 * it is hidden its place and width are written with transitions off, so only
 * the delayed appear plays.
 */
function placeHint(hint: HTMLElement, disc: HTMLElement, label: string) {
  const text = hint.firstElementChild as HTMLElement
  const showing = hint.hasAttribute('data-show')
  text.textContent = label
  const style = getComputedStyle(hint)
  const width = Math.ceil(text.scrollWidth + Number.parseFloat(style.paddingLeft) + Number.parseFloat(style.paddingRight))
  // offsetLeft, not the client rect: the disc's own lift and scale stay out of the measure.
  const x = disc.offsetLeft + disc.offsetWidth / 2 - width / 2
  const write = () => {
    hint.style.width = `${width}px`
    hint.style.setProperty('--dsh-claude-hint-x', `${x}px`)
  }
  if (showing) write()
  else withoutTransition([hint], write)
  hint.setAttribute('data-show', '')
}

/**
 * The six swatches of one card. A brand card's swatches are its colours as the
 * token sheet resolves them; the reader's card takes a colour well each, and
 * every pick switches the page to that card at once. The disc under the pointer
 * or the focus lifts its neighbours less the further they stand
 * (transitions.dev's "Avatar group hover", MIT) and names itself in the hint.
 */
function Swatches(props: { colours: string[], onChange?: (field: ColourField, value: string) => void }) {
  const { colours, onChange } = props
  const [lifted, setLifted] = React.useState<number | null>(null)
  const hint = React.useRef<HTMLSpanElement>(null)
  const point = (disc: HTMLElement, index: number) => {
    setLifted(index)
    placeHint(hint.current!, disc, copy(COLOURS[index].label))
  }
  const release = () => {
    setLifted(null)
    hint.current!.removeAttribute('data-show')
  }
  return React.createElement(
    'span',
    {
      className: 'dsh-claude-palette-swatches',
      'data-dsh-claude-lifting': lifted === null ? undefined : '',
      onPointerLeave: release,
    },
    COLOURS.map((colour, index) => {
      const label = copy(colour.label)
      const value = colours[index]
      const readOut = onChange === undefined
      return React.createElement(
        'span',
        {
          key: colour.field,
          className: 'dsh-claude-palette-swatch',
          style: {
            color: value,
            '--dsh-claude-lift-reach': lifted === null ? undefined : String(Math.abs(index - lifted)),
          } as React.CSSProperties,
          'data-dsh-claude-lifted': index === lifted ? '' : undefined,
          'aria-label': readOut ? label : undefined,
          role: readOut ? 'img' : undefined,
          onPointerEnter: (event: React.PointerEvent<HTMLSpanElement>) => point(event.currentTarget, index),
          // A brand disc takes no focus; the reader's discs take it through their colour wells.
          onFocus: (event: React.FocusEvent<HTMLSpanElement>) => point(event.currentTarget, index),
          onBlur: release,
        },
        onChange === undefined ? null : React.createElement('input', {
          type: 'color',
          className: 'dsh-claude-palette-swatch-input',
          value,
          'aria-label': label,
          onChange: (event: React.ChangeEvent<HTMLInputElement>) => onChange(colour.field, event.target.value),
        }),
      )
    }),
    // The discs carry their own names; the hint repeats them for the eye only.
    React.createElement(
      'span',
      { ref: hint, className: 'dsh-claude-palette-hint', 'aria-hidden': 'true' },
      React.createElement('span', { className: 'dsh-claude-palette-hint-text' }),
    ),
  )
}

/**
 * The three cards: the two brands' colour sets and the reader's own. Every card
 * can be picked: a brand card pins that card's colours whatever the theme style
 * says, and the card the page paints wears the selected border. Each picked
 * card offers "follow the brand again", which hands the colours back to the
 * brand the theme style chooses; the reader's six stay stored.
 */
function PaletteCards(props: { prefs: Prefs, write: SettingsView['write'] }) {
  const { prefs, write } = props
  const brand = PALETTE_CARDS.find((entry) => entry.id === BRAND_DEFAULT_PRESETS[prefs.brand]) ?? PALETTE_CARDS[0]
  const following = prefs.paletteColors === PALETTE_COLORING_BRAND
  const custom = prefs.paletteColors === PALETTE_COLORING_CUSTOM
  const painted = following ? brand.id : prefs.paletteColors
  const scheme = selectedReaderScheme(prefs) ?? newCustomScheme(prefs)
  const base = PALETTE_CARDS.find((entry) => entry.id === scheme.base) ?? brand
  const reader = COLOURS.map((colour) => colour.own(scheme) ?? colour.pick(base))
  const pick = (field: ColourField, value: string) => {
    const colour = COLOURS.find((entry) => entry.field === field)!
    write(selectSchemePatch(prefs, colour.set(scheme, value)))
  }
  const select = (colouring: Prefs['paletteColors']) => {
    if (colouring === PALETTE_COLORING_CUSTOM) write(selectSchemePatch(prefs, scheme))
    else write({ paletteColors: colouring })
  }
  const follow = () => write({ paletteColors: PALETTE_COLORING_BRAND })
  // Enter and Space on a card itself pick it; the reset and the colour wells
  // inside the card handle their own keys.
  const keyPick = (event: React.KeyboardEvent<HTMLDivElement>, run: () => void) => {
    if (event.target !== event.currentTarget || (event.key !== 'Enter' && event.key !== ' ')) return
    event.preventDefault()
    run()
  }
  const reset = (shown: boolean) => shown
    ? React.createElement('button', {
      type: 'button',
      className: 'dsh-claude-palette-reset',
      onClick: (event: React.MouseEvent<HTMLButtonElement>) => {
        event.stopPropagation()
        follow()
      },
    }, copy('paletteUseBrand'))
    : null
  return React.createElement(
    'div',
    { className: 'dsh-claude-palette-cards', role: 'group', 'aria-label': copy('paletteCardsTitle') },
    BRAND_CARDS.map(({ id, card }) => {
      const selected = !custom && id === painted
      return React.createElement(
        'div',
        {
          key: id,
          className: 'dsh-claude-palette-card',
          role: 'button',
          tabIndex: 0,
          'data-brand': id,
          'data-active': selected ? '' : undefined,
          'aria-pressed': selected ? 'true' : 'false',
          'aria-label': cardName(card),
          onClick: () => { if (!selected) select(id) },
          onKeyDown: (event: React.KeyboardEvent<HTMLDivElement>) => keyPick(event, () => { if (!selected) select(id) }),
        },
        React.createElement(Swatches, { colours: COLOURS.map((colour) => colour.pick(card)) }),
        React.createElement('span', { className: 'dsh-claude-palette-card-name' }, cardName(card)),
        reset(selected && !following),
      )
    }),
    React.createElement(
      'div',
      {
        className: 'dsh-claude-palette-card',
        role: 'button',
        tabIndex: 0,
        'data-active': custom ? '' : undefined,
        'aria-pressed': custom ? 'true' : 'false',
        'aria-label': copy('paletteCustom'),
        onClick: () => { if (!custom) select(PALETTE_COLORING_CUSTOM) },
        onKeyDown: (event: React.KeyboardEvent<HTMLDivElement>) => keyPick(event, () => { if (!custom) select(PALETTE_COLORING_CUSTOM) }),
      },
      React.createElement(Swatches, { colours: reader, onChange: pick }),
      React.createElement('span', { className: 'dsh-claude-palette-card-name' }, copy('paletteCustom')),
      reset(custom),
    ),
  )
}

/**
 * The colour cards as Colours' sub-row (D72): the two brands' colours as the
 * page paints them, and the reader's own six, which switch the page to that
 * card the moment one is picked. The row carries no title of its own.
 */
export function paletteCardsRow(view: SettingsView): SettingsRow {
  return {
    rank: 15,
    node: view.controls.row('paletteCards', null, null, React.createElement(PaletteCards, { prefs: view.prefs, write: view.write }), { block: true }),
  }
}

/**
 * The custom brand rows, ranked ahead of every other row on the tab: the switch
 * that keeps the sidebar's brand area on the page, the lockup the reader edits in
 * place under it (titleless, the way the colour cards follow Colours), and how
 * the images are inked as that block's sub-row.
 */
export function brandRows(view: SettingsView): SettingsRow[] {
  const { prefs, write } = view
  const inkOptions: SegmentOption<Prefs['brandInk']>[] = [
    { value: BRAND_INK_ORIGINAL, label: copy('brandInkOriginal') },
    { value: BRAND_INK_ACCENT, label: copy('brandInkAccent') },
    { value: BRAND_INK_TEXT, label: copy('brandInkText') },
  ]
  return [
    {
      rank: 5,
      node: view.controls.row(
        'sidebarBrand',
        copy('brandLockupTitle'),
        copy('brandLockupDesc'),
        view.controls.toggle(prefs.sidebarBrand, on => { write({ sidebarBrand: on }) }),
      ),
    },
    {
      rank: 6,
      node: view.controls.row(
        'brandLockup',
        null,
        null,
        React.createElement(BrandLockup, { prefs, write }),
        { block: true },
      ),
    },
    {
      rank: 7,
      node: view.controls.subRow(
        'brandInk',
        copy('brandInkTitle'),
        copy('brandInkDesc'),
        view.controls.segment(inkOptions, prefs.brandInk, value => { write({ brandInk: value }) }),
        true,
      ),
    },
  ]
}
