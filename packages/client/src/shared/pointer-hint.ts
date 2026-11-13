import { withoutTransition } from './transition'

export const POINTER_HINT_CLASS = 'dsh-claude-pointer-hint'
export const POINTER_HINT_SHOWN_ATTRIBUTE = 'data-shown'

/**
 * Update one persistent hint and place its first appearance without travel (D9, D40).
 * The owner supplies its measurement: a transformed grid pill and a swatch's
 * scrollWidth measure different spaces. Read after the label changes, then write.
 */
export function showPointerHint(
  element: HTMLElement,
  label: string,
  read: (text: HTMLElement) => () => void,
  shownAttribute = POINTER_HINT_SHOWN_ATTRIBUTE,
) {
  const text = element.firstElementChild
  if (!(text instanceof HTMLElement)) throw new Error('pointer hint requires a text element')
  const arriving = !element.hasAttribute(shownAttribute)
  text.textContent = label
  const write = read(text)
  if (arriving) withoutTransition([element], write)
  else write()
  element.setAttribute(shownAttribute, '')
}

/** The owner keeps the element across pointer exits and keyboard blur. */
export function hidePointerHint(element: HTMLElement | null, shownAttribute = POINTER_HINT_SHOWN_ATTRIBUTE) {
  element?.removeAttribute(shownAttribute)
}
