/**
 * The link a scheme without a link seed paints (D97): the editor's read-out
 * resolves the accent's lightness step to the colour the page paints through
 * the token sheet's relative colour, out-of-gamut channels clamped as the
 * browser paints them. The build holds the same resolution to culori
 * (scripts/build/palette-checks.mjs).
 *
 * @capability custom-brand
 * @features settings, brand
 * @risk The editor shows a link colour the page does not paint, or a derived link hides the contrast it reads at.
 */
import { expect, test } from 'vitest'
import { linkFromAccent, readColour } from '@dsh-claude-style/client/pure'
import { PALETTE_LINK_SHIFT } from '@dsh-claude-style/contracts/palette-schemes'

const APPEARANCES = ['light', 'dark'] as const
const ACCENTS = ['#d97757', '#4d6bfe', '#b5673a', '#3f8f6f', '#8a6ae6', '#d4577c', '#e53935', '#1e88e5', '#161616', '#fdfdfd']

test('the resolved link is the colour the page paints for the same step', () => {
  for (const accent of ACCENTS) {
    for (const appearance of APPEARANCES) {
      const dl = PALETTE_LINK_SHIFT[appearance]
      const relative = `oklch(from ${accent} calc(l ${dl > 0 ? '+' : '-'} ${Math.abs(dl)}) c h)`
      const probe = document.createElement('span')
      probe.style.color = relative
      document.body.appendChild(probe)
      const painted = getComputedStyle(probe).color
      probe.remove()
      const want = readColour(linkFromAccent(accent, appearance))
      const got = readColour(painted)
      expect(want).not.toBeNull()
      expect(got).not.toBeNull()
      for (let at = 0; at < 3; at += 1) {
        expect(Math.abs(got![at] - want![at]), `${accent} ${appearance} channel ${at}: painted ${got} resolved ${want}`).toBeLessThanOrEqual(1)
      }
    }
  }
})

test('the lightness step clamps at the ends of the axis', () => {
  expect(linkFromAccent('#000000', 'light')).toBe('#000000')
  expect(linkFromAccent('#ffffff', 'dark')).toBe('#ffffff')
})
