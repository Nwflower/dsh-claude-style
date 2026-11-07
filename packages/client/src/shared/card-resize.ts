import { requestFrame } from '@dsh-claude-style/engine/frame'
import { motionMs } from './motion'
import { motionReduced } from '../core/prefs'

/**
 * A card taking a new height over transitions.dev's "Card resize" (MIT, see
 * docs/THIRD_PARTY_NOTICES.md): its width and height tween, with the duration
 * this package keeps as `--dsh-claude-duration-resize` and the settling curve
 * the other surface transitions read.
 *
 * A height cannot be interpolated into `auto`, so the caller measures the card
 * before its content changes and hands that figure here: the new height is read
 * with the height released, the old one is written back as the travel's start,
 * and the new one lands on the next frame. The height returns to the content
 * once the travel is over. The reader's animation choice (D40) takes the travel
 * away entirely.
 *
 * A card anchored above its trigger has to be placed again on every frame of
 * the travel: its top is read off its own height, so following keeps the bottom
 * edge where the reader has it while the top edge moves.
 */

/** The card mid-travel, the timer that hands its height back, and the follow. */
let travelling: HTMLElement | null = null
let settleTimer: number | null = null
let followCard: (() => void) | null = null

export function releaseCardHeight() {
  if (settleTimer !== null) {
    clearTimeout(settleTimer)
    settleTimer = null
  }
  if (travelling === null) return
  const card = travelling
  travelling = null
  card.style.height = ''
  const follow = followCard
  followCard = null
  // The last placement reads the height the content now gives the card.
  follow?.()
}

export function travelCardHeight(card: HTMLElement, from: number, follow?: () => void) {
  releaseCardHeight()
  card.style.height = ''
  const to = card.getBoundingClientRect().height
  // A card that keeps the size it already had needs no travel.
  if (Math.abs(to - from) < 1 || motionReduced()) return
  card.style.height = `${from}px`
  // Read once, so the browser holds the old height as the travel's start.
  void card.getBoundingClientRect().height
  const duration = motionMs('--dsh-claude-duration-resize')
  travelling = card
  followCard = follow ?? null
  settleTimer = window.setTimeout(releaseCardHeight, duration + 40)
  const started = performance.now()
  const keep = () => {
    if (travelling !== card) return
    follow?.()
    if (performance.now() - started < duration + 40) requestFrame({ write: keep })
  }
  requestFrame({
    write() {
      if (travelling !== card) return
      card.style.height = `${to}px`
      keep()
    },
  })
}
