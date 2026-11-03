import { buildElement, closestFrom } from '@dsh-claude-style/engine/dom'
import { createSlidingPill } from '../../shared/sliding-pill'
import { VIEW_SWITCH_CLASS } from '../../shared/segment-control'
import { copy } from './copy'
import type { CopyKey } from './copy'
import type { SegmentView } from './view-store'

export const SEGMENTS: { id: SegmentView, key: CopyKey }[] = [
  { id: 'active', key: 'archiveActive' },
  { id: 'archived', key: 'archiveArchived' }
]

/**
 * The 进行中 / 已归档 segment control, laid over the section's own heading: the
 * two segments write the host's view store (the follower's drive), and the
 * control's look is the shared small segment look
 * (shared/segment-control.css). While 进行中 is the state the control steps
 * aside for the plain heading and comes back on hover (workspace.css); in
 * 已归档 it stays put, because it is the way back.
 */
export function createSegmentControl(onSelect: (view: SegmentView) => void) {
  /** The control element, kept while the section stands; released with it. */
  let control: HTMLElement | null = null
  /** The control's sliding highlight (packages/client/src/shared/sliding-pill.ts). */
  const segmentPill = createSlidingPill('[aria-checked="true"]')

  function build() {
    // The shared small segment look (shared/segment-control.css); the feature
    // class stays for the placement and label crossfade in workspace.css.
    const group = buildElement('div', `${VIEW_SWITCH_CLASS} dsh-claude-ws-segments`)
    group.setAttribute('role', 'radiogroup')
    for (let i = 0; i < SEGMENTS.length; i++) {
      const item = buildElement('button', 'dsh-claude-ws-segment', '')
      item.type = 'button'
      item.setAttribute('role', 'radio')
      item.setAttribute('data-view', SEGMENTS[i].id)
      group.appendChild(item)
    }
    group.addEventListener('click', event => {
      const item = closestFrom(event.target, '.dsh-claude-ws-segment')
      if (item === null) return
      event.stopPropagation()
      event.preventDefault()
      const next = item.getAttribute('data-view')
      if (next === 'active' || next === 'archived') onSelect(next)
    })
    return group
  }

  return {
    element: () => control,
    /**
     * Seat the control in the section's header and bring its items to the view
     * in force: the checked segment and the copy's current language.
     */
    sync(header: HTMLElement, view: SegmentView) {
      if (control === null || control.parentElement !== header) {
        if (control !== null && control.parentElement !== null) control.parentElement.removeChild(control)
        control = build()
        header.insertBefore(control, header.firstChild)
      }
      for (let i = 0; i < control.children.length; i++) {
        const item = control.children[i]
        const id = item.getAttribute('data-view')
        for (let s = 0; s < SEGMENTS.length; s++) {
          if (SEGMENTS[s].id !== id) continue
          const text = copy(SEGMENTS[s].key)
          if (item.textContent !== text) item.textContent = text
        }
        const on = id === view
        if (item.getAttribute('aria-checked') !== (on ? 'true' : 'false')) item.setAttribute('aria-checked', on ? 'true' : 'false')
      }
      segmentPill.sync(control)
    },
    /**
     * The pass's read phase: the control's own box, taken before this frame's
     * writes. A pass that builds the control measures it in the write phase
     * instead (sliding-pill).
     */
    measure() {
      if (control !== null && control.parentElement !== null) segmentPill.measure(control)
    },
    /** Stand the control down: the highlight and the element leave with the section. */
    release() {
      segmentPill.release()
      if (control !== null && control.parentElement !== null) control.parentElement.removeChild(control)
      control = null
    },
  }
}
