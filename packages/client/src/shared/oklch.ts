import { linearChannel } from './contrast'
import { PALETTE_LINK_SHIFT } from '@dsh-claude-style/contracts/palette-schemes'

/**
 * OKLch arithmetic for the palette ladder (D97): the seed form the brand layer
 * writes, and the resolved link a scheme without a link seed paints. Pure
 * arithmetic rather than culori in the page: the build's import-cycle gate
 * refuses culori's own modes/converter cycle inside the bundle. The matrices
 * are Ottosson's published OKLab ones, the same the build resolves with.
 */

/** sRGB → OKLch through the published OKLab matrix. */
export function oklchOf(hex: string) {
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

/**
 * OKLch → `#rrggbb` through the inverse of oklchOf's OKLab matrix, channels
 * clamped and rounded the way the build's formatHex does and the page's browser
 * paints an out-of-gamut relative colour, so a resolved read-out is the value
 * the page shows (culori, scripts/build/theme-tokens.mjs).
 */
function hexOfOklch(lightness: number, chroma: number, hue: number) {
  const radian = hue * Math.PI / 180
  const a = chroma * Math.cos(radian)
  const b = chroma * Math.sin(radian)
  const l = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s = (lightness - 0.0894841775 * a - 1.2914855480 * b) ** 3
  const linear = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s,
  ]
  return '#' + linear.map((channel) => {
    const clamped = Math.min(1, Math.max(0, channel))
    const srgb = clamped <= 0.0031308 ? 12.92 * clamped : 1.055 * clamped ** (1 / 2.4) - 0.055
    return Math.round(srgb * 255).toString(16).padStart(2, '0')
  }).join('')
}

/**
 * The link a scheme without a link seed paints: its accent moved along its own
 * lightness axis by the step the token sheet derives with (D97), resolved to the
 * colour the page paints. The editor and the discs read this value instead of
 * the accent it comes from.
 */
export function linkFromAccent(accent: string, appearance: 'light' | 'dark') {
  const { l, c, h } = oklchOf(accent)
  return hexOfOklch(Math.min(1, Math.max(0, l + PALETTE_LINK_SHIFT[appearance])), c, h)
}
