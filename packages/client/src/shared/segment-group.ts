import * as React from 'react'
import { SEGMENTS_CLASS } from './segment-control'
import { createSlidingPill } from './sliding-pill'

/**
 * The shared sliding highlight on a group React renders
 * (packages/client/src/shared/sliding-pill.ts): the pill follows the child carrying
 * `data-active`, placed after every render — before the frame is painted — and
 * taken off when the group unmounts.
 */
export function useSlidingPill(group: React.RefObject<HTMLElement | null>) {
  const pill = React.useRef<ReturnType<typeof createSlidingPill> | null>(null)
  React.useLayoutEffect(() => {
    pill.current = createSlidingPill('[data-active]')
    return () => {
      pill.current!.release()
      pill.current = null
    }
  }, [])
  React.useLayoutEffect(() => {
    pill.current!.sync(group.current)
  })
}

/**
 * One segmented control on a page React draws, carrying that highlight. `role`
 * defaults to a plain group; the settings strip passes `tablist`. `label` names
 * the group for a reader whose visible title stands outside it.
 */
export function ClaudeStyleSegmentGroup(props: { role?: string, className?: string, label?: string, children?: React.ReactNode }) {
  const group = React.useRef<HTMLDivElement>(null)
  useSlidingPill(group)
  const className = props.className ? `${SEGMENTS_CLASS} ${props.className}` : SEGMENTS_CLASS
  return React.createElement('div', { ref: group, className, role: props.role || 'group', 'aria-label': props.label }, props.children)
}
