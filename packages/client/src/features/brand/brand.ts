import { BRAND_INK_ACCENT, BRAND_INK_ATTR, BRAND_INK_ORIGINAL, BRAND_INK_TEXT, CUSTOM_MARK_ATTR, CUSTOM_PALETTE_ATTR, CUSTOM_TINT_ATTR, CUSTOM_WORD_ATTR, CUSTOM_WORD_IMAGE, CUSTOM_WORD_TEXT, PALETTE_COLORING_CUSTOM } from '../../constants'
import { readPrefs, subscribePrefs } from '../../core/prefs'
import { loadBrandImages, readBrandImages, resetBrandImages, subscribeBrandImages } from '../../shared/custom-brand'
import { PALETTE_CARDS } from 'virtual:dsh-claude-style/generated'

/**
 * The custom brand layer (D30): the reader's own name, images and the four
 * colours of the colour card they authored, over whichever brand is chosen.
 * Each part is written onto <body> only while the reader has supplied it — an
 * attribute the stylesheets switch on (brand.css, and the account avatar's rule
 * in account-footer.css) and the value as a custom property — so a reader who
 * supplied nothing gets the brand's own art and colours untouched. The one part
 * that stands without an image is the image-colour choice: it names the ink the
 * brand's own art is drawn in, so it writes --dsh-claude-logo-ink under either
 * brand (`accent` and `text` in the settings' row).
 *
 * The four colours are seeds: the token sheet turns them into the whole palette
 * at runtime (scripts/build/theme-tokens.mjs), which is why they are written as
 * properties rather than resolved here. A seed the reader has not picked falls
 * back to the card's own value, so picking one colour keeps the rest of the
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
const CODE_LIGHT_PROPERTY = '--dsh-claude-custom-code-light'
const CODE_DARK_PROPERTY = '--dsh-claude-custom-code-dark'
/** The ink the brand's own art and the reader's pictures take while the image-colour choice names the accent or the text colour. */
const LOGO_INK_PROPERTY = '--dsh-claude-logo-ink'
const PROPERTIES = [
  MARK_PROPERTY, WORD_PROPERTY, WORD_RATIO_PROPERTY, NAME_PROPERTY,
  ACCENT_PROPERTY, ACCENT_INK_PROPERTY, CANVAS_LIGHT_PROPERTY, CANVAS_DARK_PROPERTY, CODE_LIGHT_PROPERTY, CODE_DARK_PROPERTY, LOGO_INK_PROPERTY,
]
const ATTRIBUTES = [CUSTOM_MARK_ATTR, CUSTOM_WORD_ATTR, CUSTOM_TINT_ATTR, CUSTOM_PALETTE_ATTR, BRAND_INK_ATTR]

/** The two inks text on an accent fill can take: the dark and the light canvas (docs/STYLE.md). */
const INK_DARK = '#191919'
const INK_LIGHT = '#faf9f5'

/** A CSS string literal holding the text, for `content: var(...)`; a line break reads as a space. */
export function cssString(text: string) {
  return `"${text.replace(/[\\"]/g, '\\$&').replace(/[\n\r\f]/g, ' ')}"`
}

/** WCAG relative luminance of a `#rrggbb` colour. */
function luminance(hex: string) {
  const [r, g, b] = [1, 3, 5].map(at => {
    const channel = parseInt(hex.slice(at, at + 2), 16) / 255
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** The ink that reads best on a `#rrggbb` accent fill: whichever canvas colour has the higher contrast with it. */
export function accentInk(accent: string) {
  const fill = luminance(accent)
  const contrast = (ink: string) => {
    const other = luminance(ink)
    return (Math.max(fill, other) + 0.05) / (Math.min(fill, other) + 0.05)
  }
  return contrast(INK_DARK) > contrast(INK_LIGHT) ? INK_DARK : INK_LIGHT
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
    const card = PALETTE_CARDS.find((entry) => entry.id === prefs.brand) ?? PALETTE_CARDS[0]
    const custom = prefs.paletteColors === PALETTE_COLORING_CUSTOM
    const accent = prefs.customAccent === '' ? card.accent : prefs.customAccent
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
    property(CANVAS_LIGHT_PROPERTY, custom ? (prefs.customCanvasLight === '' ? card.canvas.light : prefs.customCanvasLight) : null)
    property(CANVAS_DARK_PROPERTY, custom ? (prefs.customCanvasDark === '' ? card.canvas.dark : prefs.customCanvasDark) : null)
    // A chip is drawn on the scheme's canvas, so an unpicked colour takes that scheme's own ink.
    property(CODE_LIGHT_PROPERTY, custom ? (prefs.customCode === '' ? card.code.light : prefs.customCode) : null)
    property(CODE_DARK_PROPERTY, custom ? (prefs.customCode === '' ? card.code.dark : prefs.customCode) : null)
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
    for (const name of PROPERTIES) body.style.removeProperty(name)
  }
}
