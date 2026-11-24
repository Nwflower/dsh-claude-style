import * as React from 'react'
import { billingRowEntry, parseBillingTable, splitBillingRow } from '@dsh-claude-style/contracts/billing-table'
import type { BillingRow } from '@dsh-claude-style/contracts/billing-table'
import { PRICE_ROWS_MAX } from '../../constants'
import { createModalHost, ModalFrame } from '../../shared/modal-host'
import { Glyph } from '../../shared/settings-glyphs'
import { copy } from './copy'

/**
 * Custom price table modal editor, mounted on `<body>` through the shared modal
 * host so it shares backdrop, focus layer, entrance/exit motion and button/field
 * plates with the colour and brand managers. Rows serialize as
 * `model|input|cacheRead|output` (contracts/billing-table.ts).
 */

/** Models the price table could not price, in first-seen order. */
const unpriced = new Set<string>()

export function noteUnpricedModel(modelId: string) {
  const id = modelId.trim()
  if (id !== '') unpriced.add(id)
}

export function unpricedModels(): string[] {
  return [...unpriced]
}

interface EditRow {
  id: number
  model: string
  input: string
  cacheRead: string
  output: string
}

type RateKey = 'cacheRead' | 'input' | 'output'

const RATE_COLUMNS: readonly { key: RateKey, labelKey: 'billingTableCacheRead' | 'billingTableInput' | 'billingTableOutput' }[] = [
  { key: 'cacheRead', labelKey: 'billingTableCacheRead' },
  { key: 'input', labelKey: 'billingTableInput' },
  { key: 'output', labelKey: 'billingTableOutput' },
]

export type BillingTableWrite = (entries: string[]) => void

interface BillingModalProps {
  entries: readonly string[]
  currency: string
  write: BillingTableWrite
}

let nextRowId = 1

function blankRow(model = ''): EditRow {
  return { id: nextRowId++, model, input: '', cacheRead: '', output: '' }
}

function seedRows(entries: readonly string[]): EditRow[] {
  const rows: EditRow[] = parseBillingTable(entries).map(row => ({
    id: nextRowId++,
    model: row.model,
    input: row.cacheMiss === null ? '' : String(row.cacheMiss),
    cacheRead: row.cacheHit === null ? '' : String(row.cacheHit),
    output: row.output === null ? '' : String(row.output),
  }))
  const known = new Set(rows.map(row => row.model.toLowerCase()))
  for (const model of unpricedModels()) {
    if (known.has(model.toLowerCase())) continue
    rows.push(blankRow(model))
  }
  if (rows.length === 0) rows.push(blankRow())
  return rows
}

function BillingModal(props: BillingModalProps & { close(): void }) {
  const [rows, setRows] = React.useState<EditRow[]>(() => seedRows(props.entries))
  const firstModelRef = React.useRef<HTMLInputElement | null>(null)
  const focusRowId = React.useRef<number | null>(null)

  React.useEffect(() => {
    firstModelRef.current?.focus()
  }, [])

  function updateField(id: number, field: 'model' | RateKey, value: string) {
    setRows(current => current.map(row => (row.id === id ? { ...row, [field]: value } : row)))
  }

  function addRow() {
    if (rows.length >= PRICE_ROWS_MAX) return
    const added = blankRow()
    focusRowId.current = added.id
    setRows(current => [...current, added])
  }

  function removeRow(id: number) {
    setRows(current => {
      const next = current.filter(row => row.id !== id)
      return next.length === 0 ? [blankRow()] : next
    })
  }

  function save() {
    const entries: string[] = []
    for (const row of rows) {
      if (row.model.trim() === '') continue
      entries.push(billingRowEntry(row.model, row.input, row.cacheRead, row.output))
    }
    props.write(entries)
    props.close()
  }

  const canSave = rows.some(row => row.model.trim() !== '') || props.entries.length > 0
  const modelLabel = copy('billingTableModel')

  return React.createElement(
    ModalFrame,
    {
      label: copy('billingTableTitle'),
      closeLabel: copy('billingTableClose'),
      panelClass: 'dsh-claude-billing-card',
      closeClass: 'dsh-claude-billing-close',
      close: props.close,
    },
    React.createElement(
      'header',
      { className: 'dsh-claude-billing-head' },
      React.createElement('h3', { className: 'dsh-claude-billing-title' }, copy('billingTableTitle')),
      React.createElement('p', { className: 'dsh-claude-billing-desc' }, copy('billingTableDesc')),
    ),
    React.createElement(
      'div',
      { className: 'dsh-claude-billing-units' },
      React.createElement('span', null, copy('billingTableUnit').replace('{currency}', props.currency)),
      React.createElement('span', null, copy('billingTableLegend')),
    ),
    React.createElement(
      'div',
      { className: 'dsh-claude-billing-grid' },
      React.createElement(
        'div',
        { className: 'dsh-claude-billing-row dsh-claude-billing-row-head' },
        React.createElement('span', null, modelLabel),
        RATE_COLUMNS.map(column => React.createElement('span', { key: column.key }, copy(column.labelKey))),
        React.createElement('span', null, ''),
      ),
      React.createElement(
        'div',
        { className: 'dsh-claude-billing-rows' },
        rows.map((row, index) => React.createElement(
          'div',
          { key: row.id, className: 'dsh-claude-billing-row' },
          React.createElement(
            'div',
            { className: 'dsh-claude-billing-model' },
            React.createElement('input', {
              ref: (node: HTMLInputElement | null) => {
                if (index === 0) firstModelRef.current = node
                if (node !== null && focusRowId.current === row.id) {
                  focusRowId.current = null
                  node.focus()
                }
              },
              type: 'text',
              className: 'dsh-claude-settings-input dsh-claude-billing-field',
              value: row.model,
              spellCheck: false,
              autoComplete: 'off',
              'aria-label': modelLabel,
              onChange: (event: React.ChangeEvent<HTMLInputElement>) => updateField(row.id, 'model', event.target.value),
            }),
          ),
          RATE_COLUMNS.map(column => {
            const label = copy(column.labelKey)
            return React.createElement(
              'label',
              { key: column.key, className: 'dsh-claude-billing-num' },
              React.createElement('span', { className: 'dsh-claude-billing-rate-label' }, label),
              React.createElement('input', {
                type: 'text',
                inputMode: 'decimal',
                className: 'dsh-claude-settings-input dsh-claude-billing-field',
                value: row[column.key],
                'aria-label': label,
                onChange: (event: React.ChangeEvent<HTMLInputElement>) => updateField(row.id, column.key, event.target.value),
              }),
            )
          }),
          React.createElement(
            'button',
            {
              type: 'button',
              className: 'dsh-claude-scheme-reset dsh-claude-billing-remove',
              'aria-label': copy('billingTableRemove'),
              onClick: () => removeRow(row.id),
            },
            React.createElement(Glyph, { name: 'close' }),
          ),
        )),
      ),
    ),
    React.createElement(
      'div',
      { className: 'dsh-claude-billing-actions' },
      React.createElement(
        'button',
        {
          type: 'button',
          className: 'dsh-claude-scheme-item dsh-claude-scheme-add dsh-claude-billing-add',
          'data-lead': 'none',
          disabled: rows.length >= PRICE_ROWS_MAX,
          onClick: addRow,
        },
        React.createElement(Glyph, { name: 'plus' }),
        React.createElement('span', null, copy('billingTableAdd')),
      ),
      React.createElement('span', { className: 'dsh-claude-billing-limit' }, copy('billingTableLimit').replace('{count}', String(PRICE_ROWS_MAX))),
    ),
    React.createElement('div', { className: 'dsh-claude-billing-hint' }, copy('billingTableHint')),
    React.createElement(
      'footer',
      { className: 'dsh-claude-billing-foot' },
      React.createElement(
        'button',
        {
          type: 'button',
          className: 'dsh-claude-settings-button dsh-claude-scheme-button dsh-claude-billing-button',
          onClick: props.close,
        },
        copy('billingTableCancel'),
      ),
      React.createElement(
        'button',
        {
          type: 'button',
          className: 'dsh-claude-settings-button dsh-claude-scheme-button dsh-claude-scheme-primary dsh-claude-billing-button',
          disabled: !canSave,
          onClick: save,
        },
        copy('billingTableSave'),
      ),
    ),
  )
}

const billingModal = createModalHost<BillingModalProps>('billing-table', BillingModal)

export function openBillingEditor(entries: readonly string[], currency: string, write: BillingTableWrite) {
  billingModal.open({ entries, currency, write })
}

export function closeBillingEditor() {
  billingModal.close()
}

export function billingRowsOfEntries(entries: readonly string[]): BillingRow[] {
  return parseBillingTable(entries)
}

export function billingRowFields(entry: string) {
  return splitBillingRow(entry)
}
