import { requestFrame } from '@dsh-claude-style/engine/frame'
import { motionEase, motionMs } from './motion'
import { motionReduced } from '../core/prefs'

/** Card resize: take a card from the height it had to the height its content
 * gives it (transitions.dev's "Card resize", MIT). The old height is pinned
 * while the destination is measured in the frame's read phase, and the travel
 * starts in its write phase (D40). Height stays off `transition`, which
 * popover open/close owns; anchored placement follows every frame through the
 * travel's `follow`.
 */

/** The card mid-travel (or waiting for its frame), its animation, the placement to follow, and the queued frame. */
let travelling: HTMLElement | null = null
let running: Animation | null = null
let followCard: (() => void) | null = null
let pending: (() => void) | null = null

/** End the travel (if one runs or waits for its frame) and hand the card's height back to its content. */
export function releaseCardHeight() {
  if (pending !== null) {
    pending()
    pending = null
  }
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
  // Reduced motion takes the destination outright: pinning the old height would
  // paint it one frame behind the content for no travel to follow.
  if (motionReduced()) return
  // Hold the card at its old height for the frame the caller's content change
  // lands in: the destination can only be read from the new content, and
  // letting the card paint at that height first would flash the destination
  // before the travel restarts from `from`.
  card.style.height = `${from}px`
  travelling = card
  followCard = follow ?? null
  let to = 0
  pending = requestFrame({
    read() {
      // The pin and the box read stay in the read phase, so the clear cannot
      // invalidate a layout some earlier write of the pass asked for (D40).
      card.style.height = ''
      to = card.getBoundingClientRect().height
    },
    write() {
      pending = null
      const end = () => {
        const onEnd = followCard
        followCard = null
        travelling = null
        onEnd?.()
      }
      // A card that keeps the size it already had needs no travel.
      if (Math.abs(to - from) < 1 || motionReduced()) {
        end()
        return
      }
      const duration = motionMs('--dsh-claude-duration-resize')
      // Height animates rather than transform or clip-path: the rows and words
      // reflow to the destination, the card's own box has to grow with them,
      // and the anchored placement follows that box every frame. A clipped box
      // would keep the old height and paint the card against a stale anchor.
      // This is one travel per reader action, not a per-frame loop.
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
    },
  })
}
