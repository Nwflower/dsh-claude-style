import * as React from 'react'
import { HOME_LAYOUTS, HOME_LAYOUT_CLASSIC, HOME_LAYOUT_OFF, HOME_LAYOUT_STUDIO } from '../../constants'
import { PreviewCards } from '../../shared/preview-cards'
import { copy } from './copy'
import type { CopyKey } from './copy'
import type { PreviewOption } from '../../shared/preview-cards'
import type { Prefs } from '../../constants'
import type { SettingsControlsOf, SettingsRowView } from '../../core/feature'
import type manifest from './home-layout.manifest'

/**
 * The one row this feature draws itself (D76): the home layout as three cards.
 * Each is a small page with the greeting, dashboard, context row and composer
 * that the real layout has, drawn with this feature's own panel and heat rules.
 */
export const controls: SettingsControlsOf<typeof manifest> = {
  'layout-preview': HomeLayoutPicker,
}

/** Each layout's name, by the value it stores. */
const NAMES: Record<Prefs['homeLayout'], CopyKey> = {
  [HOME_LAYOUT_OFF]: 'homeOff',
  [HOME_LAYOUT_CLASSIC]: 'homeClassic',
  [HOME_LAYOUT_STUDIO]: 'homeStudio',
}

function words(className: string, text: string) {
  return React.createElement('span', { className }, text)
}

/** The dashboard's six real stat cells and seven-day-row heat grid. */
function samplePanel() {
  const stats: { label: CopyKey, value: string, id?: string }[] = [
    { label: 'homeSessions', value: '401' },
    { label: 'homeCalls', value: '13,262' },
    { label: 'homeTokens', value: '123.5M' },
    { label: 'homeActiveDays', value: '137' },
    { label: 'homePeakHour', value: copy('homeHourAm', { hour: 5 }) },
    { label: 'homeTopModel', value: 'deepseek-v4-flash', id: 'model' },
  ]
  return React.createElement(
    'span',
    { className: 'dsh-claude-home-panel dsh-claude-home-sample-panel' },
    React.createElement(
      'span',
      { className: 'dsh-claude-home-panel-head' },
      React.createElement(
        'span',
        { className: 'dsh-claude-home-tabs' },
        React.createElement('span', { className: 'dsh-claude-home-tab', 'data-active': '' }, copy('homeTabOverview')),
        words('dsh-claude-home-tab', copy('homeTabModels')),
      ),
      React.createElement(
        'span',
        { className: 'dsh-claude-home-ranges' },
        React.createElement('span', { className: 'dsh-claude-home-range', 'data-active': '' }, copy('homeRangeAll')),
        words('dsh-claude-home-range', copy('homeRange30d')),
        words('dsh-claude-home-range', copy('homeRange7d')),
      ),
    ),
    React.createElement(
      'span',
      { className: 'dsh-claude-home-stats' },
      stats.map(stat => React.createElement(
        'span',
        { key: stat.label, className: 'dsh-claude-home-stat', 'data-stat': stat.id },
        words('dsh-claude-home-stat-label', copy(stat.label)),
        words('dsh-claude-home-stat-value', stat.value),
      )),
    ),
    React.createElement(
      'span',
      { className: 'dsh-claude-home-heat' },
      Array.from({ length: 18 * 7 }, (_, index) => {
        const level = (index * 7 + Math.floor(index / 9) * 3) % 5
        return React.createElement('span', { key: index, className: 'dsh-claude-home-heat-cell', 'data-level': level })
      }),
    ),
  )
}

/** The workspace and permission chips above the studio composer. */
function sampleContext() {
  return React.createElement(
    'span',
    { className: 'dsh-claude-home-sample-context' },
    words('dsh-claude-home-sample-chip', copy('homeSampleWorkspace')),
    words('dsh-claude-home-sample-chip', copy('homeSamplePermission')),
  )
}

/** The prompt, its tool row and, in the classic layout, its footer tray. */
function sampleComposer(layout: Prefs['homeLayout']) {
  return React.createElement(
    'span',
    { className: 'dsh-claude-home-sample-composer' },
    words('dsh-claude-home-sample-prompt', copy('homeSamplePrompt')),
    React.createElement(
      'span',
      { className: 'dsh-claude-home-sample-tools' },
      React.createElement(
        'span',
        { className: 'dsh-claude-home-sample-tool-list' },
        words('dsh-claude-home-sample-tool', 'Read'),
        words('dsh-claude-home-sample-tool dsh-claude-home-sample-tool-active', 'Edit'),
        words('dsh-claude-home-sample-tool', 'Yolo'),
        words('dsh-claude-home-sample-tool', '+'),
      ),
      words('dsh-claude-home-sample-model', 'DeepSeek V4 Flash · High'),
    ),
    layout === HOME_LAYOUT_CLASSIC ? React.createElement(
      'span',
      { className: 'dsh-claude-home-sample-tray' },
      words('dsh-claude-home-sample-chip', copy('homeSampleWorkspace')),
      words('dsh-claude-home-sample-chip', copy('homeSamplePermission')),
    ) : null,
  )
}

/** One layout's page in miniature, with the same content column as the real page. */
function sample(layout: Prefs['homeLayout']) {
  return [
    React.createElement(
      'span',
      { key: 'page', className: 'dsh-claude-home-sample', 'data-layout': layout, 'aria-hidden': 'true' },
      React.createElement(
        'span',
        { className: 'dsh-claude-home-sample-column' },
        React.createElement(
          'span',
          { className: 'dsh-claude-home-sample-headline' },
          layout === HOME_LAYOUT_OFF ? null : React.createElement('span', { className: 'dsh-claude-home-sample-mark' }),
          words('dsh-claude-home-sample-title', copy(layout === HOME_LAYOUT_STUDIO ? 'homeSampleStudioGreeting' : 'homeSampleClassicGreeting')),
        ),
        layout === HOME_LAYOUT_STUDIO ? samplePanel() : null,
        layout === HOME_LAYOUT_STUDIO ? sampleContext() : null,
        sampleComposer(layout),
      ),
    ),
    React.createElement('span', { key: 'name', className: 'dsh-claude-settings-card-label', 'aria-hidden': 'true' }, copy(NAMES[layout])),
  ]
}

function HomeLayoutPicker(props: SettingsRowView) {
  const options: PreviewOption<Prefs['homeLayout']>[] = HOME_LAYOUTS.map(layout => ({
    value: layout,
    label: copy(NAMES[layout]),
    content: sample(layout),
    attributes: { 'data-layout': layout },
  }))
  return React.createElement(PreviewCards<Prefs['homeLayout']>, {
    cardClass: 'dsh-claude-home-card',
    options,
    value: props.prefs.homeLayout,
    write: (value: Prefs['homeLayout']) => props.write({ homeLayout: value }),
    disabled: props.disabled,
    label: copy('homeTitle'),
  })
}
