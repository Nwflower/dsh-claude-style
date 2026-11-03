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
 * Write an element's words only when they differ, by rewriting its one text
 * node in place. `textContent =` swaps the node out, a change of the element's
 * children, and a `:has()` rule anywhere on the page (the host's or another
 * plugin's) can make each such change recalculate the whole document's styles;
 * a text node's data is no change of structure. A figure that moves every frame
 * is written through here.
 *
 * @param element - the element whose words are written.
 * @param text - the words it must show.
 */
export function writeTextInPlace(element: Element, text: string) {
  const node = element.firstChild
  if (node instanceof Text && node.nextSibling === null) {
    if (node.data !== text) node.data = text
    return
  }
  element.textContent = text
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

/** A local name: a camelCase identifier, which is what the host's CSS modules name their parts. */
const LOCAL_NAME = /^[a-z][A-Za-z0-9]*$/

/**
 * The local name inside a host CSS-module class name, or null for a class that
 * is not one (D3). The host writes two shapes — `<hash>_<local>` and
 * `_<local>_<hash>_<n>` — and the hash's position and alphabet both move
 * between releases, so the local name is the only stable part. Compared whole,
 * never as a substring: `_grow` is not `row`, and a plugin's own class name is
 * not a host one.
 *
 * The shapes overlap (`_2H3hWW_brand` and `_row_jhda5_16` both start with an
 * underscore), so a segment counts as the local name when it is a camelCase
 * identifier: a hash segment starts with a digit or an uppercase letter.
 *
 * @param token - one class token.
 * @returns the local name, or null.
 */
export function localClassName(token: string): string | null {
  const parts = token.split('_')
  if (parts.length < 2) return null
  const last = parts[parts.length - 1]
  if (parts[0] !== '') return LOCAL_NAME.test(last) ? last : null
  // `_<local>_<hash>_<n>`: the local name is the second segment; `_<hash>_<local>`:
  // the hash holds the underscore, so the local name is the last segment.
  return LOCAL_NAME.test(parts[1]) ? parts[1] : LOCAL_NAME.test(last) ? last : null
}

/**
 * Whether `element` is one of the skin's own nodes (D3). The skin spells its
 * classes with the `dsh-claude-` prefix as whole tokens, so compared whole and
 * never as a substring: no host class and no other plugin's class can be
 * mistaken for one.
 *
 * @param element - the element to test.
 */
export function hasSkinClass(element: Element): boolean {
  for (const token of element.classList) {
    if (token.startsWith('dsh-claude-')) return true
  }
  return false
}

/** What a reader can see: no `display: none`, no `visibility: hidden`, no zero opacity. */
const SHOWN = { checkOpacity: true, checkVisibilityCSS: true }

/**
 * Whether the reader can see `element` at all. An overlay root a plugin keeps
 * mounted while hidden, and a dialog between its exit frames, answer no.
 *
 * @param element - the element to test.
 */
export function shown(element: Element): boolean {
  return element.checkVisibility(SHOWN)
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
