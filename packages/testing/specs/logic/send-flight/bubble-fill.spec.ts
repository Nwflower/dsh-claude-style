/**
 * The fill a message row is read by: the bubble the reader's own row paints,
 * found from the colour the page computed for it — the host's `rgb()` fill, or
 * a card's token and a reader's custom palette, which the page states as a
 * literal or as a relative colour (D97).
 *
 * @capability send-flight
 * @features chat-send
 * @risk A reader with their own palette loses the bubble their sent message takes off from, and the stand-in reads the card's empty frame instead.
 */
import { expect, test } from 'vitest'
import { FLOW_KIND_ATTRIBUTE, USER_ROW_KIND } from '@dsh-claude-style/contracts/dom'
import { colorAlpha, colorParts, userBubble } from '@dsh-claude-style/engine/chat-dom'

/** A settled user row holding one child, painted with `background`. */
function row(background: string) {
  const row = document.createElement('div')
  row.setAttribute(FLOW_KIND_ATTRIBUTE, USER_ROW_KIND)
  const bubble = document.createElement('div')
  bubble.style.backgroundColor = background
  row.appendChild(bubble)
  document.body.appendChild(row)
  return { row, bubble }
}

test('a bubble is found from the fill the host states as rgb()', () => {
  const { row: settled, bubble } = row('rgb(244, 242, 243)')
  expect(userBubble(settled)).toBe(bubble)
  settled.remove()
})

test('a bubble is found from the relative colour a reader\'s palette derives', () => {
  const { row: settled, bubble } = row('oklch(from #ffffff calc(l - .037) calc(c + .002) h)')
  expect(userBubble(settled)).toBe(bubble)
  settled.remove()
})

test('a fill the page paints only partly still counts, and one it paints not at all does not', () => {
  // The dark card's bubble is a 6% ink over the canvas.
  expect(colorAlpha('oklch(0.5 0.01 20 / 0.06)')).toBeGreaterThan(0)
  expect(colorAlpha('rgba(0, 0, 0, 0)')).toBe(0)
  expect(colorAlpha('#fffff')).toBe(0)
  const { row: settled } = row('rgba(0, 0, 0, 0)')
  expect(userBubble(settled)).toBeNull()
  settled.remove()
})

test('an unreadable colour has no channels, so no rule reads it as a fill', () => {
  expect(colorParts('#fffff')).toBeNull()
  expect(colorParts('var(--probe-unset)')).toBeNull()
  expect(colorParts('rgb(244, 242, 243)')).toEqual([244, 242, 243])
})
