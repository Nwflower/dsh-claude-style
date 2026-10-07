/**
 * One element of the skin's own markup: tag, class and text in one call —
 * the builder every hand-built surface uses (rows, cards, lists).
 *
 * @param tag - element name.
 * @param className - class attribute; empty or omitted leaves it unset.
 * @param text - text content; omitted or null leaves it empty.
 * @returns the new element.
 */
export function buildElement<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, text?: string | null) {
  const element = document.createElement(tag)
  if (className) element.className = className
  if (text !== undefined && text !== null) element.textContent = text
  return element
}

/**
 * Write one attribute only when its value differs: re-setting the same
 * value still invalidates the element's styles, and a pass writes its
 * marks every frame. Presence-only marks use the DOM's own
 * `element.toggleAttribute(name, on)`, which writes nothing when the
 * state already matches.
 *
 * @param element - the element to mark.
 * @param name - attribute name.
 * @param value - the value it must carry.
 */
export function setAttributeIfChanged(element: Element, name: string, value: string) {
  if (element.getAttribute(name) !== value) element.setAttribute(name, value)
}

/**
 * `node.closest(selector)` for a node that came out of an event or a walk:
 * text nodes, the document and a detached window have no `closest`, and
 * the answer for them is "nothing here".
 *
 * @param node - the node to search from.
 * @param selector - the selector to match.
 * @returns the closest match, or null. Typed as `E` (an HTML element unless
 *   the caller names another), as `querySelector<E>` is.
 */
export function closestFrom<E extends Element = HTMLElement>(node: EventTarget | null | undefined, selector: string): E | null {
  if (node === null || node === undefined || typeof (node as Partial<Element>).closest !== 'function') return null
  return (node as Element).closest<E>(selector)
}

/**
 * One host element the skin marks for its stylesheet, followed across
 * re-renders. React replaces host nodes freely, so the mark has to move
 * with the element the pass finds this time and come off the one it
 * found before; an unchanged mark writes nothing (re-setting the same
 * value still invalidates the element's styles).
 *
 * @param attr - the attribute the stylesheet keys on.
 * @returns `{ mark(element, value), current(), release() }`: `mark` moves
 *   the attribute (value defaults to empty) onto `element`, or takes it off
 *   when `element` is null; `current` is the marked element; `release`
 *   takes the mark off for the teardown.
 */
export function createStamp<E extends Element = Element>(attr: string) {
  let marked: E | null = null

  function mark(element: E | null, value = '') {
    if (marked !== null && marked !== element) marked.removeAttribute(attr)
    marked = element
    if (element !== null) setAttributeIfChanged(element, attr, value)
  }

  return {
    mark,
    current: () => marked,
    release: () => mark(null),
  }
}
