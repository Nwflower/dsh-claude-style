/**
 * The home page's ripple field: a click starts waves that travel outward and
 * slow with distance, a click on the far side of the page leaves a ring already
 * in flight travelling as the click that started it set it, the waves die out
 * and leave the field flat, and a late frame advances them by a capped step so a
 * page shown again does not replay its absence.
 *
 * @capability home-ripple
 * @features home-ripple
 * @risk A click on the home page leaves the background rippling forever, burns frames after the waves have died, or bursts into a flash of motion when the reader returns to a hidden tab.
 */
import { expect, test } from 'vitest'
import fc from 'fast-check'
import { createWaveField } from '@dsh-claude-style/client/pure'

// How many cells a ring covers in a quarter second when it has slowed to the far end of its click's profile,
// against the ground the same click carries it over: the two differ by the ratio of the profile's two speeds.
const FAR_SHARE = 0.05

const COLUMNS = 160
const ROWS = 70
const CENTRE_COLUMN = 80
const CENTRE_ROW = 35

/** A field whose noise seed and click profiles come from one fixed sequence, so a sampled weak click cannot decide a timing check. */
function createWaves() {
  let state = 0x9e3779b9
  return createWaveField(COLUMNS, ROWS, () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0
    return state / 0x100000000
  })
}

/** How many cells to the right of the centre the farthest cell above `level` lies on the centre row. */
function reach(height: Float32Array, level: number) {
  let far = 0
  for (let column = CENTRE_COLUMN + 1; column < COLUMNS; column++) {
    if (Math.abs(height[CENTRE_ROW * COLUMNS + column]!) > level) far = column - CENTRE_COLUMN
  }
  return far
}

/** The outermost cell of the ring a click at the centre started, wherever the noise moved the ring's crest to. */
function front(height: Float32Array) {
  return reach(height, 0.0005)
}

test('a field nobody has clicked stays flat and at rest', () => {
  const waves = createWaves()
  waves.advance(0.05)
  expect(waves.active()).toBe(false)
  expect(waves.height.every(value => value === 0)).toBe(true)
})

test('a click starts waves that travel outward, slowing with distance', () => {
  const waves = createWaves()
  waves.disturb(CENTRE_COLUMN, CENTRE_ROW)
  expect(waves.active()).toBe(true)
  for (let frame = 0; frame < 15; frame++) waves.advance(1 / 60)
  const early = reach(waves.height, 0.05)
  for (let frame = 0; frame < 15; frame++) waves.advance(1 / 60)
  const late = reach(waves.height, 0.05)
  // A quarter second carries the first ring past a hundred pixels of the page (seven-pixel cells).
  expect(early).toBeGreaterThan(14)
  expect(late).toBeGreaterThan(early)
  // The second quarter second covers less ground than the first: the speed fell with the distance.
  expect(late - early).toBeLessThan(early)
  expect(waves.height.every(Number.isFinite)).toBe(true)
})

test('a click on the far side of the page does not slow a ring already in flight', () => {
  // 种子固定的那一份：不传种子的场次把噪声交给 Math.random，量出来的行程会在这条
  // 判定线两侧来回，同一次提交在不同机器上给出相反的结论。
  const alone = createWaves()
  const followed = createWaves()
  for (const waves of [alone, followed]) {
    waves.disturb(CENTRE_COLUMN, CENTRE_ROW)
    for (let frame = 0; frame < 15; frame++) waves.advance(1 / 60)
  }
  const early = front(alone.height)
  // The later click lands in the opposite corner, away from the row the ring is measured on. The half second that
  // follows lets a slowed ring fall behind far enough to see it, and two steps then let the field's front settle
  // and shed the noise that the border's damping leaves under it.
  followed.advance(1 / 600)
  followed.disturb(4, 4)
  for (let frame = 0; frame < 30; frame++) {
    alone.advance(1 / 60)
    followed.advance(1 / 60)
  }
  const free = front(alone.height) - early
  alone.advance(2 / 600)
  followed.advance(2 / 600)
  const late = front(followed.height)
  // The ring travels on the curve of the click that started it, so a click elsewhere leaves the ground it covers
  // nearly as it was. A click that reset the speeds to those around itself would hold the ring to the far end of
  // that curve, and the ground it covers over the same half second would fall to a fraction of the ring's own.
  expect(late - early, `early=${early} late=${late} alone=${free}`).toBeGreaterThan(free / 2)
  expect(free).toBeGreaterThan(early * FAR_SHARE)
})

test('the waves die out and the field comes to rest', () => {
  const waves = createWaves()
  waves.disturb(CENTRE_COLUMN, CENTRE_ROW)
  for (let frame = 0; frame < 60 * 8; frame++) waves.advance(1 / 60)
  expect(waves.active()).toBe(false)
  expect(waves.height.every(value => value === 0)).toBe(true)
})

test('a late frame advances the waves by at most the cap, so a hidden page does not replay its absence', () => {
  const waves = createWaves()
  waves.disturb(CENTRE_COLUMN, CENTRE_ROW)
  waves.advance(60)
  // Sixty seconds replayed would have brought the field to rest; a capped advance leaves the waves moving.
  expect(waves.active()).toBe(true)
})

test('clicks anywhere on the field, at any frame rate, keep every height finite and bounded', () => {
  const click = fc.tuple(fc.integer({ min: 0, max: COLUMNS - 1 }), fc.integer({ min: 0, max: ROWS - 1 }))
  fc.assert(fc.property(fc.array(click, { minLength: 1, maxLength: 4 }), fc.constantFrom(1 / 30, 1 / 60, 1 / 144), (clicks, frame) => {
    const waves = createWaves()
    for (const [column, row] of clicks) waves.disturb(column, row)
    for (let elapsed = 0; elapsed < 2; elapsed += frame) waves.advance(frame)
    expect(waves.height.every(value => Number.isFinite(value) && Math.abs(value) < 10)).toBe(true)
  }), { numRuns: 12 })
})
