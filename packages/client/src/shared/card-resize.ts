import { requestFrame } from '@dsh-claude-style/engine/frame'
import { motionEase, motionMs } from './motion'
import { motionReduced } from '../core/prefs'

/**
 * A card taking a new height over transitions.dev's "Card resize" (MIT, see
 * docs/THIRD_PARTY_NOTICES.md): its width and height tween, with the duration
 * this package keeps as `--dsh-claude-duration-resize` and the settling curve
 * the other surface transitions read.
 *
 * A height cannot be interpolated into `auto`, so the caller measures the card
 * before its content changes: the new height is read with the height released,
 * and the travel runs between the two as its own animation. The card's own
 * `transition` stays untouched — the popover's open and close ride that one,
 * and a height written into it would replace them.
 *
 * A card anchored above its trigger is laid out from its height, so the caller
 * also hands over the placement it wants followed: it runs on every frame, and
 * once more when the height returns to the content.
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
