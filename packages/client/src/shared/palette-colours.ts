import { PALETTE_CARDS } from 'virtual:dsh-claude-style/generated'
import type { PaletteScheme } from '@dsh-claude-style/contracts/palette-schemes'

/**
 * The colours a scheme draws as values (D96): its own seeds over the colour card
 * of the preset it starts from. Kept apart from the records' own module
 * (palette-scheme.ts) because the cards are a generated module the preference
 * path does not load.
 */

/** The preset's colour card, which holds the values a record falls back to. */
export function presetCard(preset: string) {
  const card = PALETTE_CARDS.find((entry) => entry.id === preset)
  if (card === undefined) throw new Error(`the palette carries no ${preset} card`)
  return card
}

/** One colour of a scheme in both appearances; `link` is undefined where the page derives it from the accent. */
export interface SchemeColours {
  accent: string
  background: { light: string, dark: string }
  code: { light: string, dark: string }
  link: { light?: string, dark?: string }
}

/** Stored schemes derive missing links from the accent; a static preset retains its hand-tuned links (D96). */
export function schemeColours(scheme: PaletteScheme, staticPreset = false): SchemeColours {
  const card = presetCard(scheme.base)
  return {
    accent: scheme.accent ?? card.accent,
    background: { light: scheme.background?.light ?? card.canvas.light, dark: scheme.background?.dark ?? card.canvas.dark },
    code: { light: scheme.code?.light ?? card.code.light, dark: scheme.code?.dark ?? card.code.dark },
    link: { light: scheme.link?.light ?? (staticPreset ? card.link?.light : undefined), dark: scheme.link?.dark ?? (staticPreset ? card.link?.dark : undefined) },
  }
}
