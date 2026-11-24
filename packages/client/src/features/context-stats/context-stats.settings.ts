import * as React from 'react'
import { parseBillingTable } from '@dsh-claude-style/contracts/billing-table'
import {
  CONTEXT_DISPLAY_PIE,
  CONTEXT_DISPLAY_RING,
  CONTEXT_RAMP_MODES,
  CONTEXT_RAMP_MODE_CLASSIC,
  CONTEXT_RAMP_MODE_CUSTOM,
  CONTEXT_RAMP_MODE_DEFAULT,
} from '../../constants'
import { useDarkTheme } from '../../shared/page-state'
import { PreviewCards, SettingsSubField } from '../../shared/preview-cards'
import { SEGMENT_CLASS } from '../../shared/segment-control'
import { ClaudeStyleSegmentGroup } from '../../shared/segment-group'
import { ClaudeStyleSwitch } from '../../shared/settings-switch'
import { openBillingEditor, unpricedModels } from './billing-editor'
import {
  ContextMeterSample,
  ContextRampEditor,
  resolveContextRampStops,
  serializeContextRamp,
  useAnimatedMeterPercent,
} from './context-ramp-settings'
import { copy } from './copy'
import { StatsBarPicker, StatsBarToggle } from './stats-bar-settings'
import type { ContextRampStop } from '@dsh-claude-style/contracts/context-ramp'
import type { CopyKey } from './copy'
import type { PreviewOption } from '../../shared/preview-cards'
import type { Prefs } from '../../constants'
import type { SettingsControlsOf, SettingsRowView } from '../../core/feature'
import type manifest from './context-stats.manifest'

/**
 * Context meter settings block (D76): two synchronized preview cards (`pie` and
 * `ring`) sweeping 1% -> 100% -> 1%, a segmented colour-ramp selector (`default`,
 * `classic`, `custom`) that unfolds the OKLCH stop editor under `custom`, and
 * the percentage switch below it.
 */

const FACES = [
  { value: CONTEXT_DISPLAY_PIE, label: 'contextDisplayPie' },
  { value: CONTEXT_DISPLAY_RING, label: 'contextDisplayRing' },
] as const

const RAMP_MODE_LABELS: Record<Prefs['contextRampMode'], CopyKey> = {
  [CONTEXT_RAMP_MODE_DEFAULT]: 'contextRampPresetDefault',
  [CONTEXT_RAMP_MODE_CLASSIC]: 'contextRampPresetClassic',
  [CONTEXT_RAMP_MODE_CUSTOM]: 'contextRampPresetCustom',
}

export const controls: SettingsControlsOf<typeof manifest> = {
  'context-display': ContextDisplayPicker,
  'stats-bar-toggle': StatsBarToggle,
  'stats-bar-picker': StatsBarPicker,
  'billing-table': BillingTableRow,
}

/** Preview cards isolated from the ramp editor so animated percentage ticks only redraw the two samples. */
function ContextDisplayPreviewCards(props: {
  value: Prefs['contextDisplay']
  write(value: Prefs['contextDisplay']): void
  disabled: boolean | undefined
  motion: Prefs['motion']
  stops: readonly ContextRampStop[]
  showNumber: boolean
  dark: boolean
}) {
  const { value, write, disabled, motion, stops, showNumber, dark } = props
  const wrapRef = React.useRef<HTMLDivElement | null>(null)
  const previewPercent = useAnimatedMeterPercent(disabled, motion, wrapRef)

  const options: PreviewOption<Prefs['contextDisplay']>[] = FACES.map(face => ({
    value: face.value,
    label: copy(face.label),
    attributes: { 'data-face': face.value },
    content: [
      React.createElement(
        'span',
        { key: 'stage', className: 'dsh-claude-context-display-stage', 'aria-hidden': 'true' },
        React.createElement(ContextMeterSample, {
          face: face.value,
          percent: previewPercent,
          stops,
          showNumber,
          dark,
        }),
      ),
      React.createElement(
        'span',
        { key: 'label', className: 'dsh-claude-settings-card-label', 'aria-hidden': 'true' },
        copy(face.label),
      ),
    ],
  }))

  return React.createElement(
    'div',
    { ref: wrapRef },
    React.createElement(PreviewCards<Prefs['contextDisplay']>, {
      cardClass: 'dsh-claude-context-display-card',
      options,
      value,
      write,
      disabled,
      label: copy('contextDisplayTitle'),
    }),
  )
}

function ContextDisplayPicker(props: SettingsRowView) {
  const { prefs, write, disabled } = props
  const dark = useDarkTheme()
  const [draftStops, setDraftStops] = React.useState<ContextRampStop[] | null>(null)
  const resolvedStops = React.useMemo(
    () => resolveContextRampStops(prefs.contextRampMode, prefs.contextRamp, dark),
    [prefs.contextRampMode, prefs.contextRamp, dark],
  )
  const activeStops = draftStops ?? resolvedStops
  const pickDisplay = React.useCallback(
    (value: Prefs['contextDisplay']) => write({ contextDisplay: value }),
    [write],
  )

  const rampButtons = CONTEXT_RAMP_MODES.map(mode => React.createElement(
    'button',
    {
      key: mode,
      type: 'button',
      className: SEGMENT_CLASS,
      disabled,
      'data-preset': mode,
      'data-active': prefs.contextRampMode === mode ? '' : undefined,
      'aria-pressed': prefs.contextRampMode === mode ? 'true' : 'false',
      onClick() {
        if (prefs.contextRampMode === mode) return
        setDraftStops(null)
        if (mode === CONTEXT_RAMP_MODE_CUSTOM && prefs.contextRamp === '') {
          write({
            contextRampMode: mode,
            contextRamp: serializeContextRamp(activeStops),
          })
          return
        }
        write({ contextRampMode: mode })
      },
    },
    copy(RAMP_MODE_LABELS[mode]),
  ))

  return React.createElement(
    'div',
    { className: 'dsh-claude-context-display-config' },
    React.createElement(ContextDisplayPreviewCards, {
      value: prefs.contextDisplay,
      write: pickDisplay,
      disabled,
      motion: prefs.motion,
      stops: activeStops,
      showNumber: prefs.contextNumbers,
      dark,
    }),
    React.createElement(
      SettingsSubField,
      {
        title: copy('contextRampTitle'),
        desc: copy('contextRampDesc'),
      },
      React.createElement(ClaudeStyleSegmentGroup, { label: copy('contextRampTitle') }, rampButtons),
    ),
    prefs.contextRampMode === CONTEXT_RAMP_MODE_CUSTOM
      ? React.createElement(ContextRampEditor, {
        activeStops,
        disabled: disabled === true,
        onDraftStops: setDraftStops,
        onCommitRamp: nextRamp => write({ contextRamp: nextRamp }),
      })
      : null,
    React.createElement(
      SettingsSubField,
      { title: copy('contextNumbersTitle') },
      React.createElement(ClaudeStyleSwitch, {
        on: prefs.contextNumbers,
        disabled,
        label: copy('contextNumbersTitle'),
        onPick(next: boolean) {
          write({ contextNumbers: next })
        },
      }),
    ),
  )
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
