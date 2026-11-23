import * as React from 'react'
import { DEPLOY_ROOT, assetUrlUnder } from '@dsh-claude-style/contracts/routes'
import { CRAB_IDLE_SHEET_URL, DEEPY_SHEET_URLS, WHALE_GIRL_SHEET_URLS } from 'virtual:dsh-claude-style/generated'
import { MASCOT_BRAND, MASCOT_CRAB, MASCOT_DEEPY, MASCOT_OFF, MASCOT_WHALEGIRL } from '../../constants'
import { motionReduced, resolveMascot } from '../../core/prefs'
import { PREVIEW_CARD_CLASS, PREVIEW_PICKER_CLASS, activateOnCardKey } from '../../shared/preview-cards'
import { ClaudeStyleSwitch } from '../../shared/settings-switch'
import { copy } from './copy'
import { CRAB_FRAME_MS, CRAB_GUTTER, CRAB_SHEETS, DEEPY_FRAME_MS, DEEPY_GUTTER, DEEPY_SHEETS, WHALE_GIRL_FRAME_MS, WHALE_GIRL_SHEETS } from './sheets'
import type { CopyKey } from './copy'
import type { SettingsControlsOf, SettingsRowView } from '../../core/feature'
import type manifest from './mascot.manifest'

/**
 * The mascot settings row controls (D76): an on/off switch in the row header
 * and three character preview cards below it while enabled. Following the
 * theme marks the active brand's character as "following theme"; picking any
 * character pins it and offers a button to follow the theme again, matching
 * the colour cards (features/settings/palette-cards.ts).
 */

export const controls: SettingsControlsOf<typeof manifest> = {
  'mascot-toggle': MascotToggle,
  'mascot-picker': MascotPicker,
}

type CharacterId = typeof MASCOT_CRAB | typeof MASCOT_DEEPY | typeof MASCOT_WHALEGIRL

interface CharacterSpec {
  readonly id: CharacterId
  readonly labelKey: CopyKey
  readonly sheet: { readonly frames: number, readonly box: readonly number[], readonly still: number, readonly columns?: number, readonly durs?: readonly number[] }
  readonly frameMs: number
  readonly gutter: number
  /** CSS pixels per logical cell in the card preview. */
  readonly cellPx: number
}

const CHARACTERS: readonly CharacterSpec[] = [
  { id: MASCOT_CRAB, labelKey: 'mascotCrab', sheet: CRAB_SHEETS.idle, frameMs: CRAB_FRAME_MS, gutter: CRAB_GUTTER, cellPx: 2 },
  { id: MASCOT_DEEPY, labelKey: 'mascotDeepy', sheet: DEEPY_SHEETS.idle, frameMs: DEEPY_FRAME_MS, gutter: DEEPY_GUTTER, cellPx: 2 },
  { id: MASCOT_WHALEGIRL, labelKey: 'mascotWhaleGirl', sheet: WHALE_GIRL_SHEETS.idle, frameMs: WHALE_GIRL_FRAME_MS, gutter: 0, cellPx: 1 },
]

function sheetBackground(id: CharacterId): Record<string, string> {
  if (id === MASCOT_CRAB) {
    return {
      '--dsh-claude-mascot-preview-sheet': `url("${CRAB_IDLE_SHEET_URL.body}")`,
      '--dsh-claude-mascot-preview-ink': `url("${CRAB_IDLE_SHEET_URL.ink}")`,
    }
  }
  const address = id === MASCOT_DEEPY ? DEEPY_SHEET_URLS.idle : WHALE_GIRL_SHEET_URLS.idle
  return { '--dsh-claude-mascot-preview-sheet': `url("${assetUrlUnder(address, DEPLOY_ROOT)}")` }
}

function frameTranslate(spec: CharacterSpec, frame: number) {
  const columns = spec.sheet.columns ?? 8
  const cellW = spec.sheet.box[2] + spec.gutter * 2
  const cellH = spec.sheet.box[3] + spec.gutter * 2
  const x = -((frame % columns) * cellW + spec.gutter) * spec.cellPx
  const y = -(Math.floor(frame / columns) * cellH + spec.gutter) * spec.cellPx
  return `translate(${x}px, ${y}px)`
}

/** One character's idle sprite inside its preview stage, playing on WAAPI or pinned under reduced motion. */
function MascotSpritePreview(props: { spec: CharacterSpec, reduced: boolean }) {
  const { spec, reduced } = props
  const stripRef = React.useRef<HTMLSpanElement | null>(null)
  const columns = spec.sheet.columns ?? 8
  const cellW = spec.sheet.box[2] + spec.gutter * 2
  const cellH = spec.sheet.box[3] + spec.gutter * 2
  const rows = Math.ceil(spec.sheet.frames / columns)

  React.useEffect(() => {
    const strip = stripRef.current
    if (strip === null) return
    if (reduced) {
      strip.style.transform = frameTranslate(spec, spec.sheet.still)
      return
    }
    strip.style.transform = ''
    const { frames, durs } = spec.sheet
    const duration = durs === undefined ? frames * spec.frameMs : durs.reduce((sum, ms) => sum + ms, 0)
    const keyframes: Keyframe[] = []
    let elapsed = 0
    for (let frame = 0; frame < frames; frame++) {
      keyframes.push({ offset: durs === undefined ? frame / frames : elapsed / duration, transform: frameTranslate(spec, frame), easing: 'steps(1)' })
      if (durs !== undefined) elapsed += durs[frame]
    }
    keyframes.push({ offset: 1, transform: frameTranslate(spec, 0) })
    const animation = strip.animate(keyframes, { duration, iterations: Infinity, fill: 'forwards' })
    return () => { animation.cancel() }
  }, [spec, reduced])

  const windowStyle = {
    width: `${spec.sheet.box[2] * spec.cellPx}px`,
    height: `${spec.sheet.box[3] * spec.cellPx}px`,
  } as React.CSSProperties

  const stripStyle = {
    ...sheetBackground(spec.id),
    width: `${cellW * columns * spec.cellPx}px`,
    height: `${cellH * rows * spec.cellPx}px`,
    backgroundSize: `${cellW * columns * spec.cellPx}px auto`,
    transform: frameTranslate(spec, spec.sheet.still),
  } as React.CSSProperties

  return React.createElement(
    'span',
    { className: 'dsh-claude-mascot-card-stage', 'data-mascot': spec.id, 'aria-hidden': 'true' },
    React.createElement(
      'span',
      { className: 'dsh-claude-mascot-card-window', style: windowStyle },
      React.createElement('span', { ref: stripRef, className: 'dsh-claude-mascot-card-strip', 'data-mascot': spec.id, style: stripStyle }),
    ),
  )
}

function MascotToggle(props: SettingsRowView) {
  const on = props.prefs.mascot !== MASCOT_OFF
  return React.createElement(ClaudeStyleSwitch, {
    on,
    disabled: props.disabled,
    label: copy('mascotTitle'),
    onPick(next: boolean) {
      props.write({ mascot: next ? MASCOT_BRAND : MASCOT_OFF })
    },
  })
}

function MascotPicker(props: SettingsRowView) {
  const { prefs, write, disabled } = props
  const [reduced, setReduced] = React.useState(motionReduced)

  React.useEffect(() => {
    const sync = () => setReduced(motionReduced())
    const observer = new MutationObserver(sync)
    observer.observe(document.body, { attributes: true, attributeFilter: ['data-dsh-claude-motion'] })
    return () => observer.disconnect()
  }, [])

  if (prefs.mascot === MASCOT_OFF) return null

  const following = prefs.mascot === MASCOT_BRAND
  const active = resolveMascot(prefs)
  const pick = (id: CharacterId) => { if (!disabled) write({ mascot: id }) }
  const follow = () => { if (!disabled) write({ mascot: MASCOT_BRAND }) }

  return React.createElement(
    'div',
    { className: `${PREVIEW_PICKER_CLASS} dsh-claude-mascot-cards`, role: 'group', 'aria-label': copy('mascotTitle') },
    CHARACTERS.map(spec => {
      const selected = spec.id === active
      const label = copy(spec.labelKey)
      return React.createElement(
        'div',
        {
          key: spec.id,
          className: `${PREVIEW_CARD_CLASS} dsh-claude-mascot-card`,
          role: 'button',
          tabIndex: disabled ? -1 : 0,
          'data-mascot': spec.id,
          'data-active': selected ? '' : undefined,
          'aria-pressed': selected ? 'true' : 'false',
          'aria-disabled': disabled ? 'true' : undefined,
          'aria-label': label,
          onClick: () => { if (!selected) pick(spec.id) },
          onKeyDown: (event: React.KeyboardEvent<HTMLDivElement>) => activateOnCardKey(event, () => { if (!selected) pick(spec.id) }),
        },
        React.createElement(MascotSpritePreview, { spec, reduced }),
        React.createElement('span', { className: 'dsh-claude-settings-card-label' }, label),
        React.createElement(
          'span',
          { className: 'dsh-claude-preview-card-actions' },
          selected && following
            ? React.createElement('span', { className: 'dsh-claude-preview-card-tag', 'data-state': 'following' }, copy('mascotFollowingTheme'))
            : null,
          selected && !following
            ? React.createElement('button', {
              type: 'button',
              className: 'dsh-claude-preview-card-action',
              'data-action': 'follow-theme',
              disabled,
              onClick(event: React.MouseEvent<HTMLButtonElement>) {
                event.stopPropagation()
                follow()
              },
            }, copy('mascotFollowTheme'))
            : null,
        ),
      )
    }),
  )
}
