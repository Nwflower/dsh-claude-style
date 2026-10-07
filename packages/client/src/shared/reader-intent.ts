import { COMPOSER_SELECTOR } from '@dsh-claude-style/contracts/dom'
import { SCROLL_KEYS } from './chat-dom'

/**
 * Whether an event is the reader taking the scroll over.
 *
 * The scroll owner (shared/scroll-owner.ts) asks it for every intent event
 * it hears. Two rules: a pointer or key inside the composer is the reader
 * typing, and of the keys only the ones that scroll the viewport count.
 *
 * @param event - any pointer, touch or key event on the page.
 * @returns false for an event inside the composer, or a key that cannot scroll.
 */
export function isReaderScrollIntent(event: Event) {
  const target = event.target
  if (target instanceof Element && target.closest(COMPOSER_SELECTOR) !== null) return false
  if (event.type !== 'keydown') return true
  return event instanceof KeyboardEvent && SCROLL_KEYS.has(event.key)
}
