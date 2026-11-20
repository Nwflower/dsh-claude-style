/** palette-checks.mjs — the colour cards against the preset and brand vocabulary, the contrast every preset owes its canvas, and the page's derived-link resolution against the build's own (D97). */
import { parse, wcagContrast } from 'culori'
import { loadModule } from '../shared/ts-module.mjs'
import { cardLink } from './theme-tokens.mjs'

// The editor's contrast read-out answers the same question with the same least values.
const { PALETTE_TEXT_CONTRAST: TEXT_CONTRAST, PALETTE_ACCENT_CONTRAST: ACCENT_CONTRAST } = loadModule('packages/contracts/src/palette-schemes.ts')
// The page resolves a derived link with its own oklch arithmetic; the build holds it to culori's resolution of the same step.
const { linkFromAccent } = loadModule('packages/client/src/shared/oklch.ts')
const SCHEMES = ['light', 'dark']

/**
 * The cards and the vocabulary that names them agree: one card per preset id
 * with none repeated, and every brand paints a default preset that exists.
 * @param doc the token document
 * @param vocabulary `{ presets, brands, brandDefaults }` from packages/contracts/src/prefs.ts
 */
export function checkPaletteCards(doc, vocabulary) {
  const problems = []
  const ids = doc.palette.cards.map((card) => card.id)
  for (const id of new Set(ids.filter((id, at) => ids.indexOf(id) !== at))) problems.push(`the colour card "${id}" stands twice`)
  for (const id of ids) {
    if (!vocabulary.presets.includes(id)) problems.push(`the colour card "${id}" is no preset in PALETTE_PRESETS`)
  }
  for (const id of vocabulary.presets) {
    if (!ids.includes(id)) problems.push(`the preset "${id}" has no colour card`)
  }
  for (const brand of vocabulary.brands) {
    const preset = vocabulary.brandDefaults[brand]
    if (preset === undefined) problems.push(`the brand "${brand}" has no default preset in BRAND_DEFAULT_PRESETS`)
    else if (!ids.includes(preset)) problems.push(`the brand "${brand}" defaults to "${preset}", which has no colour card`)
  }
  for (const brand of Object.keys(vocabulary.brandDefaults)) {
    if (!vocabulary.brands.includes(brand)) problems.push(`BRAND_DEFAULT_PRESETS names "${brand}", which is no brand`)
  }
  if (problems.length > 0) throw new Error(`build: the palette cards and their vocabulary disagree:\n  ${problems.join('\n  ')}`)
}

/**
 * Every preset draws legibly on its own canvas, in both appearances: its inline
 * code and its link colour at the text contrast, its accent at the accent
 * contrast.
 */
export function checkPaletteContrast(doc) {
  const problems = []
  for (const card of doc.palette.cards) {
    for (const scheme of SCHEMES) {
      const canvas = card.canvas[scheme]
      const reads = [
        ['text', card.text[scheme], TEXT_CONTRAST],
        ['inline code', card.code[scheme], TEXT_CONTRAST],
        ['link', cardLink(card, scheme), TEXT_CONTRAST],
        ['accent', card.accent, ACCENT_CONTRAST],
      ]
      for (const [what, colour, least] of reads) {
        const contrast = wcagContrast(parse(colour), parse(canvas))
        if (contrast < least) problems.push(`the "${card.id}" card's ${what} ${colour} on its ${scheme} canvas ${canvas} reads ${contrast.toFixed(2)}:1, under the ${least}:1 it owes`)
      }
    }
  }
  if (problems.length > 0) throw new Error(`build: a palette card is hard to read on its own canvas:\n  ${problems.join('\n  ')}`)
}

/** One `#rrggbb` as its three channels. */
function channels(hex) {
  return [1, 3, 5].map(at => parseInt(hex.slice(at, at + 2), 16))
}

/**
 * The link the page derives for a scheme without a link seed is the link the
 * build resolves: the client's oklch arithmetic and culori's formatHex over the
 * same lightness step, to a channel of rounding.
 */
export function checkLinkResolution(doc) {
  const problems = []
  const accents = [...doc.palette.cards.map((card) => card.accent), '#1e88e5', '#e53935', '#161616', '#fdfdfd', '#000000', '#ffffff']
  for (const accent of accents) {
    for (const scheme of SCHEMES) {
      const page = channels(linkFromAccent(accent, scheme))
      const build = channels(cardLink({ accent }, scheme))
      if (page.some((channel, at) => Math.abs(channel - build[at]) > 1)) {
        problems.push(`the ${scheme} link of ${accent} resolves to ${linkFromAccent(accent, scheme)} in the page but ${cardLink({ accent }, scheme)} in the build`)
      }
    }
  }
  if (problems.length > 0) throw new Error(`build: the page and the build derive different links:\n  ${problems.join('\n  ')}`)
}
