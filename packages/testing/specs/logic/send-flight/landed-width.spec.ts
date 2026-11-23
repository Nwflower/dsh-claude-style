/**
 * The landed stand-in is as wide as the words it holds.
 *
 * The flight takes off while the row is still growing, so the row it flies to is
 * narrower than the message it will hold. The shell's width at the end of the
 * flight must be the width the words were laid out at, or the shell clips them and
 * its own corner reads tighter than the bubble's on a box narrower than the message.
 *
 * The clamp that keeps the drawn shape inside the column is a distance from the
 * take-off edge, so it has to be read the same way at every displacement: a flight
 * that travels right, left, or not at all must land on the same whole shape.
 *
 * @capability send-flight
 * @features chat-send
 * @risk The landed stand-in is narrower than the words inside it, so the last line is clipped, its corner reads tighter than the bubble's, or the shape collapses during the flight.
 */
import { expect, test } from 'vitest'
import { CHAT_SHAPE_SAMPLES, chatSendSamples } from '@dsh-claude-style/client/pure'

const INSETS = { left: 16, top: 10, right: 16, lineHeight: 22 }

test('the last sample is as wide as the words it holds', () => {
  const start = new DOMRect(0, 0, 712, 73)
  const end = new DOMRect(0, 200, 272.44, 44.09)
  // The width the row settles at, wider than the row the flight took off from.
  const settled = 284.48
  const samples = chatSendSamples(start, end, INSETS, INSETS, 712, 73, settled, 44.09, 18, 20, 0)
  expect(samples).toHaveLength(CHAT_SHAPE_SAMPLES + 1)
  const last = samples.at(-1)!
  expect(last.m).toBe(1)
  expect(last.width).toBeCloseTo(settled, 6)
  expect(last.visible).toBeCloseTo(settled, 6)
})

test('the shape lands whole wherever the flight starts', () => {
  // The displacement is a horizontal distance, so the same message must land on
  // the same shape whether the composer sat left of, right of, or on the row.
  const settled = 284.48
  const end = new DOMRect(150, 200, 272.44, 44.09)
  const broken: string[] = []
  for (const startLeft of [0, 50, 150, 400, 900]) {
    const start = new DOMRect(startLeft, 0, 712, 73)
    const dx = end.left - start.left
    const samples = chatSendSamples(start, end, INSETS, INSETS, 712, 73, settled, 44.09, 18, 20, dx)
    const last = samples.at(-1)!
    if (Math.abs(last.visible - settled) > 0.01) {
      broken.push(`start ${startLeft}: landed visible ${last.visible}, settled ${settled}`)
    }
  }
  expect(broken).toEqual([])
})

test('the drawn shape never collapses on the way in', () => {
  // A shape that narrows to nothing part way through reads as the flight vanishing.
  // The clamp is what stops that, and it only has room to act when the flight is
  // short enough to stay on one screen — a displacement past the column is the
  // clamp doing its job, and the flight is skipped before it starts
  // (send-flight.ts's sameScreen).
  const settled = 284.48
  const end = new DOMRect(150, 200, 272.44, 44.09)
  const broken: string[] = []
  for (const startLeft of [0, 50, 150, 400]) {
    const start = new DOMRect(startLeft, 0, 712, 73)
    const dx = end.left - start.left
    const samples = chatSendSamples(start, end, INSETS, INSETS, 712, 73, settled, 44.09, 18, 20, dx)
    for (const sample of samples) {
      if (sample.visible > sample.width + 1e-9) broken.push(`start ${startLeft}: visible past width`)
      if (sample.visible < 0) broken.push(`start ${startLeft}: negative visible`)
      if (sample.m > 0.5 && sample.visible < 712 * 0.05) {
        broken.push(`start ${startLeft} at m=${sample.m.toFixed(2)}: visible ${sample.visible}`)
      }
    }
  }
  expect(broken).toEqual([])
})
