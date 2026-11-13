import { subscribeMutations } from '@dsh-claude-style/engine/bus'
import type { FoldPressReading } from './fold-toggle'
import { collectFoldRows, createFoldScheduler } from './fold-scheduler'
import { foldControlAt, foldControlAtBottom, foldExpandedBody } from './fold-glide-parts'
import { inPagePixels } from '../../shared/page-zoom'
import { EXPANDED_ATTRIBUTE, ROW_PHASE_ATTRIBUTE, RUNNING_STATE, THINK_ROW_SELECTOR } from '@dsh-claude-style/contracts/dom'

/* Host ReasoningRow starts collapsed; phase and expanded state are its contract (D3).
   onRows precedes automatic presses so the reasoning window sees the same batch. */
export function createReasoningFold(onRows?: (rows: readonly Element[]) => void) {
  const controlOf = (row: Element) => {
    const control = row.querySelector('[role="button"], button')
    return control instanceof HTMLElement ? control : null
  }
  const scheduler = createFoldScheduler({
    selector: THINK_ROW_SELECTOR,
    phase: row => row.getAttribute(ROW_PHASE_ATTRIBUTE) ?? '',
    rows: () => document.querySelectorAll(THINK_ROW_SELECTOR),
    onRows,
    press(row) {
      const phase = row.getAttribute(ROW_PHASE_ATTRIBUTE) ?? ''
      const desiredExpanded = phase === RUNNING_STATE
      if (row.hasAttribute(EXPANDED_ATTRIBUTE) === desiredExpanded) return null
      const control = controlOf(row)
      return control === null ? null : {
        control,
        state: phase,
        settled: () => row.hasAttribute(EXPANDED_ATTRIBUTE) === desiredExpanded,
      }
    },
    read(rows): FoldPressReading | null {
      // Per batch: the glide consumes these heights only during this frame (D40).
      const heights = new Map<Element, number>()
      let atBottom: boolean | null = null
      for (const row of rows) {
        const pressed = controlOf(row)
        const control = pressed === null ? null : foldControlAt(pressed)
        if (control === null) continue
        if (atBottom === null) atBottom = foldControlAtBottom(control)
        const body = foldExpandedBody(control)
        if (body !== null) heights.set(body, inPagePixels(body.getBoundingClientRect().height))
      }
      return atBottom === null ? null : { atBottom, heights }
    },
  })
  const stopMutations = subscribeMutations(document.body, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: [ROW_PHASE_ATTRIBUTE, EXPANDED_ATTRIBUTE],
  }, records => {
    collectFoldRows(records, THINK_ROW_SELECTOR, scheduler.add)
    scheduler.schedule()
  })
  scheduler.refresh()
  return () => {
    stopMutations()
    scheduler.stop()
  }
}
