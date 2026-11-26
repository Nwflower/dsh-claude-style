import { skin } from './skin'

/** Build a skin element with optional class and text. */
export function buildElement<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, text?: string | null) {
  const element = document.createElement(tag)
  if (className) element.className = className
  if (text !== undefined && text !== null) element.textContent = text
  return element
}

/** Avoid redundant writes: they invalidate styles even when the value is unchanged. */
export function setAttributeIfChanged(element: Element, name: string, value: string) {
  if (element.getAttribute(name) !== value) element.setAttribute(name, value)
}

/**
 * Mutate a lone text node in place for frequent updates. Replacing it through
 * `textContent` changes structure and can trigger document-wide `:has()` recalculation.
 */
export function writeTextInPlace(element: Element, text: string) {
  const node = element.firstChild
  if (node instanceof Text && node.nextSibling === null) {
    if (node.data !== text) node.data = text
    return
  }
  element.textContent = text
}

/** Safe `closest` for event/walk targets; non-Element targets return null. */
export function closestFrom<E extends Element = HTMLElement>(node: EventTarget | null | undefined, selector: string): E | null {
  if (node === null || node === undefined || typeof (node as Partial<Element>).closest !== 'function') return null
  return (node as Element).closest<E>(selector)
}

/** The inline style `property` on `element` or on the nearest element above it that declares one, or '' when none below <body> does. */
export function inlineStyleAbove(element: Element, property: string): string {
  for (let node: Element | null = element; node !== null && node !== document.body; node = node.parentElement) {
    const value = node instanceof HTMLElement ? node.style.getPropertyValue(property) : ''
    if (value !== '') return value
  }
  return ''
}

/** A local name: a camelCase identifier, which is what the host's CSS modules name their parts. */
const LOCAL_NAME = /^[a-z][A-Za-z0-9]*$/

/**
 * Extract the stable local segment from `<hash>_<local>` or `_<local>_<hash>_<n>` (D3).
 * camelCase distinguishes overlapping shapes from hash segments; compare names whole, never as substrings.
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

/** Whole-token skin prefix distinguishes skin nodes from host and other plugins (D3, D73). */
export function hasSkinClass(element: Element): boolean {
  const prefix = skin().classPrefix
  for (const token of element.classList) {
    if (token.startsWith(prefix)) return true
  }
  return false
}

/** What a reader can see: no `display: none`, no `visibility: hidden`, no zero opacity. */
const SHOWN = { checkOpacity: true, checkVisibilityCSS: true }

/** Exclude mounted-but-hidden overlays and dialogs during exit. */
export function shown(element: Element): boolean {
  return element.checkVisibility(SHOWN)
}

/** What the page renders: no `display: none` above it and no row content-visibility skips. */
const RENDERED = { contentVisibilityAuto: true }

/**
 * Whether the page renders this element now. A skipped or undisplayed subtree
 * runs none of its CSS animations, and a style or layout read inside it lays
 * that subtree out on its own every time it is read.
 */
export function rendered(element: Element): boolean {
  return element.checkVisibility(RENDERED)
}

/**
 * Track one stylesheet mark across React node replacement, removing it from the old node.
 * `mark(null)` and `release()` clear it; unchanged values avoid style invalidation.
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
