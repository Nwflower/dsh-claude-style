/**
 * The measurement that decides whether a face really draws (D75): the page has no
 * truthful "is this font installed" answer — `document.fonts.check` reports true
 * for a family nothing declares — so the two-fallback width comparison stands in
 * its place. A name nothing provides leaves both fallbacks to draw the probe and
 * their advances differ; a name that resolves draws both the same.
 *
 * @capability font-presence
 * @features settings
 * @risk A family the page cannot draw reads as present, so the settings page stops reporting a missing face and the reader never learns the text is drawn in a look-alike.
 */
import { expect, test } from 'vitest'
import { familyResolves } from '@dsh-claude-style/client/pure'

test('a family nothing provides does not resolve', () => {
  expect(familyResolves(['__dsh-claude-absent-face__'])).toBe(false)
  expect(familyResolves(['__dsh-claude-absent-face__', '__dsh-claude-other-absent-face__'])).toBe(false)
})

test('a family the page can draw resolves, whichever of the listed names provides it', () => {
  // A generic family always draws, and it is not the fallback the probe names first.
  expect(familyResolves(['serif'])).toBe(true)
  expect(familyResolves(['__dsh-claude-absent-face__', 'serif'])).toBe(true)
})

test('the measurement needs no element in the document: the canvas lays nothing out', () => {
  const before = document.body.childElementCount
  familyResolves(['serif'])
  familyResolves(['__dsh-claude-absent-face__'])
  expect(document.body.childElementCount).toBe(before)
})
