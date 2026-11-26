import * as React from 'react'
import { PROCESS_ROWS_COLUMN, PROCESS_ROWS_FLAT } from '../../constants'
import { PreviewCards } from '../../shared/preview-cards'
import { copy } from './copy'
import type { CopyKey } from './copy'
import type { PreviewOption } from '../../shared/preview-cards'
import type { Prefs } from '../../constants'
import type { SettingsControlsOf, SettingsRowView } from '../../core/feature'
import type manifest from './process-column.manifest'

/**
 * The one row this feature draws itself (D76): the two layouts as preview
 * cards. Each card holds the same miniature conversation stage — an expanded
 * process summary header and three rows — and the column card wears the very
 * rules the open groups wear (process-column.css), so a card is the layout and
 * not a picture of it.
 */
export const controls: SettingsControlsOf<typeof manifest> = {
  'process-rows-preview': ProcessRowsPicker,
}

/** One sample row: its kind, the kind's word and what it says. */
interface SampleRow {
  kind: 'thought' | 'tool'
  title: CopyKey
  text: CopyKey
}

const SAMPLE_ROWS: readonly SampleRow[] = [
  { kind: 'thought', title: 'processRowsSampleThought', text: 'processRowsSampleThoughtFirst' },
  { kind: 'tool', title: 'processRowsSampleTool', text: 'processRowsSampleToolTarget' },
  { kind: 'thought', title: 'processRowsSampleThought', text: 'processRowsSampleThoughtSecond' },
]

function sample(layout: Prefs['processRows'], label: string) {
  const row = (item: SampleRow, index: number) => React.createElement(
    'span',
    { key: index, className: 'dsh-claude-process-sample-row', 'data-kind': item.kind },
    React.createElement('span', { className: 'dsh-claude-process-sample-icon' }),
    React.createElement('span', { className: 'dsh-claude-process-sample-title' }, copy(item.title)),
    React.createElement('span', { className: 'dsh-claude-process-sample-sep' }),
    React.createElement('span', { className: 'dsh-claude-process-sample-text' }, copy(item.text)),
  )
  return [
    React.createElement(
      'span',
      { key: 'stage', className: 'dsh-claude-process-stage', 'aria-hidden': 'true' },
      React.createElement(
        'span',
        { className: 'dsh-claude-process-sample', 'data-layout': layout },
        React.createElement(
          'span',
          { className: 'dsh-claude-process-sample-head' },
          React.createElement('span', { className: 'dsh-claude-process-sample-head-text' }, copy('processRowsSampleHead')),
        ),
        React.createElement('span', { className: 'dsh-claude-process-sample-body' }, SAMPLE_ROWS.map(row)),
      ),
    ),
    React.createElement('span', { key: 'label', className: 'dsh-claude-settings-card-label', 'aria-hidden': 'true' }, label),
  ]
}

function ProcessRowsPicker(props: SettingsRowView) {
  const flatLabel = copy('processRowsFlat')
  const columnLabel = copy('processRowsColumn')
  const options: PreviewOption<Prefs['processRows']>[] = [
    { value: PROCESS_ROWS_FLAT, label: flatLabel, content: sample(PROCESS_ROWS_FLAT, flatLabel) },
    { value: PROCESS_ROWS_COLUMN, label: columnLabel, content: sample(PROCESS_ROWS_COLUMN, columnLabel) },
  ]
  return React.createElement(PreviewCards<Prefs['processRows']>, {
    cardClass: 'dsh-claude-process-card',
    label: copy('processRowsTitle'),
    options,
    value: props.prefs.processRows,
    write: (value: Prefs['processRows']) => props.write({ processRows: value }),
    disabled: props.disabled,
  })
}
