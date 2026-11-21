import { motionEaseAt, motionMs } from '../../shared/motion'

export interface UnderlineEdges {
  left: number
  right: number
}

const DURATION = motionMs('--dsh-claude-duration-tab-underline')
/** Transform interpolation between samples preserves both edge curves on the compositor (D9). */
const SEGMENTS = 24
const curves = Array.from({ length: SEGMENTS + 1 }, (_, index) => {
  const progress = index / SEGMENTS
  if (index === 0 || index === SEGMENTS) return { leading: progress, trailing: progress }
  return {
    leading: motionEaseAt('--dsh-claude-ease-tab-leading-edge', progress),
    trailing: motionEaseAt('--dsh-claude-ease-tab-trailing-edge', progress),
  }
})

export function underlineTransform({ left, right }: UnderlineEdges, trackWidth: number) {
  return `translateX(${left}px) scaleX(${(right - left) / trackWidth})`
}

/** Sample a line being redirected in the frame's read phase (D40). */
export function visibleUnderline(list: HTMLElement, trackWidth: number): UnderlineEdges {
  const transform = new DOMMatrixReadOnly(getComputedStyle(list, '::after').transform)
  return { left: transform.e, right: transform.e + transform.a * trackWidth }
}

export function playUnderline(list: HTMLElement, trackWidth: number, from: UnderlineEdges, to: UnderlineEdges) {
  const movesRight = to.left + to.right > from.left + from.right
  const frames = curves.map(({ leading, trailing }) => ({
    transform: underlineTransform({
      left: from.left + (to.left - from.left) * (movesRight ? trailing : leading),
      right: from.right + (to.right - from.right) * (movesRight ? leading : trailing),
    }, trackWidth),
  }))
  return list.animate(frames, { duration: DURATION, fill: 'backwards', pseudoElement: '::after' })
}
