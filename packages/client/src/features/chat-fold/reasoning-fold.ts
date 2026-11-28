import { subscribeMutations } from '@dsh-claude-style/engine/bus'
import type { FoldPressReading } from '../../shared/fold-toggle'
import { collectFoldRows, createFoldScheduler } from './fold-scheduler'
import { foldControlAt, foldControlAtBottom, foldExpandedBody } from './fold-glide-parts'
import { inPagePixels } from '../../shared/page-zoom'
import { EXPANDED_ATTRIBUTE, ROW_PHASE_ATTRIBUTE, RUNNING_STATE, THINK_ROW_SELECTOR } from '@dsh-claude-style/contracts/dom'
import { REASONING_DISPLAY_COLLAPSED } from '../../constants'
import { readPrefs, subscribePrefs } from '../../core/prefs'

/** The toggle control inside a thinking row across both host DisclosureRow and button shapes. */
export function thinkRowControl(row: Element) {
  const control = row.querySelector('[role="button"], button')
  return control instanceof HTMLElement ? control : null
}

/* Host ReasoningRow starts collapsed; phase and expanded state are its contract (D3).
   onRows precedes automatic presses so the reasoning window sees the same batch. */
export function createReasoningFold(onRows?: (rows: readonly Element[]) => void) {
  const scheduler = createFoldScheduler({
    selector: THINK_ROW_SELECTOR,
    phase: row => row.getAttribute(ROW_PHASE_ATTRIBUTE) ?? '',
    rows: () => document.querySelectorAll(THINK_ROW_SELECTOR),
    onRows,
    press(row) {
      if (readPrefs().reasoningDisplay === REASONING_DISPLAY_COLLAPSED) return null
      const phase = row.getAttribute(ROW_PHASE_ATTRIBUTE) ?? ''
      const desiredExpanded = phase === RUNNING_STATE
      if (row.hasAttribute(EXPANDED_ATTRIBUTE) === desiredExpanded) return null
      const control = thinkRowControl(row)
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
        const pressed = thinkRowControl(row)
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
  const stopPrefs = subscribePrefs(() => scheduler.refresh())
  scheduler.refresh()
  return () => {
    stopPrefs()
    stopMutations()
    scheduler.stop()
  }
}
