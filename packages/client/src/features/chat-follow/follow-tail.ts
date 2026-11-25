import { conversationScroller, findFollowTailButton } from '@dsh-claude-style/engine/chat-dom'
import { createStamp } from '@dsh-claude-style/engine/dom'
import { inPageBox, pageViewport } from '../../shared/page-zoom'

/** How far above the composer's top edge the host's back-to-end button floats. */
const FOLLOW_TAIL_AIR_PX = 12
/** The button's fixed placement, written as numbers because the column moves under it. */
const FOLLOW_TAIL_LEFT = '--dsh-claude-follow-tail-left'
const FOLLOW_TAIL_BOTTOM = '--dsh-claude-follow-tail-bottom'

/**
 * The conversation's own composer card: the lowest of the cards on the page,
 * which is the one the conversation is typed into rather than the hero's.
 *
 * @param cards - the composer cards, kept current by the bus (D40).
 */
function conversationComposerCard(cards: readonly HTMLElement[]) {
  let found: HTMLElement | null = null
  let lowest = -Infinity
  for (const card of cards) {
    const box = card.getBoundingClientRect()
    if (box.width === 0 && box.height === 0) continue
    if (box.top > lowest) {
      lowest = box.top
      found = card
    }
  }
  return found
}

/** Where the host's back-to-end button stands this frame, as a frame's read phase found it. */
export interface FollowTailPlacement {
  button: HTMLElement
  left: string
  bottom: string
}

/**
 * The host's back-to-end button, centred over the composer.
 *
 * The button is the host's own and renders only while its follow is off; its
 * shipped place is the conversation column's right edge, which is where the
 * mascot stands on the card. The two numbers its stylesheet reads — the
 * column's centre and the composer's top edge — belong to the frame's read
 * phase (D40): the button is fixed and the column moves with the sidebars and
 * the window, so every pass places it again.
 *
 * @param cards - the composer cards, kept current by the bus (D40).
 * @returns null while the button, the card or the scroller is not there.
 */
export function readFollowTail(cards: readonly HTMLElement[]): FollowTailPlacement | null {
  const button = findFollowTailButton()
  if (button === null) return null
  const card = conversationComposerCard(cards)
  const scroller = conversationScroller()
  if (card === null || scroller === null) return null
  // The boxes are measured in the viewport's pixels and the two properties are
  // read in the page's own, which the reader's page zoom scales
  // (shared/page-zoom.ts).
  const cardBox = inPageBox(card.getBoundingClientRect())
  const scrollBox = inPageBox(scroller.getBoundingClientRect())
  return {
    button,
    left: `${Math.round(scrollBox.left + scrollBox.width / 2)}px`,
    bottom: `${Math.round(pageViewport().height - cardBox.top + FOLLOW_TAIL_AIR_PX)}px`,
  }
}

/**
 * Put the button where a read phase measured it; the frame's write phase's half.
 *
 * @param stamp - the mark to move onto the button, or off when it is not there.
 * @param placement - what the frame measured, or null when the button is absent.
 */
export function writeFollowTail(stamp: ReturnType<typeof createStamp<HTMLElement>>, placement: FollowTailPlacement | null) {
  if (placement === null) {
    stamp.release()
    return
  }
  const { button, left, bottom } = placement
  stamp.mark(button)
  if (button.style.getPropertyValue(FOLLOW_TAIL_LEFT) !== left) button.style.setProperty(FOLLOW_TAIL_LEFT, left)
  if (button.style.getPropertyValue(FOLLOW_TAIL_BOTTOM) !== bottom) button.style.setProperty(FOLLOW_TAIL_BOTTOM, bottom)
}
