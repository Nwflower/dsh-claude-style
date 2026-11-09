import { observeSize, subscribeMutations } from '@dsh-claude-style/engine/bus'
import { positionAnchoredPopover } from '../../shared/popover'

/**
 * Re-place the host's account card in its own coordinate space, fixing the
 * host's mixed-space offset under page zoom. Inline `!important` declarations
 * override every later host write; the size watch runs after the host's.
 */
export function createHostMenuPlacement(options: { trigger(): HTMLElement | null }) {
  /** The air the host leaves between the account row and the card above it. */
  const GAP = 4
  /** Takes down the watch on the open card, while one is up. */
  let stopWatching: (() => void) | null = null

  /** The sidebar collapsed into its rail, where a card opens beside the row. */
  function inRail(element: Element) {
    return element.closest('[data-dsh-claude-part~="sidebar-collapsed"]') !== null
  }

  /** Put the card where the host meant it. */
  function place(menu: HTMLElement) {
    const trigger = options.trigger()
    if (trigger === null || menu.offsetWidth === 0 || menu.offsetHeight === 0) return
    positionAnchoredPopover(trigger, menu, inRail(trigger)
      ? { side: 'right', important: true }
      : { side: 'above-left', gap: GAP, important: true })
  }

  function unwatch() {
    if (stopWatching === null) return
    stopWatching()
    stopWatching = null
  }

  /** Follow an open card's style writes and size; the shared guard stops feedback. */
  function watch(menu: HTMLElement) {
    unwatch()
    const stopStyle = subscribeMutations(menu, { attributes: true, attributeFilter: ['style'] }, () => place(menu))
    const stopSize = observeSize(menu, () => place(menu), { afterHost: true })
    stopWatching = () => {
      stopStyle()
      stopSize()
    }
  }

  return { place, watch, unwatch }
}
