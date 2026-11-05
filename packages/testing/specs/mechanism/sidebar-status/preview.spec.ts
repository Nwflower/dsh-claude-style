/**
 * @capability sidebar-status
 * @features sidebar-status, settings
 * @risk A stored running effect repaints all preview cards alike or reduced motion leaves their shimmer animated without its marker fallback.
 */
import { expect, test } from 'vitest'
import { surfaceAttribute, surfaceClass } from '../../fixtures/surface'
import { bodyAttribute, removeAfterTest } from './fixture'

const looks = ['breathe', 'ring', 'shimmer'] as const
const LOOK = surfaceAttribute('settings.ongoing-look')

function preview(look: string) {
  const card = document.createElement('button')
  card.className = surfaceClass('settings.ongoing-card')
  const sample = document.createElement('span')
  sample.className = surfaceClass('settings.ongoing-sample')
  // The sidebar sheet scopes marker paint to this shared preview parent.
  sample.classList.add(surfaceClass('settings.ongoing-preview'))
  sample.setAttribute(LOOK, look)
  const title = document.createElement('span')
  title.className = surfaceClass('settings.ongoing-title')
  title.setAttribute(LOOK, look)
  title.textContent = 'A running conversation'
  const mark = document.createElement('span')
  mark.className = surfaceClass('settings.ongoing-mark')
  mark.setAttribute(LOOK, look)
  sample.append(title, mark)
  card.append(sample)
  document.body.append(card)
  removeAfterTest(card)
  return { title, mark }
}

test.each(looks)('storing %s preserves the independent paint of all three preview cards', stored => {
  bodyAttribute(surfaceAttribute('skin.ongoing-indicator'), stored)
  bodyAttribute(surfaceAttribute('skin.motion'), 'full')
  const [breathe, ring, shimmer] = looks.map(preview)
  const breathStyle = getComputedStyle(breathe.mark)
  const ringStyle = getComputedStyle(ring.mark)
  expect(breathStyle.visibility).toBe('visible')
  expect(breathStyle.animationDuration).toBe('1.2s')
  expect(breathe.mark.getAnimations()).toHaveLength(1)
  expect(ringStyle.visibility).toBe('visible')
  expect(ringStyle.animationDuration).toBe('0.85s')
  expect(ring.mark.getAnimations()).toHaveLength(1)
  expect(Number.parseFloat(ringStyle.width)).toBeGreaterThan(Number.parseFloat(breathStyle.width))
  expect(breathe.title.getAnimations()).toHaveLength(0)
  expect(ring.title.getAnimations()).toHaveLength(0)
  expect(getComputedStyle(shimmer.title).animationDuration).toBe('3s')
  expect(shimmer.title.getAnimations()).toHaveLength(1)
  expect(getComputedStyle(shimmer.mark).visibility).toBe('hidden')
  expect(shimmer.mark.getAnimations()).toHaveLength(0)
})

test('reducing motion after all three previews animate restores every static marker', () => {
  bodyAttribute(surfaceAttribute('skin.motion'), 'full')
  const previews = looks.map(preview)
  expect(previews.flatMap(({ title, mark }) => [...title.getAnimations(), ...mark.getAnimations()])).toHaveLength(3)
  bodyAttribute(surfaceAttribute('skin.motion'), 'reduced')
  for (const { title, mark } of previews) {
    expect(title.getAnimations()).toHaveLength(0)
    expect(mark.getAnimations()).toHaveLength(0)
    expect(getComputedStyle(mark).visibility).toBe('visible')
  }
})
