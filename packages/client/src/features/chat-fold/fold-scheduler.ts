import { requestFrame } from '@dsh-claude-style/engine/frame'
import { composerComposing } from '../../shared/composer-caret'
import { isChatFoldToggle, pressChatFoldToggle, subscribeFoldReaderEvents } from './fold-toggle'
import type { FoldPressReading } from './fold-toggle'

export interface FoldPress {
  control: HTMLElement
  state: string
  read?(): void
  settled(): boolean
  retryAfterSettlement?: boolean
  afterPress?(): void
}

interface FoldSchedule {
  selector: string
  phase(row: Element): string
  press(row: Element, readerTouched: boolean): FoldPress | null
  rows(): Iterable<Element>
  read?(rows: readonly Element[]): FoldPressReading | null
  onRows?(rows: readonly Element[]): void
  beginBatch?(): void
  endBatch?(): void
}

/** Per-row phase decisions and one cancellable read/write batch (D12, D40). */
export function createFoldScheduler(options: FoldSchedule) {
  // Per row: weak records expire with the host row and are released on stop.
  let touchedIn = new WeakMap<Element, string>()
  let attemptedIn = new WeakMap<Element, string>()
  // Per batch: connected rows only; cleared before pressing and on stop.
  const pending = new Set<Element>()
  let cancelFrame: (() => void) | null = null
  let stopped = false

  const plan = (row: Element) => {
    if (!row.isConnected) return null
    const phase = options.phase(row)
    if (phase === '' || touchedIn.get(row) === phase) return null
    const press = options.press(row, touchedIn.has(row))
    if (press === null || attemptedIn.get(row) === press.state) return null
    return press
  }
  const schedule = () => {
    if (stopped || cancelFrame !== null || pending.size === 0) return
    let rows: Element[] = []
    let presses: { row: Element, press: FoldPress }[] = []
    let reading: FoldPressReading | null = null
    cancelFrame = requestFrame({
      read() {
        rows = [...pending].filter(row => row.isConnected)
        options.beginBatch?.()
        if (composerComposing()) return
        for (const row of rows) {
          const press = plan(row)
          if (press !== null) presses.push({ row, press })
        }
        reading = options.read?.(presses.map(entry => entry.row)) ?? null
        for (const { press } of presses) press.read?.()
      },
      write() {
        cancelFrame = null
        pending.clear()
        try {
          options.onRows?.(rows)
          for (const { row, press } of presses) {
            if (stopped || composerComposing()) break
            const current = plan(row)
            if (current?.state !== press.state || current.control !== press.control) continue
            attemptedIn.set(row, press.state)
            pressChatFoldToggle(press.control, reading)
            // Process groups may be folded again by the host within the same phase.
            if (press.retryAfterSettlement && press.settled()) attemptedIn.delete(row)
            press.afterPress?.()
          }
        } finally {
          options.endBatch?.()
        }
      },
    })
  }
  const add = (row: Element) => {
    if (!stopped && row.isConnected) pending.add(row)
  }
  const refresh = () => {
    for (const row of options.rows()) add(row)
    schedule()
  }
  const stopReader = subscribeFoldReaderEvents(event => {
    if (isChatFoldToggle() || !(event.target instanceof Element)) return
    const row = event.target.closest(options.selector)
    if (row !== null) touchedIn.set(row, options.phase(row))
  }, refresh)
  return {
    add,
    schedule,
    refresh,
    stop() {
      stopped = true
      stopReader()
      cancelFrame?.()
      cancelFrame = null
      pending.clear()
      options.endBatch?.()
      touchedIn = new WeakMap()
      attemptedIn = new WeakMap()
    },
  }
}

/** Collect changed rows and newly mounted descendants for either fold family. */
export function collectFoldRows(records: readonly MutationRecord[], selector: string, add: (row: Element) => void, added = add) {
  for (const record of records) {
    const element = record.target instanceof Element ? record.target : record.target.parentElement
    const row = element?.closest(selector)
    if (row != null) add(row)
    for (const node of record.addedNodes) {
      if (!(node instanceof Element)) continue
      if (node.matches(selector)) added(node)
      for (const child of node.querySelectorAll(selector)) added(child)
    }
  }
}
