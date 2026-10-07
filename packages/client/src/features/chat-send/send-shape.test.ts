import { afterEach, expect, test } from 'vitest'
import { CHAT_DRAFT_HANDOFF_AT, CHAT_MAX_TEXT_LAYERS, CHAT_MORPH_END, CHAT_RISE_DAMPING, CHAT_RISE_OMEGA, CHAT_SHAPE_SAMPLES, chatSendCornerRadius, chatSendMorphProgress, chatSendRiseProgress, chatSendShadowSpread, chatSendSpringProgress, chatSendStepOpacity, chatSendTextWindows } from './send-shape'
import type { ShapeSample } from './send-shape'

const cleanups: (() => void)[] = []
afterEach(() => {
  while (cleanups.length > 0) cleanups.pop()!()
})

/** The curve at `count` evenly spaced shares of the flight. */
const sampled = (curve: (u: number) => number, count = 200) => Array.from({ length: count + 1 }, (_, index) => curve(index / count))

test('a critically damped spring rises from 0 without passing 1', () => {
  const values = sampled(u => chatSendSpringProgress(u, 1, 16))
  expect(values[0]).toBe(0)
  for (let i = 1; i < values.length; i += 1) expect(values[i]).toBeGreaterThanOrEqual(values[i - 1])
  expect(Math.max(...values)).toBeLessThanOrEqual(1)
})

test('the rise overshoots by the damping ratio\'s amount and still lands exactly', () => {
  const peak = Math.max(...sampled(u => chatSendSpringProgress(u, CHAT_RISE_DAMPING, CHAT_RISE_OMEGA), 2000))
  const ratio = CHAT_RISE_DAMPING / Math.sqrt(1 - CHAT_RISE_DAMPING * CHAT_RISE_DAMPING)
  expect(peak - 1).toBeCloseTo(Math.exp(-Math.PI * ratio), 3)
  expect(chatSendRiseProgress(0)).toBe(0)
  expect(chatSendRiseProgress(1)).toBeCloseTo(1, 12)
})

test('the shape runs its whole course within its share of the flight', () => {
  expect(chatSendMorphProgress(0)).toBe(0)
  expect(chatSendMorphProgress(CHAT_MORPH_END)).toBe(1)
  expect(chatSendMorphProgress(1)).toBe(1)
  // Normalised by its end value: no jump where the window ends.
  expect(chatSendMorphProgress(CHAT_MORPH_END - 1e-9)).toBeCloseTo(1, 6)
  const values = sampled(chatSendMorphProgress)
  for (let i = 1; i < values.length; i += 1) expect(values[i]).toBeGreaterThanOrEqual(values[i - 1])
})

test('a corner on a non-uniformly scaled shell is written per axis, never divided by zero', () => {
  expect(chatSendCornerRadius(20, 0.5, 1)).toBe('40px / 20px')
  expect(chatSendCornerRadius(20, 0, 1)).toBe('1000px / 20px')
})

test('a shadow reaches as far as its widest layer, colour functions aside', () => {
  expect(chatSendShadowSpread('none')).toBe(0)
  expect(chatSendShadowSpread('')).toBe(0)
  expect(chatSendShadowSpread('0px 4px 12px 2px rgba(0, 0, 0, 0.1), 0px 0px 0px 1px rgb(10 20 30)')).toBe(14)
  expect(chatSendShadowSpread('rgba(0, 0, 0, 0.5) 0px 8px 24px')).toBe(24)
})

test('a stepped opacity lights only inside its window', () => {
  expect(chatSendStepOpacity(0.2, 0.6)).toEqual([
    { offset: 0, opacity: '0' }, { offset: 0.2, opacity: '0' },
    { offset: 0.2, opacity: '1' }, { offset: 0.6, opacity: '1' },
    { offset: 0.6, opacity: '0' }, { offset: 1, opacity: '0' },
  ])
  expect(chatSendStepOpacity(0, 1)).toEqual([{ offset: 0, opacity: '1' }, { offset: 1, opacity: '1' }])
})

/** A bubble of real text on the page, its words laid out by the browser. */
function bubble(text: string) {
  const element = document.createElement('div')
  element.style.cssText = 'position:absolute;left:0;top:0;font:16px/24px sans-serif;white-space:pre-wrap;width:max-content;max-width:640px'
  element.textContent = text
  document.body.append(element)
  cleanups.push(() => element.remove())
  return element
}

/** A flight narrowing the words' width from `from` to `to` along the shape's own curve. */
function narrowing(from: number, to: number): ShapeSample[] {
  return Array.from({ length: CHAT_SHAPE_SAMPLES + 1 }, (_, index) => {
    const u = index / CHAT_SHAPE_SAMPLES
    const m = chatSendMorphProgress(u)
    const content = from + (to - from) * m
    return { u, m, width: content + 28, visible: content + 28, height: 44, radius: 20, left: 0, top: 10, content, lineHeight: 24 }
  })
}

test('the words are laid out in steps that cover the flight end to end, the draft handing over on time', () => {
  const words = bubble('The quick brown fox jumps over the lazy dog, then turns round and jumps back over it again before the bubble has narrowed all the way.')
  const samples = narrowing(620, 180)
  const windows = chatSendTextWindows(words, getComputedStyle(words), samples, 24, 10)
  expect(windows[0].from).toBe(0)
  expect(windows.at(-1)!.until).toBe(1)
  for (let i = 1; i < windows.length; i += 1) expect(windows[i].from).toBe(windows[i - 1].until)
  // Narrower steps break more lines: the words move into several layers.
  expect(windows.length).toBeGreaterThan(2)
  expect(windows.length).toBeLessThanOrEqual(CHAT_MAX_TEXT_LAYERS)
  const handoff = samples.find(sample => sample.m >= CHAT_DRAFT_HANDOFF_AT)!.u
  expect(windows[0].until).toBeLessThanOrEqual(handoff)
})

/** How many lines the bubble's words take at one width, laid out on their own. */
function linesAt(words: HTMLElement, width: number) {
  const probe = words.cloneNode(true) as HTMLElement
  probe.style.width = width + 'px'
  probe.style.maxWidth = 'none'
  document.body.append(probe)
  const range = document.createRange()
  range.selectNodeContents(probe)
  const tops = new Set([...range.getClientRects()].map(rect => Math.round(rect.top)))
  probe.remove()
  return tops.size
}

test('the halving search groups the flight exactly where the line breaks change', () => {
  const words = bubble('Several words of different lengths, wrapping at a few widths as the shell narrows toward the bubble.')
  const samples = narrowing(560, 160)
  const windows = chatSendTextWindows(words, getComputedStyle(words), samples, 24, 10)
  expect(windows.length).toBeGreaterThan(3)
  // Past the draft's own step every step is one layout: each width inside it
  // breaks into as many lines as the step's own width does.
  for (const window of windows.slice(2)) {
    const lines = linesAt(words, window.width)
    samples.forEach((sample, index) => {
      if (sample.u <= window.from || sample.u >= window.until) return
      const next = samples[index + 1]
      expect(linesAt(words, Math.min(sample.content, next.content))).toBe(lines)
    })
  }
})

test('words taller than the shell push its height, as a self-sizing bubble would', () => {
  const words = bubble('One line at the start that breaks into several once the shell is narrow enough to force it.')
  const samples = narrowing(600, 120)
  chatSendTextWindows(words, getComputedStyle(words), samples, 24, 10)
  const last = samples.at(-1)!
  expect(last.height).toBeGreaterThan(44)
  // The probe the layout ran in is gone again.
  expect(document.body.lastElementChild).toBe(words)
})
