import * as React from 'react'
import { CONTEXT_DISPLAY_PIE, CONTEXT_DISPLAY_RING_BAND, CONTEXT_DISPLAY_RING_RAMP } from '../../constants'
import { contextPieImage } from './context-meter-pie'
import { METER_RING_RADIUS, METER_RING_SIZE, contextBandAt, ringDash } from './context-meter-face'
import { CONTEXT_STOPS, rampPosition } from './stats-ramp'
import { PreviewCards } from '../../shared/preview-cards'
import { copy } from './copy'
import { openBillingEditor, unpricedModels } from './billing-editor'
import { parseBillingTable } from '@dsh-claude-style/contracts/billing-table'
import type { PreviewOption } from '../../shared/preview-cards'
import type { Prefs } from '../../constants'
import type { SettingsControlsOf, SettingsRowView } from '../../core/feature'
import type manifest from './context-stats.manifest'

/**
 * The context meter's face as the settings page shows it (D76): one card per
 * answer, each carrying readings drawn the way the composer draws them, so the
 * three compare side by side without a trip through the conversation.
 *
 * The cards reuse the settings page's preview-card shell (settings-cards.css)
 * and add their own samples. The pie's sample is painted by the meter's own
 * image builder (context-meter-pie.ts), never by a second drawing of the
 * sectors: the reading's colour comes off the sample's computed ink, exactly as
 * the live meter reads it, and the image is written in the effect. The two
 * rings use the meter's own ring geometry (context-meter-face.ts) and take
 * their colour from the stylesheets, so a theme flip repaints them with no
 * further work. The third face samples 40 %, 80 % and 95 %, one reading in each
 * of its three bands.
 */

/** The readings each face samples: the pie and dsh's ring walk the continuous band, the measured ring one reading per band. */
const SAMPLE_READINGS: Record<string, readonly number[]> = {
  [CONTEXT_DISPLAY_PIE]: [10, 35, 65, 90],
  [CONTEXT_DISPLAY_RING_RAMP]: [10, 35, 65, 90],
  [CONTEXT_DISPLAY_RING_BAND]: [40, 80, 95],
}

/** The three faces, in the order the cards stand. */
const FACES = [
  { value: CONTEXT_DISPLAY_PIE, label: 'contextDisplayPie' },
  { value: CONTEXT_DISPLAY_RING_RAMP, label: 'contextDisplayRingRamp' },
  { value: CONTEXT_DISPLAY_RING_BAND, label: 'contextDisplayRingBand' },
] as const

/** The row controls this feature draws itself (D76). */
export const controls: SettingsControlsOf<typeof manifest> = {
  'context-display': ContextDisplayPicker,
  'billing-table': BillingTableRow,
}

/**
 * The pie's sample, painted by the meter's own image builder: the sample's
 * computed colour is the reading's band ink, and the plate's colour is the one
 * the live pie leaves untaken (--dsh-claude-pie-rest). Painted in the effect so
 * a theme flip and a preference change re-read the colours the page resolved.
 */
function PieFace(props: { percent: number }) {
  const face = React.useRef<HTMLSpanElement | null>(null)
  React.useEffect(() => {
    const element = face.current
    if (element === null) return
    const style = getComputedStyle(element)
    const rest = style.getPropertyValue('--dsh-claude-pie-rest').trim()
    // No stylesheet, no plate: the ring preview beside it is the honest face.
    if (rest === '') return
    element.style.backgroundImage = contextPieImage(props.percent, style.color, rest)
  })
  return React.createElement('span', { ref: face, className: 'dsh-claude-context-sample-pie' })
}

/** One reading drawn on one face: the pie's plate, or the ring's track and arc. */
function ContextSample(props: { face: string, percent: number }) {
  const ramp = rampPosition(props.percent, CONTEXT_STOPS)
  const band = contextBandAt(props.percent)
  const ringBand = props.face === CONTEXT_DISPLAY_RING_BAND
  const style = ringBand ? undefined : ({ '--dsh-claude-ramp-position': ramp.mix } as React.CSSProperties)
  const attributes: Record<string, string | undefined> = ringBand
    ? { 'data-dsh-claude-context-band': band }
    : { 'data-dsh-claude-ramp': 'context', 'data-dsh-claude-ramp-span': ramp.span }
  return React.createElement(
    'span',
    { className: 'dsh-claude-context-sample', 'data-face': props.face, style, ...attributes },
    React.createElement(
      'span',
      { className: 'dsh-claude-context-sample-face' },
      props.face === CONTEXT_DISPLAY_PIE
        ? React.createElement(PieFace, { percent: props.percent })
        : React.createElement(
          'svg',
          { viewBox: `0 0 ${METER_RING_SIZE} ${METER_RING_SIZE}`, 'aria-hidden': 'true' },
          React.createElement('circle', { className: 'dsh-claude-context-sample-track', cx: METER_RING_SIZE / 2, cy: METER_RING_SIZE / 2, r: METER_RING_RADIUS }),
          React.createElement('circle', {
            className: 'dsh-claude-context-sample-arc',
            cx: METER_RING_SIZE / 2,
            cy: METER_RING_SIZE / 2,
            r: METER_RING_RADIUS,
            transform: `rotate(-90 ${METER_RING_SIZE / 2} ${METER_RING_SIZE / 2})`,
            strokeDasharray: ringDash(props.percent),
          }),
        ),
    ),
  )
}

/** The three faces as cards; the reader's stored answer alone is drawn as picked. */
function ContextDisplayPicker(props: SettingsRowView) {
  // A theme flip repaints the page's styles but not the pie's baked image: the
  // picker re-renders with the dark flip so each sample paints itself again.
  const [, setVersion] = React.useState(0)
  const version = React.useRef(0)
  React.useEffect(() => {
    const observer = new MutationObserver(() => {
      version.current += 1
      setVersion(version.current)
    })
    observer.observe(document.body, { attributes: true, attributeFilter: ['data-ds-dark-theme'] })
    return () => observer.disconnect()
  }, [])
  // The cards carry no visible text: the face's name is its accessible name,
  // and the row's description names the three in card order.
  const options: PreviewOption<Prefs['contextDisplay']>[] = FACES.map((face) => ({
    value: face.value,
    label: copy(face.label),
    content: React.createElement(
      'span',
      { className: 'dsh-claude-context-display-samples', 'aria-hidden': 'true' },
      SAMPLE_READINGS[face.value].map((percent) => React.createElement(ContextSample, { key: percent, face: face.value, percent })),
    ),
  }))
  return React.createElement(PreviewCards<Prefs['contextDisplay']>, {
    cardClass: 'dsh-claude-context-display-card',
    options,
    value: props.prefs.contextDisplay,
    write: (value: Prefs['contextDisplay']) => props.write({ contextDisplay: value }),
    disabled: props.disabled,
    label: copy('contextDisplayTitle'),
  })
}

/**
 * The custom price table's settings row: one button opening the editor
 * (billing-editor.ts). The row says how many rows stand and how many models the
 * table could not price, so the reader can tell whether the table needs a row
 * before opening it.
 */
function BillingTableRow(props: SettingsRowView) {
  const count = parseBillingTable(props.prefs.billingTable).length
  const missing = unpricedModels().length
  const summary = missing === 0
    ? copy('billingTableCount').replace('{count}', String(count))
    : copy('billingTableCountMissing').replace('{count}', String(count)).replace('{missing}', String(missing))
  const open = () => {
    if (props.disabled) return
    openBillingEditor(props.prefs.billingTable, props.prefs.billingCurrency, entries => props.write({ billingTable: entries }))
  }
  return React.createElement(
    'span',
    { className: 'dsh-claude-billing-row-control' },
    React.createElement('span', { className: 'dsh-claude-billing-row-summary' }, summary),
    React.createElement(
      'button',
      { type: 'button', className: 'dsh-claude-billing-row-button', onClick: open, disabled: props.disabled },
      copy('billingTableEdit'),
    ),
  )
}
