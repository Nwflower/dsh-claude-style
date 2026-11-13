import * as React from 'react'
import { BRAND_DEFAULT_PRESETS, PALETTE_COLORING_BRAND, PALETTE_PRESETS } from '../../constants'
import { readPrefs, savePrefs } from '../../core/prefs'
import { accentInk, contrastRatio, luminance } from '../../shared/contrast'
import { canAddScheme, duplicateScheme, removeSchemePatch, selectSchemePatch, storedSchemes, storeSchemePatch } from '../../shared/palette-scheme'
import { presetCard, schemeColours } from '../../shared/palette-colours'
import { PALETTE_ACCENT_CONTRAST, PALETTE_EDGES, PALETTE_SCHEME_LIMIT, PALETTE_SCHEME_NAME_MAX, PALETTE_TEXT_CONTRAST } from '@dsh-claude-style/contracts/palette-schemes'
import { Glyph, isPresetScheme, presetLabel, schemeLabel } from './palette-parts'
import { createSettingsControls } from './settings-controls'
import type { SchemeColours } from '../../shared/palette-colours'
import type { ColourPair, PaletteEdges, PaletteScheme } from '@dsh-claude-style/contracts/palette-schemes'
import type { Prefs } from '../../constants'
import { copy } from './copy'
import type { CopyKey } from './copy'

/**
 * The editor of one scheme (D96), the manager's right-hand pane: its name, a
 * specimen of the scheme in the light and the dark appearance, the four
 * colours under the specimen they paint with the contrast each reads at, how a
 * dark outline is drawn and the preset a reader's scheme starts from. Every
 * change is stored at once; the contrast is a read-out and never stops a save.
 */

type Seed = 'accent' | 'background' | 'code' | 'link'
type Appearance = 'light' | 'dark'

const APPEARANCES: readonly Appearance[] = ['light', 'dark']
const APPEARANCE_LABELS: Record<Appearance, CopyKey> = { light: 'paletteLight', dark: 'paletteDark' }

/** The colours kept one per appearance, in the cards' order, and the least contrast each owes its background (none for the background itself). */
const PAIRED: readonly { seed: Exclude<Seed, 'accent'>, label: CopyKey, least: number | null }[] = [
  { seed: 'background', label: 'paletteSeedBackground', least: null },
  { seed: 'code', label: 'paletteSeedCode', least: PALETTE_TEXT_CONTRAST },
  { seed: 'link', label: 'paletteSeedLink', least: PALETTE_TEXT_CONTRAST },
]

const EDGE_LABELS: Record<PaletteEdges, CopyKey> = { highlight: 'paletteEdgesHighlight', surface: 'paletteEdgesSurface' }

const PRESETS: readonly string[] = PALETTE_PRESETS

/** A specimen's own ink is the dark one above this background luminance, the light one under it. */
const SPECIMEN_INK_TURN = 0.35

const controls = createSettingsControls()

/** The scheme the editor starts from: the stored record, a preset with no record yet, or the one just made. */
export function editedScheme(prefs: Prefs, id: string, created: PaletteScheme | undefined): PaletteScheme | undefined {
  const stored = storedSchemes(prefs).find((scheme) => scheme.id === id)
  if (stored !== undefined) return stored
  if (PRESETS.includes(id)) return { id, name: '', base: id }
  return created?.id === id ? created : undefined
}

/** The scheme with one colour set; the accent is a single colour, the others one per appearance. */
function withColour(scheme: PaletteScheme, seed: Seed, appearance: Appearance, value: string): PaletteScheme {
  if (seed === 'accent') return { ...scheme, accent: value }
  const pair: ColourPair = { ...scheme[seed], [appearance]: value }
  return { ...scheme, [seed]: pair }
}

/** The scheme with one seed left to its starting preset again. */
function withoutSeed(scheme: PaletteScheme, seed: Seed | 'edges'): PaletteScheme {
  const next = { ...scheme }
  delete next[seed]
  return next
}

/** One contrast read-out: the ratio, marked when it falls under what the colour owes its background. */
function Contrast(props: { colour: string, background: string, least: number, appearance?: Appearance }) {
  const ratio = contrastRatio(props.colour, props.background)
  const low = ratio < props.least
  const figure = ratio.toFixed(1)
  const said = low ? copy('paletteContrastLow', { ratio: figure, least: String(props.least) }) : copy('paletteContrast', { ratio: figure })
  const side = props.appearance === undefined ? null : copy(APPEARANCE_LABELS[props.appearance])
  // The pill shows the bare ratio; its name says what the figure is and, when it is low, what it falls under.
  return React.createElement(
    'span',
    { className: 'dsh-claude-scheme-contrast', role: 'img', 'aria-label': side === null ? said : `${side} ${said}`, 'data-low': low ? '' : undefined },
    side === null ? null : React.createElement('span', { className: 'dsh-claude-scheme-contrast-side' }, side),
    `${figure}:1`,
  )
}

/**
 * The scheme as it reads in one appearance: a heading, a line of prose with an
 * inline-code chip and a link, and a filled control, on the scheme's own
 * background. The inks around them are tones of that background (the
 * stylesheet), so the specimen stays readable on whatever the reader picks.
 */
function Specimen(props: { colours: SchemeColours, appearance: Appearance }) {
  const { colours, appearance } = props
  const background = colours.background[appearance]
  const link = colours.link[appearance]
  return React.createElement(
    'div',
    {
      className: 'dsh-claude-scheme-specimen',
      role: 'img',
      'aria-label': copy(APPEARANCE_LABELS[appearance]),
      'data-appearance': appearance,
      'data-ink': luminance(background) > SPECIMEN_INK_TURN ? 'dark' : 'light',
      'data-link': link === undefined ? 'derived' : undefined,
      style: {
        '--dsh-claude-specimen-canvas': background,
        '--dsh-claude-specimen-accent': colours.accent,
        '--dsh-claude-specimen-accent-ink': accentInk(colours.accent),
        '--dsh-claude-specimen-code': colours.code[appearance],
        '--dsh-claude-specimen-link': link,
      } as React.CSSProperties,
    },
    React.createElement('span', { className: 'dsh-claude-scheme-specimen-tag' }, copy(APPEARANCE_LABELS[appearance])),
    React.createElement('span', { className: 'dsh-claude-scheme-specimen-heading' }, copy('paletteSampleHeading')),
    React.createElement(
      'span',
      { className: 'dsh-claude-scheme-specimen-prose' },
      copy('paletteSampleLead'),
      // A span, so the host's own inline-code rules, which read the page's appearance, stay off the chip.
      React.createElement('span', { className: 'dsh-claude-scheme-specimen-code' }, 'npm run build'),
      copy('paletteSampleJoin'),
      React.createElement('span', { className: 'dsh-claude-scheme-specimen-link' }, copy('paletteSampleLink')),
    ),
    React.createElement('span', { className: 'dsh-claude-scheme-specimen-button' }, copy('paletteSampleButton')),
  )
}

/** One colour well: the disc that opens the colour picker, the colour's value and its read-outs. */
function Well(props: { name: string, colour: string, text: string, derived?: boolean, wide?: boolean, disabled: boolean, pick(value: string): void, children?: React.ReactNode }) {
  return React.createElement(
    'label',
    { className: 'dsh-claude-scheme-well', 'data-derived': props.derived === true ? '' : undefined, 'data-wide': props.wide === true ? '' : undefined },
    React.createElement(
      'span',
      { className: 'dsh-claude-scheme-disc', style: { color: props.colour } },
      React.createElement('input', {
        type: 'color',
        className: 'dsh-claude-scheme-disc-input',
        value: props.colour,
        disabled: props.disabled,
        'aria-label': props.name,
        onChange: (event: React.ChangeEvent<HTMLInputElement>) => props.pick(event.target.value),
      }),
    ),
    React.createElement('span', { className: 'dsh-claude-scheme-hex' }, props.text),
    props.children,
  )
}

/** The mark that hands one seed back to the starting preset; a seed the scheme does not own keeps the column's width. */
function Reset(props: { own: boolean, name: string, run(): void }) {
  if (!props.own) return React.createElement('span', { className: 'dsh-claude-scheme-reset-space' })
  return React.createElement(
    'button',
    { type: 'button', className: 'dsh-claude-scheme-reset', 'aria-label': `${copy('paletteSeedReset')} ${props.name}`, onClick: props.run },
    React.createElement(Glyph, { name: 'undo' }),
  )
}

/**
 * The editor of the scheme `id`. `open` moves the manager to another scheme (a
 * copy just made) and `leave` moves it off a scheme just deleted; `enter` is
 * the side the pane arrives from, following the scheme's place in the
 * manager's list.
 */
export function PaletteEditor(props: { prefs: Prefs, id: string, created: PaletteScheme | undefined, enter: 'above' | 'below' | null, open(id: string, created?: PaletteScheme): void, leave(): void }) {
  const { prefs, id, created } = props
  const [draft, setDraft] = React.useState<PaletteScheme | undefined>(() => editedScheme(prefs, id, created))
  const [confirming, setConfirming] = React.useState(false)
  const name = React.useRef<HTMLInputElement>(null)
  // A scheme just made opens with its name selected, ready to be typed over.
  React.useEffect(() => {
    if (created?.id === id) name.current?.select()
  }, [])
  if (draft === undefined) return null
  const preset = isPresetScheme(draft)
  const selected = prefs.paletteColors === id
  // The brand's default scheme is painted without being selected while the selection follows the brand.
  const following = prefs.paletteColors === PALETTE_COLORING_BRAND && BRAND_DEFAULT_PRESETS[prefs.brand] === id
  const commit = (next: PaletteScheme) => {
    const patch = storeSchemePatch(readPrefs(), next)
    setDraft(next)
    savePrefs(patch)
  }
  const choose = (patch: Partial<Prefs>) => { savePrefs(patch) }
  const duplicate = () => {
    const copied = duplicateScheme(readPrefs(), draft, copy('paletteCopyName', { name: schemeLabel(draft) }).slice(0, PALETTE_SCHEME_NAME_MAX))
    choose(selectSchemePatch(readPrefs(), copied))
    props.open(copied.id, copied)
  }
  const restore = () => {
    setDraft({ id, name: '', base: id })
    choose(removeSchemePatch(readPrefs(), id))
  }
  const hasRecord = storedSchemes(prefs).some((scheme) => scheme.id === id)
  const canStore = hasRecord || canAddScheme(prefs)
  const colours = schemeColours(draft)
  const edges = draft.edges ?? presetCard(draft.base).edges
  const rows = PAIRED.map(({ seed, label, least }) => [
    React.createElement('span', { key: `${seed}-name`, className: 'dsh-claude-scheme-seed-name' }, copy(label)),
    ...APPEARANCES.map((appearance) => {
      const value = colours[seed][appearance]
      return React.createElement(
        Well,
        {
          key: `${seed}-${appearance}`,
          name: `${copy(label)} ${copy(APPEARANCE_LABELS[appearance])}`,
          // A link the scheme does not carry is drawn from the accent: the well shows the accent and says so.
          colour: value ?? colours.accent,
          text: value ?? copy('paletteLinkDerived'),
          derived: value === undefined,
          disabled: !canStore,
          pick: (picked) => commit(withColour(draft, seed, appearance, picked)),
        },
        least !== null && value !== undefined ? React.createElement(Contrast, { colour: value, background: colours.background[appearance], least }) : null,
      )
    }),
    React.createElement(Reset, { key: `${seed}-reset`, own: draft[seed] !== undefined, name: copy(label), run: () => commit(withoutSeed(draft, seed)) }),
  ])
  return React.createElement(
    'div',
    { className: 'dsh-claude-scheme-editor', 'data-enter': props.enter ?? undefined },
    React.createElement(
      'header',
      { className: 'dsh-claude-scheme-title' },
      preset
        ? React.createElement('h3', { className: 'dsh-claude-scheme-name' }, schemeLabel(draft))
        : React.createElement('input', {
          ref: name,
          type: 'text',
          className: 'dsh-claude-scheme-name',
          value: draft.name,
          maxLength: PALETTE_SCHEME_NAME_MAX,
          placeholder: copy('paletteDefaultName'),
          'aria-label': copy('paletteSchemeName'),
          spellCheck: false,
          autoComplete: 'off',
          onChange: (event: React.ChangeEvent<HTMLInputElement>) => commit({ ...draft, name: event.target.value }),
        }),
      preset && hasRecord ? React.createElement('span', { className: 'dsh-claude-palette-card-tag' }, copy('paletteEdited')) : null,
    ),
    React.createElement(
      'div',
      { className: 'dsh-claude-scheme-grid' },
      React.createElement('span', { key: 'corner' }),
      APPEARANCES.map((appearance) => React.createElement(Specimen, { key: appearance, colours, appearance })),
      React.createElement('span', { key: 'edge' }),
      React.createElement('span', { key: 'accent-name', className: 'dsh-claude-scheme-seed-name' }, copy('paletteSeedAccent')),
      // The accent is one colour in both appearances: one well across both columns, read against each background.
      React.createElement(
        Well,
        { key: 'accent', name: copy('paletteSeedAccent'), colour: colours.accent, text: colours.accent, wide: true, disabled: !canStore, pick: (picked) => commit(withColour(draft, 'accent', 'light', picked)) },
        APPEARANCES.map((appearance) => React.createElement(Contrast, { key: appearance, colour: colours.accent, background: colours.background[appearance], least: PALETTE_ACCENT_CONTRAST, appearance })),
      ),
      React.createElement(Reset, { key: 'accent-reset', own: draft.accent !== undefined, name: copy('paletteSeedAccent'), run: () => commit(withoutSeed(draft, 'accent')) }),
      rows,
    ),
    React.createElement('p', { className: 'dsh-claude-scheme-note' }, copy('paletteContrastNote', { text: String(PALETTE_TEXT_CONTRAST), accent: String(PALETTE_ACCENT_CONTRAST) })),
    React.createElement(
      'div',
      { className: 'dsh-claude-scheme-options' },
      React.createElement('span', { className: 'dsh-claude-scheme-seed-name' }, copy('paletteEdges')),
      controls.segment(PALETTE_EDGES.map((value) => ({ value, label: copy(EDGE_LABELS[value]) })), edges, (value) => commit({ ...draft, edges: value }), !canStore),
      React.createElement(Reset, { own: draft.edges !== undefined, name: copy('paletteEdges'), run: () => commit(withoutSeed(draft, 'edges')) }),
      preset ? null : React.createElement('span', { className: 'dsh-claude-scheme-seed-name' }, copy('paletteBase')),
      preset ? null : controls.segment(
        PALETTE_PRESETS.map((value) => ({ value, label: presetLabel(value) })),
        draft.base,
        (base) => commit({ ...draft, base }),
      ),
    ),
    React.createElement(
      'footer',
      { className: 'dsh-claude-scheme-foot' },
      selected || following
        ? React.createElement('span', { className: 'dsh-claude-scheme-status' }, React.createElement(Glyph, { name: 'check' }), copy(selected ? 'paletteInUse' : 'paletteInUseBrand'))
        : React.createElement('button', { type: 'button', className: 'dsh-claude-settings-button dsh-claude-scheme-button dsh-claude-scheme-primary', onClick: () => choose({ paletteColors: id }) }, copy('paletteUse')),
      // Pinning the brand's default keeps it when the brand changes.
      following ? React.createElement('button', { type: 'button', className: 'dsh-claude-settings-button dsh-claude-scheme-button', onClick: () => choose({ paletteColors: id }) }, copy('palettePin')) : null,
      canStore ? null : React.createElement('span', { className: 'dsh-claude-scheme-limit' }, copy('paletteLimit', { count: String(PALETTE_SCHEME_LIMIT) })),
      React.createElement('span', { className: 'dsh-claude-scheme-foot-gap' }),
      React.createElement('button', { type: 'button', className: 'dsh-claude-settings-button dsh-claude-scheme-button', disabled: !canAddScheme(prefs), onClick: duplicate }, copy('paletteDuplicate')),
      preset
        ? React.createElement('button', { type: 'button', className: 'dsh-claude-settings-button dsh-claude-scheme-button', disabled: !hasRecord, onClick: restore }, copy('paletteRestore'))
        : React.createElement('button', {
          type: 'button',
          className: 'dsh-claude-settings-button dsh-claude-scheme-button dsh-claude-scheme-danger',
          'data-confirming': confirming ? '' : undefined,
          onClick: () => {
            if (!confirming) {
              setConfirming(true)
              return
            }
            choose(removeSchemePatch(readPrefs(), id))
            props.leave()
          },
          onBlur: () => setConfirming(false),
        }, confirming ? copy('paletteDeleteConfirm') : copy('paletteDelete')),
    ),
  )
}
