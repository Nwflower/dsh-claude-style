import { DARK_THEME_ATTRIBUTE } from '@dsh-claude-style/contracts/dom'
import { subscribeMutations } from '@dsh-claude-style/engine/bus'
import { BACKGROUND_OPACITY_ATTR, PALETTE_ATTR, PALETTE_CARD_ATTR, PAGE_ZOOM_ATTR, STYLE_STAMP_ATTR } from '../constants'

/**
 * The marks theme/tokens.css and theme/chrome.css test on the document
 * element.
 *
 * <html> sits above <body> and inherits none of its attributes, so a rule that
 * paints the document cannot read the palette marks, the page's scale or the
 * marks around them where core/prefs.ts writes them. Asking through
 * `html:has(body[…])` would make every mutation under the body a candidate for
 * invalidating the document's style, so this module copies the marks onto
 * <html> and the rules read the document element directly.
 *
 * The copy is written from the same place as the body marks — core/prefs.ts,
 * right after its mirrors and before the sheet mounts — and <body> is watched
 * for every one of them: the host flips the dark state there by itself, and an
 * attribute on the body is a page surface a stylesheet, a script or another
 * session may write too (shared/page-scale.ts reads the page's scale that way).
 */
const MIRRORED_MARKS = [STYLE_STAMP_ATTR, PALETTE_ATTR, PALETTE_CARD_ATTR, PAGE_ZOOM_ATTR, BACKGROUND_OPACITY_ATTR] as const

/**
 * The document element's own copy of the host's light/dark answer: the host's
 * attribute stays on <body>, and the skin's mark stands in for it where a
 * document rule reads it. The light-theme canvas cards in theme/tokens.css test
 * its absence, which is the answer the body's own dark attribute gives the rest
 * of the sheets.
 */
const DARK_ROOT_ATTR = 'data-dsh-claude-dark'

/** Copy every mark a document rule reads from <body> onto <html>; an absent mark comes off there too. */
export function mirrorDocumentMarks() {
  const root = document.documentElement
  for (const name of MIRRORED_MARKS) {
    const value = document.body.getAttribute(name)
    if (value === null) root.removeAttribute(name)
    else root.setAttribute(name, value)
  }
  root.toggleAttribute(DARK_ROOT_ATTR, document.body.hasAttribute(DARK_THEME_ATTRIBUTE))
}

/** Mirror the marks now and follow every writer of them on <body>; the answer unsubscribes. */
export function installDocumentMarks() {
  mirrorDocumentMarks()
  return subscribeMutations(document.body, { attributeFilter: [DARK_THEME_ATTRIBUTE, ...MIRRORED_MARKS] }, mirrorDocumentMarks)
}

/** Take every mirrored mark off <html>: the document element is the host's once the theme goes. */
export function clearDocumentMarks() {
  const root = document.documentElement
  for (const name of MIRRORED_MARKS) root.removeAttribute(name)
  root.removeAttribute(DARK_ROOT_ATTR)
}
