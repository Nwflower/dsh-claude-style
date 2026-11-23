import * as React from 'react'
import {
  BILLING_OFF,
  FOOTER_TOKEN_UNITS,
  STATS_FOOTER_ALIGNS,
  STATS_POSITION_FOOTER,
  STATS_POSITION_INLINE,
  STATS_POSITION_OFF,
} from '../../constants'
import { PreviewCards } from '../../shared/preview-cards'
import { SEGMENT_CLASS } from '../../shared/segment-control'
import { ClaudeStyleSegmentGroup } from '../../shared/segment-group'
import { ClaudeStyleSwitch } from '../../shared/settings-switch'
import {
  ContextMeterSample,
  SettingsSubField,
  resolveContextRampStops,
  useContextDarkTheme,
} from './context-ramp-settings'
import { copy } from './copy'
import type { ContextRampStop } from '@dsh-claude-style/contracts/context-ramp'
import type { CopyKey } from './copy'
import type { PreviewOption } from '../../shared/preview-cards'
import type { Prefs } from '../../constants'
import type { SettingsRowView } from '../../core/feature'

/**
 * Interactive settings controls for the composer statistics bar (D76, D112):
 * a header switch that folds the panel away while off, two live composer-layout
 * preview cards (`footer` vs `inline`) that reflect alignment, selected figures
 * and token units in real time, a horizontal-position segment control, and a
 * multi-select chip group over the six session-aggregate figures.
 */

type ActiveBarLayout = typeof STATS_POSITION_FOOTER | typeof STATS_POSITION_INLINE
type MetricPrefKey =
  | 'statsFooterCost'
  | 'statsFooterTotal'
  | 'statsFooterCache'
  | 'statsFooterSpeed'
  | 'statsFooterTtft'
  | 'statsFooterCounts'

interface MetricSpec {
  readonly key: MetricPrefKey
  readonly id: string
  readonly label: CopyKey
}

const METRICS: readonly MetricSpec[] = [
  { key: 'statsFooterCost', id: 'cost', label: 'statsFooterCostTitle' },
  { key: 'statsFooterTotal', id: 'total', label: 'statsFooterTotalTitle' },
  { key: 'statsFooterCache', id: 'cache', label: 'statsFooterCacheTitle' },
  { key: 'statsFooterSpeed', id: 'speed', label: 'statsFooterSpeedTitle' },
  { key: 'statsFooterTtft', id: 'ttft', label: 'statsFooterTtftTitle' },
  { key: 'statsFooterCounts', id: 'counts', label: 'statsFooterCountsTitle' },
]

const ALIGN_LABELS: Record<Prefs['statsFooterAlign'], CopyKey> = {
  left: 'statsFooterAlignLeft',
  center: 'statsFooterAlignCenter',
  right: 'statsFooterAlignRight',
}

/** Remembers the reader's last non-off layout within this session when toggling off and back on. */
let rememberedLayout: ActiveBarLayout = STATS_POSITION_FOOTER

/** Header switch across from the statistics bar's title and description. */
export function StatsBarToggle(props: SettingsRowView) {
  const current = props.prefs.statsPosition
  if (current === STATS_POSITION_FOOTER || current === STATS_POSITION_INLINE) {
    rememberedLayout = current
  }
  const on = current !== STATS_POSITION_OFF
  return React.createElement(ClaudeStyleSwitch, {
    on,
    disabled: props.disabled,
    label: copy('statsPositionTitle'),
    onPick(next: boolean) {
      props.write({ statsPosition: next ? rememberedLayout : STATS_POSITION_OFF })
    },
  })
}

/** Sample figures rendered inside both preview cards, following the live preference state. */
function sampleFigures(prefs: Prefs, layout: ActiveBarLayout): React.ReactElement {
  const units = prefs.statsFooterTokenFormat === FOOTER_TOKEN_UNITS
  const pieces: React.ReactNode[] = []
  if (prefs.statsFooterCounts) {
    pieces.push(React.createElement('span', { key: 'counts', className: 'dsh-claude-stats-bar-sample-piece' }, copy('statsSampleTurnsSteps')))
  }
  if (prefs.statsFooterSpeed) {
    pieces.push(React.createElement('span', { key: 'speed', className: 'dsh-claude-stats-bar-sample-piece' }, '68 tok/s'))
  }
  if (prefs.statsFooterTtft) {
    pieces.push(React.createElement('span', { key: 'ttft', className: 'dsh-claude-stats-bar-sample-piece' }, 'TTFT 0.8s'))
  }
  if (prefs.statsFooterCost && prefs.billingCurrency !== BILLING_OFF) {
    const cost = prefs.billingCurrency === 'USD' ? '$0.026' : '¥0.18'
    pieces.push(React.createElement('span', { key: 'cost', className: 'dsh-claude-stats-bar-sample-piece' }, cost))
  }
  if (prefs.statsFooterTotal) {
    const crowdedToolbar = layout === STATS_POSITION_FOOTER && pieces.length >= 2
    const tokenSample = crowdedToolbar
      ? (units ? '15.5K tok' : '15,500 tok')
      : (units ? '↑12.4K ↓3.1K' : '↑12,400 ↓3,100')
    pieces.push(React.createElement('span', { key: 'total', className: 'dsh-claude-stats-bar-sample-piece' }, tokenSample))
  }
  if (prefs.statsFooterCache) {
    pieces.push(React.createElement('span', { key: 'cache', className: 'dsh-claude-stats-bar-sample-cache' }, '94%'))
  }
  return React.createElement('span', { className: 'dsh-claude-stats-bar-sample-figures' }, pieces)
}

/** One miniature composer card showing where the statistics bar sits under `layout`. */
function sampleComposer(
  prefs: Prefs,
  layout: ActiveBarLayout,
  stops: readonly ContextRampStop[],
  dark: boolean,
): React.ReactNode {
  const figures = sampleFigures(prefs, layout)
  return [
    React.createElement(
      'span',
      { key: 'stage', className: 'dsh-claude-stats-bar-stage', 'data-stats-layout': layout, 'aria-hidden': 'true' },
      React.createElement(
        'span',
        { className: 'dsh-claude-stats-bar-sample-input' },
        React.createElement('span', { className: 'dsh-claude-stats-bar-sample-prompt' }, copy('statsSamplePrompt')),
        React.createElement('span', { className: 'dsh-claude-stats-bar-sample-send' }, '↵'),
      ),
      React.createElement(
        'span',
        { className: 'dsh-claude-stats-bar-sample-toolbar' },
        React.createElement(
          'span',
          { className: 'dsh-claude-stats-bar-sample-tools' },
          React.createElement('span', { className: 'dsh-claude-stats-bar-sample-pill' }, copy('statsSamplePerm')),
          React.createElement('span', { className: 'dsh-claude-stats-bar-sample-pill' }, '+'),
        ),
        layout === STATS_POSITION_FOOTER
          ? React.createElement(
            'span',
            { className: 'dsh-claude-stats-bar-sample-seat', 'data-align': prefs.statsFooterAlign },
            figures,
          )
          : null,
        React.createElement(
          'span',
          { className: 'dsh-claude-stats-bar-sample-trailing' },
          React.createElement('span', { className: 'dsh-claude-stats-bar-sample-model' }, 'V4'),
          React.createElement(ContextMeterSample, {
            face: prefs.contextDisplay,
            percent: 62,
            stops,
            showNumber: prefs.contextNumbers,
            dark,
            compact: true,
          }),
        ),
      ),
      layout === STATS_POSITION_INLINE
        ? React.createElement(
          'span',
          { className: 'dsh-claude-stats-bar-sample-dock', 'data-align': prefs.statsFooterAlign },
          figures,
        )
        : null,
    ),
    React.createElement(
      'span',
      { key: 'label', className: 'dsh-claude-settings-card-label', 'aria-hidden': 'true' },
      copy(layout === STATS_POSITION_FOOTER ? 'statsPositionFooter' : 'statsPositionInline'),
    ),
  ]
}

/** Expandable configurator below the statistics-bar switch while enabled. */
export function StatsBarPicker(props: SettingsRowView) {
  const { prefs, write, disabled } = props
  const dark = useContextDarkTheme()
  if (prefs.statsPosition === STATS_POSITION_OFF) return null

  const activeLayout: ActiveBarLayout = prefs.statsPosition === STATS_POSITION_INLINE ? STATS_POSITION_INLINE : STATS_POSITION_FOOTER
  rememberedLayout = activeLayout
  const stops = resolveContextRampStops(prefs.contextRampMode, prefs.contextRamp, dark)

  const layoutOptions: PreviewOption<ActiveBarLayout>[] = [
    {
      value: STATS_POSITION_FOOTER,
      label: copy('statsPositionFooter'),
      attributes: { 'data-stats-layout': STATS_POSITION_FOOTER },
      content: sampleComposer(prefs, STATS_POSITION_FOOTER, stops, dark),
    },
    {
      value: STATS_POSITION_INLINE,
      label: copy('statsPositionInline'),
      attributes: { 'data-stats-layout': STATS_POSITION_INLINE },
      content: sampleComposer(prefs, STATS_POSITION_INLINE, stops, dark),
    },
  ]

  const alignButtons = STATS_FOOTER_ALIGNS.map(align => React.createElement(
    'button',
    {
      key: align,
      type: 'button',
      className: SEGMENT_CLASS,
      disabled,
      'data-active': prefs.statsFooterAlign === align ? '' : undefined,
      'aria-pressed': prefs.statsFooterAlign === align ? 'true' : 'false',
      onClick() {
        if (prefs.statsFooterAlign !== align) write({ statsFooterAlign: align })
      },
    },
    copy(ALIGN_LABELS[align]),
  ))

  let enabledCount = 0
  for (let i = 0; i < METRICS.length; i++) {
    if (prefs[METRICS[i].key]) enabledCount += 1
  }

  const metricChips = METRICS.map(metric => {
    const on = prefs[metric.key]
    const locked = on && enabledCount <= 1
    return React.createElement(
      'button',
      {
        key: metric.key,
        type: 'button',
        className: 'dsh-claude-stats-metric-chip',
        disabled: disabled || locked,
        'data-metric': metric.id,
        'data-active': on ? '' : undefined,
        'aria-pressed': on ? 'true' : 'false',
        onClick() {
          if (!locked) write({ [metric.key]: !on } as Partial<Prefs>)
        },
      },
      copy(metric.label),
    )
  })

  const costUnbilled = prefs.statsFooterCost && prefs.billingCurrency === BILLING_OFF

  return React.createElement(
    'div',
    { className: 'dsh-claude-stats-bar-config' },
    React.createElement(PreviewCards<ActiveBarLayout>, {
      cardClass: 'dsh-claude-stats-bar-card',
      options: layoutOptions,
      value: activeLayout,
      write: (value: ActiveBarLayout) => write({ statsPosition: value }),
      disabled,
      label: copy('statsPositionTitle'),
    }),
    React.createElement(
      SettingsSubField,
      {
        title: copy('statsFooterAlignTitle'),
        desc: copy('statsFooterAlignDesc'),
      },
      React.createElement(ClaudeStyleSegmentGroup, { label: copy('statsFooterAlignTitle') }, alignButtons),
    ),
    React.createElement(
      SettingsSubField,
      {
        title: copy('statsMetricsTitle'),
        desc: copy('statsMetricsDesc'),
        className: 'dsh-claude-stats-bar-metrics-field',
        footer: costUnbilled
          ? React.createElement('span', { className: 'dsh-claude-stats-bar-hint' }, copy('statsCostBillingOffNote'))
          : null,
      },
      React.createElement(
        'div',
        { className: 'dsh-claude-stats-bar-chips', role: 'group', 'aria-label': copy('statsMetricsTitle') },
        metricChips,
      ),
    ),
  )
}
