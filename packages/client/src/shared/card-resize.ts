import { requestFrame } from '@dsh-claude-style/engine/frame'
import { motionEase, motionMs } from './motion'
import { motionReduced } from '../core/prefs'

/** Measure before content changes, then release height to obtain the destination for the animation.
 * Keep height off `transition`, which popover open/close owns; anchored placement follows every frame.
 */

/** The card mid-travel, its animation, and the placement to follow. */
let travelling: HTMLElement | null = null
let running: Animation | null = null
let followCard: (() => void) | null = null

/** End the travel (if one runs) and hand the card's height back to its content. */
export function releaseCardHeight() {
  if (running !== null) {
    running.cancel()
    running = null
  }
  if (travelling === null) return
  const card = travelling
  travelling = null
  card.style.height = ''
  const follow = followCard
  followCard = null
  follow?.()
}

export function travelCardHeight(card: HTMLElement, from: number, follow?: () => void) {
  releaseCardHeight()
  card.style.height = ''
  const to = card.getBoundingClientRect().height
  // A card that keeps the size it already had needs no travel.
  if (Math.abs(to - from) < 1 || motionReduced()) return
  travelling = card
  followCard = follow ?? null
  const duration = motionMs('--dsh-claude-duration-resize')
  const animation = card.animate(
    [{ height: `${from}px` }, { height: `${to}px` }],
    { duration, easing: motionEase('--dsh-claude-ease-settle'), fill: 'none' },
  )
  running = animation
  animation.onfinish = () => releaseCardHeight()
  const keep = () => {
    if (travelling !== card || running !== animation) return
    follow?.()
    if (animation.playState === 'running') requestFrame({ write: keep })
  }
  requestFrame({ write: keep })
}
