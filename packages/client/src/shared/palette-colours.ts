import { PALETTE_CARDS } from 'virtual:dsh-claude-style/generated'
import { linearChannel } from './contrast'
import type { PaletteScheme } from '@dsh-claude-style/contracts/palette-schemes'

/**
 * The colours a scheme draws as values (D97): its own seeds over the colour card
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

/**
 * sRGB → OKLch through Ottosson's published OKLab matrix, the same conversion the
 * build's palette ladder resolves seeds with (culori, scripts/build/theme-tokens.mjs).
 * Pure arithmetic rather than culori in the page: the build's import-cycle gate
 * refuses culori's own modes/converter cycle inside the bundle.
 */
function oklchOf(hex: string) {
  const [r, g, b] = [1, 3, 5].map(at => linearChannel(hex, at))
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
  const lightness = 0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s
  const a = 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s
  const b2 = 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s
  const chroma = Math.hypot(a, b2)
  const hue = chroma === 0 ? 0 : (Math.atan2(b2, a) * 180 / Math.PI + 360) % 360
  return { l: lightness, c: chroma, h: hue }
}

/**
 * A seed as an oklch colour naming its hue outright. A relative colour copying
 * `h` from a hex seed loses the hue on a low-chroma canvas: the browser reads the
 * hex's oklch hue as powerless, and every rung derived from it falls to hue 0 —
 * a warm cream sidebar painting pink. Carrying the hue keeps the ladder on the
 * seed's own warmth (D97).
 */
export function oklchSeed(hex: string): string {
  const { l, c, h } = oklchOf(hex)
  const round = (value: number, places: number) => Number(value.toFixed(places))
  return `oklch(${round(l, 5)} ${round(c, 5)} ${round(h, 2)})`
}

/** One colour of a scheme in both appearances; `link` is undefined where the page derives it from the accent. */
export interface SchemeColours {
  accent: string
  background: { light: string, dark: string }
  text: { light: string, dark: string }
  code: { light: string, dark: string }
  link: { light?: string, dark?: string }
}

/** Stored schemes derive missing links from the accent; a static preset retains its hand-tuned links (D97). */
export function schemeColours(scheme: PaletteScheme, staticPreset = false): SchemeColours {
  const card = presetCard(scheme.base)
  return {
    accent: scheme.accent ?? card.accent,
    background: { light: scheme.background?.light ?? card.canvas.light, dark: scheme.background?.dark ?? card.canvas.dark },
    text: { light: scheme.text?.light ?? card.text.light, dark: scheme.text?.dark ?? card.text.dark },
    code: { light: scheme.code?.light ?? card.code.light, dark: scheme.code?.dark ?? card.code.dark },
    link: { light: scheme.link?.light ?? (staticPreset ? card.link?.light : undefined), dark: scheme.link?.dark ?? (staticPreset ? card.link?.dark : undefined) },
  }
}
