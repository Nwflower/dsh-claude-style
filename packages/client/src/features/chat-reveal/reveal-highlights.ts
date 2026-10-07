import { CHAT_REVEAL_COLOR_VAR, CHAT_REVEAL_HIGHLIGHT_PREFIX, CHAT_REVEAL_STEPS } from './reveal-params'

/**
 * The engine's Custom Highlight table: one highlight per step, its segments
 * swapped every frame.
 *
 * @param registry - `CSS.highlights`, checked for existence by the factory.
 * @param HighlightConstructor - the page's `Highlight`, checked to be a function.
 */
export function createRevealHighlights(registry: HighlightRegistry, HighlightConstructor: typeof Highlight) {
  /** One highlight per step: registered once, its segments swapped every frame. */
  const highlights: (Highlight | null)[] = new Array(CHAT_REVEAL_STEPS).fill(null)

  /** Unregister every step's highlight. */
  const clearHighlights = () => {
    for (let step = 0; step < CHAT_REVEAL_STEPS; step += 1) {
      if (highlights[step] === null) continue
      registry.delete(CHAT_REVEAL_HIGHLIGHT_PREFIX + step)
      highlights[step] = null
    }
  }

  /**
   * Swap this step's segments for this batch.
   *
   * The registry is written once per step, the first time it is used; after
   * that only the highlight's own segments change. Unregistering and
   * registering all twenty-four names every frame would make the browser
   * rebuild its highlight markers each time. A step that is empty this frame
   * is cleared rather than unregistered — the next frame very likely needs it.
   */
  const showStep = (step: number, ranges: StaticRange[]) => {
    let highlight = highlights[step] ?? null
    if (ranges.length === 0) {
      if (highlight !== null && highlight.size > 0) highlight.clear()
      return
    }
    if (highlight === null) {
      highlight = new HighlightConstructor()
      highlights[step] = highlight
      registry.set(CHAT_REVEAL_HIGHLIGHT_PREFIX + step, highlight)
    } else {
      highlight.clear()
    }
    for (const range of ranges) highlight.add(range)
  }

  return { clearHighlights, showStep }
}

/**
 * Publish an element's own colour to CHAT_REVEAL_COLOR_VAR.
 *
 * What matters is the colour the markdown layer actually paints — a link's
 * token, a syntax token, a list marker — not what this module last wrote.
 * The computed colour is read, and skipped entirely when the element still
 * carries the colour recorded for it, which is every frame after the first.
 *
 * A value inherited from an ancestor already is its colour (bold inside a
 * paragraph, body text inside a list item), so nothing is written then: an
 * inline style is a style invalidation, and it would wake anything else on
 * the page watching style attributes.
 *
 * @returns the publisher: give it the element a segment renders in.
 */
export function createRunColorPublisher() {
  /** Colours already written onto elements, so an unchanged one skips the style read. */
  const writtenColors = new WeakMap<Element, string>()

  return (element: HTMLElement | null) => {
    if (element === null) return
    const style = window.getComputedStyle(element)
    const color = style.color
    if (writtenColors.get(element) === color) return
    writtenColors.set(element, color)
    if (style.getPropertyValue(CHAT_REVEAL_COLOR_VAR).trim() === color) return
    element.style.setProperty(CHAT_REVEAL_COLOR_VAR, color)
  }
}
