/**
 * The host's floating layer in a page drawn at a scale (D43, D81): a card the host
 * positioned from a measurement is drawn where its own numbers put it, in a space
 * one pixel to one pixel with the window, and the teardown hands every card back.
 *
 * @capability page-scale
 * @features engine
 * @risk At a page scale other than 100% every card the host draws lands off the row it belongs to by the factor of the scale, and a menu placed from its own height overlaps the control it opens over by that height's share of the scale.
 */
import { afterEach, expect, test } from 'vitest'
import { counterScale, installScaledLayer } from '@dsh-claude-style/engine/scaled-layer'
import type { PageScaleVocabulary } from '@dsh-claude-style/engine/scaled-layer'
import { after, drawnAt, drawnScale, resetPage, settle } from './drawn-page'

const vocabulary: PageScaleVocabulary = {
  isOwn: node => node.classList.contains('own'),
  scale: drawnScale,
}

afterEach(resetPage)

/** A card the host measured a row for: a body-level floating box with its own `left` and `top`. */
function hostCard(left: number, top: number, position = 'fixed') {
  const card = document.createElement('div')
  card.style.cssText = `position:${position};left:${left}px;top:${top}px;width:60px;height:40px`
  document.body.append(card)
  return card
}

/** Install the mechanism and register its teardown. */
function installed() {
  const layer = installScaledLayer(vocabulary)
  after(layer.stop)
  return layer
}

/** Where the box is drawn, and what the mechanism has written for it. */
const drawn = (card: HTMLElement) => ({
  left: Math.round(card.getBoundingClientRect().left),
  top: Math.round(card.getBoundingClientRect().top),
  height: Math.round(card.getBoundingClientRect().height),
  zoom: card.style.zoom,
})

test('the scale a card is given is the page\'s, taken out again', () => {
  expect(counterScale(1)).toBe(1)
  expect(counterScale(1.25)).toBe(0.8)
  expect(counterScale(0.8)).toBe(1.25)
  expect(counterScale(1.5)).toBeCloseTo(0.666667, 6)
  // No scale to take out: a page that is not scaled, and a factor that never arrives.
  expect(counterScale(0)).toBe(1)
  expect(counterScale(Number.NaN)).toBe(1)
})

test('a card the host positioned is drawn where its own numbers put it', async () => {
  drawnAt(1.25)
  const card = hostCard(100, 200)
  // Before the mechanism: the box the host wrote is drawn at the square of the scale.
  expect(drawn(card)).toEqual({ left: 125, top: 250, height: 50, zoom: '' })
  installed()
  await settle()
  expect(drawn(card)).toEqual({ left: 100, top: 200, height: 40, zoom: '0.8' })
})

test('a card the host sized is measured the way it is drawn, so a placement from its own height holds', async () => {
  drawnAt(1.25)
  const card = hostCard(100, 200)
  installed()
  await settle()
  // The host places a menu over its trigger as `top = triggerTop - offsetHeight - gap`,
  // in the window's pixels, and the card's own height must fit that space.
  const triggerTop = 400
  const offsetHeight = card.offsetHeight
  const wanted = triggerTop - offsetHeight - 4
  card.style.top = `${wanted}px`
  await settle()
  expect(Math.round(card.getBoundingClientRect().bottom)).toBe(triggerTop - 4)
})

test('the host moving its own card is followed, and the card is written once per move', async () => {
  drawnAt(1.25)
  const card = hostCard(100, 200)
  installed()
  await settle()
  card.style.left = '300px'
  card.style.top = '120px'
  await settle()
  expect(drawn(card)).toEqual({ left: 300, top: 120, height: 40, zoom: '0.8' })
  // The mechanism's own write hears itself: the scale must not be written twice.
  await settle()
  expect(card.style.zoom).toBe('0.8')
})

test('a card the host floats without a fixed position is carried the same way', async () => {
  drawnAt(1.25)
  const card = hostCard(100, 200, 'absolute')
  installed()
  await settle()
  expect(drawn(card)).toEqual({ left: 100, top: 200, height: 40, zoom: '0.8' })
})

test('a node the skin placed itself is left where the skin put it', async () => {
  drawnAt(1.25)
  const card = hostCard(100, 200)
  card.classList.add('own')
  installed()
  await settle()
  expect(drawn(card)).toEqual({ left: 125, top: 250, height: 50, zoom: '' })
})

test('a node the host positions from its own stylesheet needs nothing', async () => {
  drawnAt(1.25)
  // A box the stylesheet places is read at the page's scale once, the way every
  // other length on the page is: with no inline `left` and `top` nothing was
  // measured and written back, so nothing doubles.
  const node = document.createElement('div')
  node.style.cssText = 'position:fixed;top:200px;width:60px;height:40px'
  document.body.append(node)
  installed()
  await settle()
  expect(drawn(node)).toEqual({ left: 0, top: 250, height: 50, zoom: '' })
})

test('the teardown hands every carried card back', async () => {
  drawnAt(1.25)
  const card = hostCard(100, 200)
  const layer = installScaledLayer(vocabulary)
  await settle()
  expect(card.style.zoom).toBe('0.8')
  layer.stop()
  await settle()
  expect(drawn(card)).toEqual({ left: 125, top: 250, height: 50, zoom: '' })
})

test('a card the reader leaves at 100% is handed back with the scale', async () => {
  drawnAt(1.25)
  const card = hostCard(100, 200)
  const layer = installed()
  await settle()
  drawnAt(1)
  layer.settle()
  await settle()
  expect(drawn(card)).toEqual({ left: 100, top: 200, height: 40, zoom: '' })
})

test('a card the host mounts is heard, and the skin is told the page changed', async () => {
  drawnAt(1.25)
  const told: number[] = []
  const layer = installScaledLayer({ ...vocabulary, onChange: () => told.push(told.length) })
  after(layer.stop)
  await settle()
  const card = hostCard(300, 400)
  await settle()
  expect(drawn(card)).toEqual({ left: 300, top: 400, height: 40, zoom: '0.8' })
  expect(told.length).toBeGreaterThan(0)
})

test('the teardown asks the skin for the readings of the page it hands back', async () => {
  drawnAt(1.25)
  let released = 0
  const layer = installScaledLayer({ ...vocabulary, onRelease: () => (released += 1) })
  await settle()
  layer.stop()
  expect(released).toBe(1)
})
