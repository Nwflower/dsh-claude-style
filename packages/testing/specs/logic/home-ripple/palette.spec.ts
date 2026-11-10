/**
 * The two inks the new-conversation page's glyph field is drawn with: a theme
 * token becomes channels through the painted pixel, so a reader's own palette —
 * whose tokens the page states as relative colours over their canvas (D30) —
 * paints the field the way a card's literal does.
 *
 * @capability home-ripple
 * @features home-ripple
 * @risk A reader with their own palette gets no glyph field at all, and the console fills with a colour the field cannot read.
 */
import { expect, test } from 'vitest'
import { readColour } from '@dsh-claude-style/client/pure'

test('every form the browser reads as one colour comes out as the same channels', () => {
  const literal = readColour('#3b6ef0')
  expect(literal).toEqual([59, 110, 240])
  expect(readColour('rgb(59, 110, 240)')).toEqual(literal)
  expect(readColour('color(srgb 0.231 0.431 0.941)')).toEqual(literal)
})

test('the relative colour a reader\'s palette derives resolves to the channels the page paints', () => {
  // The step the tone table takes for --dsh-claude-ripple-ink over a white canvas
  // (scripts/build/theme-tokens.mjs): the form the field used to refuse.
  const derived = 'oklch(from #ffffff calc(l - .365) calc(c + .011) h)'
  const probe = document.createElement('span')
  probe.style.color = derived
  document.body.appendChild(probe)
  const painted = getComputedStyle(probe).color
  probe.remove()
  const channels = readColour(derived)
  expect(channels).not.toBeNull()
  expect(readColour(painted)).toEqual(channels)
})

test('a value the canvas cannot paint, or paints see-through, has no channels', () => {
  expect(readColour('#fffff')).toBeNull()
  expect(readColour('var(--probe-unset)')).toBeNull()
  expect(readColour('rgba(59, 110, 240, 0.5)')).toBeNull()
})

test('a value it cannot paint leaves no earlier colour behind it', () => {
  expect(readColour('#3b6ef0')).toEqual([59, 110, 240])
  expect(readColour('#fffff')).toBeNull()
})
