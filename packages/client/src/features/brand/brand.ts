import { BRAND_DEFAULT_PRESETS, BRAND_INK_ACCENT, BRAND_INK_ATTR, BRAND_INK_ORIGINAL, BRAND_INK_TEXT, CUSTOM_EDGES_ATTR, CUSTOM_MARK_ATTR, CUSTOM_PALETTE_ATTR, CUSTOM_TINT_ATTR, CUSTOM_WORD_ATTR, CUSTOM_WORD_IMAGE, CUSTOM_WORD_TEXT } from '../../constants'
import { readPrefs, subscribePrefs } from '../../core/prefs'
import { accentInk } from '../../shared/contrast'
import { activeScheme } from '../../shared/palette-scheme'
import { loadBrandImages, readBrandImages, resetBrandImages, subscribeBrandImages } from '../../shared/custom-brand'
import { PALETTE_CARDS } from 'virtual:dsh-claude-style/generated'

/**
 * The custom brand layer (D97): the reader's own name, images and the colours
 * of the scheme they selected, over whichever brand is chosen.
 * Each part is written onto <body> only while the reader has supplied it — an
 * attribute the stylesheets switch on (brand.css, and the account avatar's rule
 * in account-footer.css) and the value as a custom property — so a reader who
 * supplied nothing gets the brand's own art and colours untouched. The one part
 * that stands without an image is the image-colour choice: it names the ink the
 * brand's own art is drawn in, so it writes --dsh-claude-logo-ink under either
 * brand (`accent` and `text` in the settings' row).
 *
 * The colours are seeds: the token sheet turns them into the whole palette at
 * runtime (scripts/build/theme-tokens.mjs), which is why they are written as
 * properties rather than resolved here. A seed the scheme does not carry falls
 * back to its base preset's value, so picking one colour keeps the rest of the
 * look.
 */

/** The custom properties written on <body>, read by the rules gated on the attributes. */
const MARK_PROPERTY = '--dsh-claude-custom-mark'
const WORD_PROPERTY = '--dsh-claude-custom-word'
const WORD_RATIO_PROPERTY = '--dsh-claude-custom-word-ratio'
const NAME_PROPERTY = '--dsh-claude-custom-name'
const ACCENT_PROPERTY = '--dsh-claude-custom-accent'
const ACCENT_INK_PROPERTY = '--dsh-claude-custom-accent-ink'
const CANVAS_LIGHT_PROPERTY = '--dsh-claude-custom-canvas-light'
const CANVAS_DARK_PROPERTY = '--dsh-claude-custom-canvas-dark'
const TEXT_LIGHT_PROPERTY = '--dsh-claude-custom-text-light'
const TEXT_DARK_PROPERTY = '--dsh-claude-custom-text-dark'
const CODE_LIGHT_PROPERTY = '--dsh-claude-custom-code-light'
const CODE_DARK_PROPERTY = '--dsh-claude-custom-code-dark'
const LINK_LIGHT_PROPERTY = '--dsh-claude-custom-link-light'
const LINK_DARK_PROPERTY = '--dsh-claude-custom-link-dark'
const SIDEBAR_LIGHT_PROPERTY = '--dsh-claude-custom-sidebar-light'
const SIDEBAR_DARK_PROPERTY = '--dsh-claude-custom-sidebar-dark'
const BUBBLE_LIGHT_PROPERTY = '--dsh-claude-custom-bubble-light'
const BUBBLE_DARK_PROPERTY = '--dsh-claude-custom-bubble-dark'
/** The ink the brand's own art and the reader's pictures take while the image-colour choice names the accent or the text colour. */
const LOGO_INK_PROPERTY = '--dsh-claude-logo-ink'
export const BRAND_PROPERTIES = [
  MARK_PROPERTY, WORD_PROPERTY, WORD_RATIO_PROPERTY, NAME_PROPERTY,
  ACCENT_PROPERTY, ACCENT_INK_PROPERTY, CANVAS_LIGHT_PROPERTY, CANVAS_DARK_PROPERTY, TEXT_LIGHT_PROPERTY, TEXT_DARK_PROPERTY, CODE_LIGHT_PROPERTY, CODE_DARK_PROPERTY, LINK_LIGHT_PROPERTY, LINK_DARK_PROPERTY,
  SIDEBAR_LIGHT_PROPERTY, SIDEBAR_DARK_PROPERTY, BUBBLE_LIGHT_PROPERTY, BUBBLE_DARK_PROPERTY, LOGO_INK_PROPERTY,
]
const ATTRIBUTES = [CUSTOM_MARK_ATTR, CUSTOM_WORD_ATTR, CUSTOM_TINT_ATTR, CUSTOM_PALETTE_ATTR, CUSTOM_EDGES_ATTR, BRAND_INK_ATTR]

/** A CSS string literal holding the text, for `content: var(...)`; a line break reads as a space. */
export function cssString(text: string) {
  return `"${text.replace(/[\\"]/g, '\\$&').replace(/[\n\r\f]/g, ' ')}"`
}

export function install() {
  const body = document.body

  const attribute = (name: string, value: string | null) => {
    if (value === null) body.removeAttribute(name)
    else if (body.getAttribute(name) !== value) body.setAttribute(name, value)
  }
  const property = (name: string, value: string | null) => {
    if (value === null) body.style.removeProperty(name)
    else if (body.style.getPropertyValue(name) !== value) body.style.setProperty(name, value)
  }

  function apply() {
    const prefs = readPrefs()
    const { mark, wordmark } = readBrandImages()
    const scheme = activeScheme(prefs)
    const custom = scheme !== undefined
    const card = PALETTE_CARDS.find((entry) => entry.id === (scheme?.base ?? BRAND_DEFAULT_PRESETS[prefs.brand])) ?? PALETTE_CARDS[0]
    const accent = scheme?.accent ?? card.accent
    // A preset's override keeps the sidebar and bubble colours the preset hand-tunes, per appearance, while its background is the preset's own.
    const kept = (appearance: 'light' | 'dark', tuned: { light: string, dark: string } | undefined) =>
      custom && scheme.id === scheme.base && scheme.background?.[appearance] === undefined ? (tuned?.[appearance] ?? null) : null
    attribute(CUSTOM_MARK_ATTR, mark === null ? null : '')
    property(MARK_PROPERTY, mark === null ? null : `url("${mark.url}")`)
    attribute(CUSTOM_WORD_ATTR, wordmark !== null ? CUSTOM_WORD_IMAGE : prefs.brandName !== '' ? CUSTOM_WORD_TEXT : null)
    property(WORD_PROPERTY, wordmark === null ? null : `url("${wordmark.url}")`)
    property(WORD_RATIO_PROPERTY, wordmark === null ? null : String(wordmark.ratio))
    property(NAME_PROPERTY, wordmark === null && prefs.brandName !== '' ? cssString(prefs.brandName) : null)
    const images = mark !== null || wordmark !== null
    attribute(CUSTOM_TINT_ATTR, prefs.brandInk !== BRAND_INK_ORIGINAL && images ? '' : null)
    attribute(BRAND_INK_ATTR, prefs.brandInk === BRAND_INK_ACCENT ? BRAND_INK_ACCENT : prefs.brandInk === BRAND_INK_TEXT ? BRAND_INK_TEXT : null)
    attribute(CUSTOM_PALETTE_ATTR, custom ? '' : null)
    property(ACCENT_PROPERTY, custom ? accent : null)
    property(ACCENT_INK_PROPERTY, custom ? accentInk(accent) : null)
    property(CANVAS_LIGHT_PROPERTY, custom ? (scheme.background?.light ?? card.canvas.light) : null)
    property(CANVAS_DARK_PROPERTY, custom ? (scheme.background?.dark ?? card.canvas.dark) : null)
    property(TEXT_LIGHT_PROPERTY, custom ? (scheme.text?.light ?? card.text.light) : null)
    property(TEXT_DARK_PROPERTY, custom ? (scheme.text?.dark ?? card.text.dark) : null)
    // A chip is drawn on the scheme's canvas, so an unpicked colour takes that scheme's own ink.
    property(CODE_LIGHT_PROPERTY, custom ? (scheme.code?.light ?? card.code.light) : null)
    property(CODE_DARK_PROPERTY, custom ? (scheme.code?.dark ?? card.code.dark) : null)
    // A link seed the scheme does not carry stays unwritten: the token sheet derives the link from the accent.
    property(LINK_LIGHT_PROPERTY, custom ? (scheme.link?.light ?? null) : null)
    property(LINK_DARK_PROPERTY, custom ? (scheme.link?.dark ?? null) : null)
    attribute(CUSTOM_EDGES_ATTR, custom ? (scheme.edges ?? card.edges) : null)
    property(SIDEBAR_LIGHT_PROPERTY, kept('light', card.sidebar))
    property(SIDEBAR_DARK_PROPERTY, kept('dark', card.sidebar))
    property(BUBBLE_LIGHT_PROPERTY, kept('light', card.bubble))
    property(BUBBLE_DARK_PROPERTY, kept('dark', card.bubble))
    // The art's ink is a sheet token; this choice sits above every palette block, so it is written inline.
    property(LOGO_INK_PROPERTY, prefs.brandInk === BRAND_INK_ACCENT
      ? 'var(--dsw-alias-brand-primary)'
      : prefs.brandInk === BRAND_INK_TEXT ? 'var(--dsw-alias-label-primary)' : null)
  }

  const offPrefs = subscribePrefs(apply)
  const offImages = subscribeBrandImages(apply)
  loadBrandImages()
  apply()

  return () => {
    offPrefs()
    offImages()
    resetBrandImages()
    for (const name of ATTRIBUTES) body.removeAttribute(name)
    for (const name of BRAND_PROPERTIES) body.style.removeProperty(name)
  }
}
