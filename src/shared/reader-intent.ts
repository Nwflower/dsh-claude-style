import { COMPOSER_SELECTOR, SCROLL_KEYS } from './chat-dom'

/**
 * Whether an event is the reader taking the scroll over.
 *
 * Three readers ask the same question — the follow guard, the fold glide's
 * hand-back and the process body's catch-up — so the test lives in one
 * place and cannot drift apart in their own edits. Two rules, the same
 * everywhere: a pointer or key inside the composer is the reader typing,
 * and of the keys only the ones that scroll the viewport count. Which
 * event types each reader listens to is that reader's own decision.
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
