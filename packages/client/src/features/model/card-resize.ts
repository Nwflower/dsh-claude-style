import { requestFrame } from '@dsh-claude-style/engine/frame'
import { motionEase, motionMs } from '../../shared/motion'
import { motionReduced } from '../../core/prefs'

/** Card resize: take a card from the height it had to the height its content
 * gives it (transitions.dev's "Card resize", MIT). The caller reads `from`
 * before it changes the content, in the same press handler; the destination is
 * read here right after that change, so the card never paints at either height
 * before the travel starts. That read is one layout per reader action, never a
 * per-frame one. Height stays off `transition`, which popover open/close owns;
 * anchored placement follows every frame through the travel's `follow`.
 */

/** The card mid-travel, its animation, and the placement to follow. */
let travelling: HTMLElement | null = null
let running: Animation | null = null
let followCard: (() => void) | null = null

/** End the travel (if one runs) and hand the card's height back to its content. */
export function releaseCardHeight() {
  if (running !== null) {
    // Detach the finish route before cancelling: a finish already queued for
    // this animation would otherwise release the travel that replaced it.
    running.onfinish = null
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
  // Height animates rather than transform or clip-path: the rows and words
  // reflow to the destination, the card's own box has to grow with them, and
  // the anchored placement follows that box every frame. A clipped box would
  // keep the old height and paint the card against a stale anchor.
  const animation = card.animate(
    [{ height: `${from}px` }, { height: `${to}px` }],
    { duration, easing: motionEase('--dsh-claude-ease-settle'), fill: 'none' },
  )
  running = animation
  animation.onfinish = () => {
    // The finish event outlives a teardown or a later travel: only the
    // animation still recorded here may end the travel.
    if (running !== animation) return
    releaseCardHeight()
  }
  const keep = () => {
    if (travelling !== card || running !== animation) return
    follow?.()
    if (animation.playState === 'running') requestFrame({ write: keep })
  }
  requestFrame({ write: keep })
}
