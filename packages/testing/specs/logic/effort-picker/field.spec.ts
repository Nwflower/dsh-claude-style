/**
 * The effort field's choreography as numbers: the grid solved in device pixels,
 * the scatter that gives every block its own phase, the three envelopes on the
 * stylesheet's keyframe stops, and the colour each block ends at. The canvas
 * paints what these answer, so the timing a reader sees is checked here with no
 * page at all.
 *
 * @capability effort-picker
 * @features effort
 * @risk The field's blocks fire in step so the dots pulse as one, an envelope runs off its keyframe stops so the flash or the stream never reaches its peak or never goes out, or a block is painted outside the canvas or in a colour the theme's accent does not mix to.
 */
import { expect, test } from 'vitest'
import {
  BAND_H, FLASH_S, FLOW_S, SURFACE_S, arrivalGlow, arrivalPhase, arrivalRise, cellFade, cellUnit,
  composeBlockColour, flashAt, flashEnvelope, flowAt, flowEnvelope, flowStrength, solveField,
} from '@dsh-claude-style/client/pure'
import type { Channels, FieldBlock } from '@dsh-claude-style/client/pure'

/** One block of a solved grid, for the envelope tests. */
function blockOf(overrides: Partial<FieldBlock> = {}): FieldBlock {
  return {
    x: 0, y: 0, size: 8, peak: 0.5, flashDelay: 0, flashDur: FLASH_S,
    entrance: 0, flowOffset: 0, flowStrength: 1, fade: 1,
    ...overrides,
  }
}

test('the grid fills the groove without straddling a device pixel', () => {
  const grid = solveField(472, 2)
  expect(grid.widthDev).toBe(472)
  expect(grid.heightDev).toBe(Math.round(BAND_H * 2))
  expect(new Set(grid.blocks.map((block) => block.y)).size).toBe(5)
  for (const block of grid.blocks) {
    expect(Number.isInteger(block.x)).toBe(true)
    expect(Number.isInteger(block.y)).toBe(true)
    expect(block.size).toBeGreaterThanOrEqual(3)
    expect(block.x + block.size).toBeLessThanOrEqual(grid.widthDev)
    expect(block.y + block.size).toBeLessThanOrEqual(grid.heightDev)
  }
  // A wider track adds columns and keeps the rows; the blocks stay square.
  const wide = solveField(944, 2)
  expect(wide.blocks.length).toBeGreaterThan(grid.blocks.length)
  expect(new Set(wide.blocks.map((block) => block.size)).size).toBe(1)
})

test('neighbouring blocks never fire in step', () => {
  const grid = solveField(472, 2)
  const delays = grid.blocks.map((block) => block.flashDelay)
  // No two blocks share a phase.
  expect(new Set(delays).size).toBe(delays.length)
  // A block never advances in step with its right-hand neighbour: the gaps
  // between adjacent columns change sign, which a linear lattice cannot do.
  const cols = grid.blocks.length / 5
  const gaps: number[] = []
  for (let at = 1; at < delays.length; at += 1) {
    if (at % cols === 0) continue
    gaps.push(Math.sign(delays[at] - delays[at - 1]))
  }
  expect(gaps.filter((gap) => gap > 0).length).toBeGreaterThan(gaps.length * 0.2)
  expect(gaps.filter((gap) => gap < 0).length).toBeGreaterThan(gaps.length * 0.2)
  // Every block keeps its own peak inside the stylesheet's 38–60% flash share.
  for (const block of grid.blocks) expect(block.peak).toBeGreaterThanOrEqual(0.38)
  for (const block of grid.blocks) expect(block.peak).toBeLessThanOrEqual(0.6)
  // The plume dissolves at the bare end and is solid at the nozzle.
  expect(cellFade(0)).toBe(0)
  expect(cellFade(0.8)).toBe(1)
  for (const block of grid.blocks) expect(block.flowStrength).toBeGreaterThanOrEqual(0.04)
})

test('the flash follows its keyframe stops', () => {
  expect(flashEnvelope(0)).toBe(0)
  expect(flashEnvelope(0.13)).toBe(0)
  expect(flashEnvelope(0.2)).toBe(1)
  expect(flashEnvelope(0.34)).toBe(1)
  expect(flashEnvelope(0.99)).toBeLessThan(0.01)
  // The window rises and falls without going back on itself.
  let previous = 0
  for (let at = 0.14; at <= 0.2; at += 0.005) {
    const value = flashEnvelope(at)
    expect(value).toBeGreaterThanOrEqual(previous - 1e-9)
    previous = value
  }
  const block = blockOf({ flashDur: FLASH_S, flashDelay: FLASH_S * 0.5 })
  expect(flashAt(block, 0)).toBeGreaterThanOrEqual(0)
  expect(flashAt(block, 0)).toBeLessThanOrEqual(block.peak)
})

test('the arrival rises on the surface duration and the glow rides it once', () => {
  const block = blockOf({ entrance: 0.25 })
  expect(arrivalRise(arrivalPhase(0.2, block.entrance))).toBe(0)
  expect(arrivalGlow(arrivalPhase(0.2, block.entrance))).toBe(0)
  expect(arrivalRise(arrivalPhase(0.25 + SURFACE_S, block.entrance))).toBe(1)
  expect(arrivalGlow(arrivalPhase(0.25 + SURFACE_S, block.entrance))).toBe(0)
  expect(arrivalGlow(0.3)).toBeCloseTo(0.9, 6)
  expect(arrivalGlow(0.3)).toBeGreaterThan(arrivalGlow(0.1))
})

test('the stream flashes for a short window once a pass', () => {
  expect(flowEnvelope(0, 0.5)).toBe(0)
  expect(flowEnvelope(0.03, 0.5)).toBeCloseTo(0.5 * 0.95, 6)
  expect(flowEnvelope(0.06, 0.5)).toBe(0)
  expect(flowEnvelope(0.5, 0.5)).toBe(0)
  const block = blockOf({ flowOffset: FLOW_S * 0.5, flowStrength: 0.5 })
  expect(flowAt(block, 0)).toBeGreaterThanOrEqual(0)
  expect(flowAt(block, 0)).toBeLessThanOrEqual(0.5 * 0.95)
  // One period later the same phase comes back round.
  expect(flowAt(block, FLOW_S)).toBeCloseTo(flowAt(block, 0), 6)
})

test('a block mixes to the theme accent, its peak, and the lighter tone over both', () => {
  const accent: Channels = [10, 20, 30]
  const flash: Channels = [200, 210, 220]
  const out: Channels = [0, 0, 0]
  expect(composeBlockColour(accent, flash, 0, 0, 0, out)).toEqual([10, 20, 30])
  expect(composeBlockColour(accent, flash, 1, 0, 0, out)).toEqual([200, 210, 220])
  // The glow and the stream carry the same tone: half of each leaves a quarter
  // of the block uncovered, which is what the second layer's opacity means.
  expect(composeBlockColour(accent, flash, 0, 0.5, 0.5, out)).toEqual([152.5, 162.5, 172.5])
  expect(composeBlockColour(accent, flash, 0, 1, 0, out)).toEqual([200, 210, 220])
  const half = composeBlockColour(accent, flash, 0.5, 0, 0, out).slice()
  expect(half[0]).toBeCloseTo(105, 6)
})
