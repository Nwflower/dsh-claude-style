/** palette-checks.mjs — the colour cards against the preset and brand vocabulary, and against the contrast every preset owes its canvas (D96). */
import { parse, wcagContrast } from 'culori'
import { loadModule } from '../shared/ts-module.mjs'
import { cardLink } from './theme-tokens.mjs'

// The editor's contrast read-out answers the same question with the same least values.
const { PALETTE_TEXT_CONTRAST: TEXT_CONTRAST, PALETTE_ACCENT_CONTRAST: ACCENT_CONTRAST } = loadModule('packages/contracts/src/palette-schemes.ts')
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
