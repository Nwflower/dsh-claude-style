import { buildElement } from '../../shared/dom'

/**
 * One figure, written so it can re-enter: every character is a span of its own
 * and the stylesheet's Number pop-in (transitions.dev, THIRD_PARTY_NOTICES.md)
 * plays on each of them, the last two riding in behind the rest. A figure that
 * moved swaps its spans and therefore animates; one that did not is left alone,
 * which is what keeps a stream of projection frames from replaying the whole
 * row.
 */

/** The class the stylesheet's keyframes hang on. */
const GROUP_CLASS = 'dsh-claude-digit-group'
const DIGIT_CLASS = 'dsh-claude-digit'
/** The delay multiplier the last two characters carry. */
const STAGGER_ATTRIBUTE = 'data-stagger'

/** What each group last showed, so an unchanged figure writes nothing. */
const shown = new WeakMap<Element, string>()

/**
 * Write a figure into a digit group, one character per span.
 *
 * @param group - the group element (`buildDigitGroup` made it).
 * @param text - the figure as the reader sees it.
 * @returns whether the group was rewritten.
 */
export function writeDigits(group: HTMLElement, text: string) {
  if (shown.get(group) === text) return false
  shown.set(group, text)
  const spans: HTMLElement[] = []
  for (let i = 0; i < text.length; i++) {
    const digit = buildElement('span', DIGIT_CLASS, text[i])
    // The last two characters ride in behind the leading ones.
    const fromEnd = text.length - i
    if (fromEnd === 2) digit.setAttribute(STAGGER_ATTRIBUTE, '1')
    else if (fromEnd === 1) digit.setAttribute(STAGGER_ATTRIBUTE, '2')
    spans.push(digit)
  }
  group.replaceChildren(...spans)
  return true
}

/** One figure's element, written with its first value. */
export function buildDigitGroup(text: string) {
  const group = buildElement('span', GROUP_CLASS)
  writeDigits(group, text)
  return group
}
