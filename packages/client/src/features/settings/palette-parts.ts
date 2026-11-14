import * as React from 'react'
import { PALETTE_PRESETS } from '../../constants'
import { hidePointerHint, POINTER_HINT_CLASS, showPointerHint } from '../../shared/pointer-hint'
import { PALETTE_SCHEME_CUSTOM } from '@dsh-claude-style/contracts/palette-schemes'
import { schemeColours } from '../../shared/palette-colours'
import { storedSchemes } from '../../shared/palette-scheme'
import type { PalettePreset, Prefs } from '../../constants'
import type { PaletteScheme } from '@dsh-claude-style/contracts/palette-schemes'
import { copy } from './copy'
import type { CopyKey } from './copy'

/**
 * What the colour cards and the scheme manager share (D97): a scheme's name as
 * the reader sees it and the row of discs that shows its colours.
 */

const PRESETS: readonly string[] = PALETTE_PRESETS

/** Every scheme the cards and the manager show: each preset (with the reader's edits, if any), then the reader's schemes in stored order. */
export function cardSchemes(prefs: Prefs): PaletteScheme[] {
  const stored = storedSchemes(prefs)
  const presets = PALETTE_PRESETS.map((id) => stored.find((scheme) => scheme.id === id) ?? { id, name: '', base: id })
  return [...presets, ...stored.filter((scheme) => !PRESETS.includes(scheme.id))]
}

/** Each preset's name: a brand's default goes by the brand's, the others by their own. */
const PRESET_LABELS: Record<PalettePreset, CopyKey> = {
  claude: 'brandClaude',
  deepseek: 'brandDeepseek',
  parchment: 'palettePresetParchment',
  forest: 'palettePresetForest',
  dusk: 'palettePresetDusk',
  rose: 'palettePresetRose',
}

export function presetLabel(preset: PalettePreset) {
  return copy(PRESET_LABELS[preset])
}

/** Whether the scheme is a preset's own record rather than one the reader made. */
export function isPresetScheme(scheme: PaletteScheme) {
  return PRESETS.includes(scheme.id)
}

/** The name a scheme goes by: a preset's own, the reader's name, or the earlier custom card's. */
export function schemeLabel(scheme: PaletteScheme) {
  if (isPresetScheme(scheme)) return presetLabel(scheme.id as PalettePreset)
  if (scheme.name !== '') return scheme.name
  return scheme.id === PALETTE_SCHEME_CUSTOM ? copy('paletteCustom') : copy('paletteUnnamed')
}

/** The five colours a card shows: accent, background, text, inline code and links. */
const DISCS = [
  { label: 'paletteSwatchAccent' },
  { label: 'paletteSwatchBackground' },
  { label: 'paletteSwatchText' },
  { label: 'paletteSwatchCode' },
  { label: 'paletteSwatchLink' },
] as const

/** A colour in both appearances as one CSS value: the page's colour scheme picks the half. */
function pairColour(light: string, dark: string) {
  return `light-dark(${light}, ${dark})`
}

/** The CSS colours of a scheme's five discs; a link the page derives shows the accent it is derived from. */
export function schemeDiscs(scheme: PaletteScheme, staticPreset: boolean) {
  const colours = schemeColours(scheme, staticPreset)
  return [
    colours.accent,
    pairColour(colours.background.light, colours.background.dark),
    pairColour(colours.text.light, colours.text.dark),
    pairColour(colours.code.light, colours.code.dark),
    pairColour(colours.link.light ?? colours.accent, colours.link.dark ?? colours.accent),
  ]
}

/** The line marks of the manager and the cards, drawn on a 16px grid in the text colour around them. */
const GLYPHS = {
  check: 'M3.5 8.5l3 3 6-7',
  close: 'M4 4l8 8M12 4l-8 8',
  pencil: 'M11.1 2.9l2 2-7.4 7.4-2.6.6.6-2.6 7.4-7.4Z',
  plus: 'M8 3.5v9M3.5 8h9',
  undo: 'M6 3.5L3.5 6 6 8.5M3.5 6h5.75a3.25 3.25 0 010 6.5H7',
} as const

export function Glyph(props: { name: keyof typeof GLYPHS }) {
  return React.createElement(
    'svg',
    { className: 'dsh-claude-scheme-glyph', width: 16, height: 16, viewBox: '0 0 16 16', fill: 'none', 'aria-hidden': 'true' },
    React.createElement('path', { d: GLYPHS[props.name], stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round' }),
  )
}

/** A scheme's five colours as a row of small dots, for a line of the manager's list. */
export function SchemeDots(props: { colours: string[] }) {
  return React.createElement(
    'span',
    { className: 'dsh-claude-scheme-dots', 'aria-hidden': 'true' },
    props.colours.map((colour, index) => React.createElement('span', { key: index, className: 'dsh-claude-scheme-dot', style: { color: colour } })),
  )
}

/**
 * Puts the group's one hint over a disc (transitions.dev's "Tooltip open/close",
 * MIT): while it shows it travels there and takes the new label's width; while
 * it is hidden its place and width are written with transitions off, so only
 * the delayed appear plays.
 */
function placeHint(hint: HTMLElement, disc: HTMLElement, label: string) {
  showPointerHint(hint, label, text => {
    const style = getComputedStyle(hint)
    const width = Math.ceil(text.scrollWidth + Number.parseFloat(style.paddingLeft) + Number.parseFloat(style.paddingRight))
    // The disc's layout offset excludes its own lift and scale.
    const x = disc.offsetLeft + disc.offsetWidth / 2 - width / 2
    return () => {
      hint.style.width = `${width}px`
      hint.style.setProperty('--dsh-claude-hint-x', `${x}px`)
    }
  }, 'data-show')
}

/**
 * The five discs of one scheme. The disc under the pointer lifts its
 * neighbours less the further they stand (transitions.dev's "Avatar group
 * hover", MIT) and names itself in the hint. Each disc is also the button that
 * opens the scheme's editor, and wears the pencil while it is under the
 * pointer (palette-schemes.css); pressing it leaves the card around it unpicked.
 */
export function Swatches(props: { colours: string[], edit: { label: string, run(): void } }) {
  const [lifted, setLifted] = React.useState<number | null>(null)
  const hint = React.useRef<HTMLSpanElement>(null)
  const release = () => {
    setLifted(null)
    hidePointerHint(hint.current, 'data-show')
  }
  return React.createElement(
    'span',
    {
      className: 'dsh-claude-palette-swatches',
      'data-dsh-claude-lifting': lifted === null ? undefined : '',
      onPointerLeave: release,
    },
    DISCS.map((disc, index) => React.createElement('button', {
      key: disc.label,
      type: 'button',
      className: 'dsh-claude-palette-swatch',
      style: {
        color: props.colours[index],
        '--dsh-claude-lift-reach': lifted === null ? undefined : String(Math.abs(index - lifted)),
      } as React.CSSProperties,
      'data-dsh-claude-lifted': index === lifted ? '' : undefined,
      'data-action': 'edit',
      'aria-label': `${props.edit.label} · ${copy(disc.label)}`,
      onClick: (event: React.MouseEvent<HTMLButtonElement>) => {
        event.stopPropagation()
        props.edit.run()
      },
      onPointerEnter: (event: React.PointerEvent<HTMLSpanElement>) => {
        setLifted(index)
        placeHint(hint.current!, event.currentTarget, copy(disc.label))
      },
      onFocus: (event: React.FocusEvent<HTMLSpanElement>) => {
        setLifted(index)
        placeHint(hint.current!, event.currentTarget, copy(disc.label))
      },
      onBlur: release,
    }, React.createElement(Glyph, { name: 'pencil' }))),
    // The discs carry their own names; the hint repeats them for the eye only.
    React.createElement(
      'span',
      { ref: hint, className: `dsh-claude-palette-hint ${POINTER_HINT_CLASS}`, 'aria-hidden': 'true' },
      React.createElement('span', { className: 'dsh-claude-palette-hint-text' }),
    ),
  )
}
