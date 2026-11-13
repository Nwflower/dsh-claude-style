import * as React from 'react'
import { PALETTE_PRESETS } from '../../constants'
import { readPrefs, savePrefs } from '../../core/prefs'
import { contrastRatio } from '../../shared/contrast'
import { canAddScheme, duplicateScheme, removeSchemePatch, selectSchemePatch, storedSchemes, storeSchemePatch } from '../../shared/palette-scheme'
import { presetCard, schemeColours } from '../../shared/palette-colours'
import { PALETTE_ACCENT_CONTRAST, PALETTE_EDGES, PALETTE_SCHEME_LIMIT, PALETTE_SCHEME_NAME_MAX, PALETTE_TEXT_CONTRAST } from '@dsh-claude-style/contracts/palette-schemes'
import { isPresetScheme, schemeLabel } from './palette-parts'
import type { ColourPair, PaletteEdges, PaletteScheme } from '@dsh-claude-style/contracts/palette-schemes'
import type { Prefs } from '../../constants'
import { copy } from './copy'
import type { CopyKey } from './copy'

/**
 * The editor of one scheme (D96), the manager's second view: its name and
 * starting preset where the reader owns them, the four colours each in the
 * light and the dark appearance with the contrast they read at, and how a dark
 * outline is drawn. Every change is stored at once; the contrast is a read-out
 * and never stops a save.
 */

type Seed = 'accent' | 'background' | 'code' | 'link'
type Appearance = 'light' | 'dark'

const APPEARANCES: readonly Appearance[] = ['light', 'dark']

/** The seeds in the order the editor lists them, and the least contrast each owes its background (none for the background itself). */
const SEEDS: readonly { seed: Seed, label: CopyKey, least: number | null }[] = [
  { seed: 'accent', label: 'paletteSeedAccent', least: PALETTE_ACCENT_CONTRAST },
  { seed: 'code', label: 'paletteSeedCode', least: PALETTE_TEXT_CONTRAST },
  { seed: 'link', label: 'paletteSeedLink', least: PALETTE_TEXT_CONTRAST },
  { seed: 'background', label: 'paletteSeedBackground', least: null },
]

const EDGE_LABELS: Record<PaletteEdges, CopyKey> = { highlight: 'paletteEdgesHighlight', surface: 'paletteEdgesSurface' }

const PRESETS: readonly string[] = PALETTE_PRESETS

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
  const text = low
    ? copy('paletteContrastLow', { ratio: ratio.toFixed(1), least: String(props.least) })
    : copy('paletteContrast', { ratio: ratio.toFixed(1) })
  const named = props.appearance === undefined ? text : `${copy(props.appearance === 'light' ? 'paletteLight' : 'paletteDark')} ${text}`
  return React.createElement('span', { className: 'dsh-claude-scheme-contrast', 'data-low': low ? '' : undefined }, named)
}

function SeedRow(props: { scheme: PaletteScheme, seed: Seed, label: CopyKey, least: number | null, disabled: boolean, set(seed: Seed, appearance: Appearance, value: string): void, reset(seed: Seed): void }) {
  const { scheme, seed, label, least } = props
  const colours = schemeColours(scheme)
  const own = scheme[seed] !== undefined
  const well = (appearance: Appearance, value: string | undefined, fallback: string) => {
    const shown = value ?? fallback
    const background = colours.background[appearance]
    return React.createElement(
      'label',
      { key: appearance, className: 'dsh-claude-scheme-well' },
      React.createElement('span', { className: 'dsh-claude-scheme-well-name' }, copy(appearance === 'light' ? 'paletteLight' : 'paletteDark')),
      React.createElement('input', {
        type: 'color',
        className: 'dsh-claude-scheme-well-input',
        value: shown,
        disabled: props.disabled,
        'aria-label': `${copy(label)} ${copy(appearance === 'light' ? 'paletteLight' : 'paletteDark')}`,
        onChange: (event: React.ChangeEvent<HTMLInputElement>) => props.set(seed, appearance, event.target.value),
      }),
      React.createElement('span', { className: 'dsh-claude-scheme-hex' }, value === undefined ? copy('paletteLinkDerived') : value),
      least !== null && value !== undefined ? React.createElement(Contrast, { colour: value, background, least }) : null,
    )
  }
  const cells = seed === 'accent'
    // The accent is one colour in both appearances: one well, read against each background.
    ? [React.createElement(
      'label',
      { key: 'accent', className: 'dsh-claude-scheme-well' },
      React.createElement('input', {
        type: 'color',
        className: 'dsh-claude-scheme-well-input',
        value: colours.accent,
        disabled: props.disabled,
        'aria-label': copy(label),
        onChange: (event: React.ChangeEvent<HTMLInputElement>) => props.set(seed, 'light', event.target.value),
      }),
      React.createElement('span', { className: 'dsh-claude-scheme-hex' }, colours.accent),
      React.createElement(
        'span',
        { className: 'dsh-claude-scheme-contrasts' },
        APPEARANCES.map((appearance) => React.createElement(Contrast, { key: appearance, colour: colours.accent, background: colours.background[appearance], least: PALETTE_ACCENT_CONTRAST, appearance })),
      ),
    )]
    : APPEARANCES.map((appearance) => well(appearance, seed === 'background' ? colours.background[appearance] : seed === 'code' ? colours.code[appearance] : colours.link[appearance], colours.accent))
  return React.createElement(
    'div',
    { className: 'dsh-claude-scheme-seed', 'data-seed': seed },
    React.createElement('span', { className: 'dsh-claude-scheme-seed-name' }, copy(label)),
    React.createElement('span', { className: 'dsh-claude-scheme-wells' }, cells),
    own
      ? React.createElement('button', { type: 'button', className: 'dsh-claude-palette-reset', onClick: () => props.reset(seed) }, copy('paletteSeedReset'))
      : React.createElement('span', { className: 'dsh-claude-scheme-text-button-space' }),
  )
}

/** A row of exclusive choices drawn as buttons. */
function Choices<V extends string>(props: { name: string, options: readonly { value: V, label: string }[], value: V, disabled?: boolean, pick(value: V): void }) {
  return React.createElement(
    'span',
    { className: 'dsh-claude-scheme-choices', role: 'group', 'aria-label': props.name },
    props.options.map((option) => React.createElement('button', {
      key: option.value,
      type: 'button',
      className: 'dsh-claude-settings-button dsh-claude-scheme-choice',
      'aria-pressed': option.value === props.value ? 'true' : 'false',
      disabled: props.disabled,
      onClick: () => props.pick(option.value),
    }, option.label)),
  )
}

/**
 * The editor of the scheme `id`. `open` moves the manager to another scheme's
 * editor (a copy just made); `back` returns it to the list.
 */
export function PaletteEditor(props: { prefs: Prefs, id: string, created: PaletteScheme | undefined, open(id: string, created: PaletteScheme): void, back(): void }) {
  const { prefs, id, created } = props
  const [draft, setDraft] = React.useState<PaletteScheme | undefined>(() => editedScheme(prefs, id, created))
  const [confirming, setConfirming] = React.useState(false)
  React.useEffect(() => {
    if (draft === undefined) props.back()
  }, [draft])
  if (draft === undefined) return null
  const preset = isPresetScheme(draft)
  const selected = prefs.paletteColors === id
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
  const remove = () => {
    choose(removeSchemePatch(readPrefs(), id))
    props.back()
  }
  const restore = () => {
    const bare: PaletteScheme = { id, name: '', base: id }
    setDraft(bare)
    choose(removeSchemePatch(readPrefs(), id))
  }
  const hasRecord = storedSchemes(prefs).some((scheme) => scheme.id === id)
  const canStore = hasRecord || canAddScheme(prefs)
  const edges = draft.edges ?? presetCard(draft.base).edges
  return React.createElement(
    'div',
    { className: 'dsh-claude-scheme-editor' },
    preset ? null : React.createElement(
      'label',
      { className: 'dsh-claude-scheme-field' },
      React.createElement('span', { className: 'dsh-claude-scheme-seed-name' }, copy('paletteSchemeName')),
      React.createElement('input', {
        type: 'text',
        className: 'dsh-claude-settings-input dsh-claude-scheme-name',
        value: draft.name,
        maxLength: PALETTE_SCHEME_NAME_MAX,
        placeholder: copy('paletteDefaultName'),
        spellCheck: false,
        autoComplete: 'off',
        'data-modal-autofocus': '',
        onChange: (event: React.ChangeEvent<HTMLInputElement>) => commit({ ...draft, name: event.target.value }),
      }),
    ),
    preset ? null : React.createElement(
      'div',
      { className: 'dsh-claude-scheme-field' },
      React.createElement('span', { className: 'dsh-claude-scheme-seed-name' }, copy('paletteBase')),
      React.createElement(Choices<string>, {
        name: copy('paletteBase'),
        options: PALETTE_PRESETS.map((preset) => ({ value: preset, label: preset === 'claude' ? copy('brandClaude') : copy('brandDeepseek') })),
        value: draft.base,
        pick: (base) => commit({ ...draft, base }),
      }),
    ),
    SEEDS.map(({ seed, label, least }) => React.createElement(SeedRow, {
      key: seed,
      scheme: draft,
      seed,
      label,
      least,
      disabled: !canStore,
      set: (colourSeed, appearance, value) => commit(withColour(draft, colourSeed, appearance, value)),
      reset: (colourSeed) => commit(withoutSeed(draft, colourSeed)),
    })),
    React.createElement(
      'div',
      { className: 'dsh-claude-scheme-seed', 'data-seed': 'edges' },
      React.createElement('span', { className: 'dsh-claude-scheme-seed-name' }, copy('paletteEdges')),
      React.createElement(Choices<PaletteEdges>, {
        name: copy('paletteEdges'),
        options: PALETTE_EDGES.map((value) => ({ value, label: copy(EDGE_LABELS[value]) })),
        value: edges,
        disabled: !canStore,
        pick: (value) => commit({ ...draft, edges: value }),
      }),
      draft.edges === undefined
        ? React.createElement('span', { className: 'dsh-claude-scheme-text-button-space' })
        : React.createElement('button', { type: 'button', className: 'dsh-claude-palette-reset', onClick: () => commit(withoutSeed(draft, 'edges')) }, copy('paletteSeedReset')),
    ),
    React.createElement(
      'div',
      { className: 'dsh-claude-scheme-actions' },
      React.createElement('button', {
        type: 'button',
        className: 'dsh-claude-settings-button dsh-claude-scheme-button dsh-claude-scheme-primary',
        disabled: selected,
        onClick: () => choose({ paletteColors: id }),
      }, selected ? copy('paletteInUse') : copy('paletteUse')),
      React.createElement('button', { type: 'button', className: 'dsh-claude-settings-button dsh-claude-scheme-button', disabled: !canAddScheme(prefs), onClick: duplicate }, copy('paletteDuplicate')),
      preset
        ? React.createElement('button', { type: 'button', className: 'dsh-claude-settings-button dsh-claude-scheme-button', disabled: !hasRecord, onClick: restore }, copy('paletteRestore'))
        : React.createElement('button', {
          type: 'button',
          className: 'dsh-claude-settings-button dsh-claude-scheme-button dsh-claude-scheme-danger',
          onClick: () => { if (confirming) remove(); else setConfirming(true) },
          onBlur: () => setConfirming(false),
        }, confirming ? copy('paletteDeleteConfirm') : copy('paletteDelete')),
      canStore ? null : React.createElement('span', { className: 'dsh-claude-scheme-limit' }, copy('paletteLimit', { count: String(PALETTE_SCHEME_LIMIT) })),
    ),
  )
}
