/**
 * WCAG contrast between `#rrggbb` colours: what the accent's ink is picked by
 * (features/brand/brand.ts) and what the scheme editor reads out beside each
 * colour (features/settings/palette-editor.ts). The build's own check of the
 * presets answers the same question with culori (scripts/build/palette-checks.mjs).
 */

/** WCAG relative luminance of a `#rrggbb` colour. */
export function luminance(hex: string) {
  const [r, g, b] = [1, 3, 5].map(at => {
    const channel = parseInt(hex.slice(at, at + 2), 16) / 255
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** The contrast ratio of two `#rrggbb` colours, from 1 to 21. */
export function contrastRatio(first: string, second: string) {
  const one = luminance(first)
  const other = luminance(second)
  return (Math.max(one, other) + 0.05) / (Math.min(one, other) + 0.05)
}
