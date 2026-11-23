/**
 * The words inside a flying message: as the shell narrows toward the row, the
 * words are laid out in a few steps, each the layout of one width, that cover
 * the whole flight; the draft's own step hands over on time, and the shell's
 * height follows what the words need without standing shorter than the row.
 *
 * @capability send-flight
 * @features chat-send
 * @risk The words inside a sent message jump to a new line-break mid-flight, overflow the shell, or leave a stripe at the row's foot where the shell lands shorter than the message.
 */
import { afterEach, expect, test } from 'vitest'
import { CHAT_DRAFT_HANDOFF_AT, CHAT_MAX_TEXT_LAYERS, CHAT_SHAPE_SAMPLES, chatSendMorphProgress, chatSendTextWindows } from '@dsh-claude-style/client/pure'
import type { ShapeSample } from '@dsh-claude-style/client/pure'

const cleanups: (() => void)[] = []
afterEach(() => {
  while (cleanups.length > 0) cleanups.pop()!()
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

/** A flight narrowing the words' width from `from` to `to` along the shape's own curve, its height held at `height`. */
function narrowing(from: number, to: number, height = 44): ShapeSample[] {
  return Array.from({ length: CHAT_SHAPE_SAMPLES + 1 }, (_, index) => {
    const u = index / CHAT_SHAPE_SAMPLES
    const m = chatSendMorphProgress(u)
    const content = from + (to - from) * m
    return { u, m, width: content + 28, visible: content + 28, height, radius: 20, left: 0, top: 10, content, lineHeight: 24 }
  })
}

/** A flight that holds the words at one content width, the way a settled row does. */
function held(content: number, height = 44): ShapeSample[] {
  return Array.from({ length: CHAT_SHAPE_SAMPLES + 1 }, (_, index) => {
    const u = index / CHAT_SHAPE_SAMPLES
    const m = chatSendMorphProgress(u)
    return { u, m, width: content, visible: content, height, radius: 20, left: 0, top: 10, content, lineHeight: 24 }
  })
}
/** How many lines the bubble's words take at one width, laid out on their own. */
function linesAt(words: HTMLElement, width: number) {
  const probe = words.cloneNode(true) as HTMLElement
  probe.style.width = `${width}px`
  probe.style.maxWidth = 'none'
  document.body.append(probe)
  const range = document.createRange()
  range.selectNodeContents(probe)
  const tops = new Set([...range.getClientRects()].map(rect => Math.round(rect.top)))
  probe.remove()
  return tops.size
}

test('the words are laid out in steps that cover the flight end to end, the draft handing over on time', () => {
  const words = bubble('The quick brown fox jumps over the lazy dog, then turns round and jumps back over it again before the bubble has narrowed all the way.')
  const samples = narrowing(620, 180, 120)
  const windows = chatSendTextWindows(words, getComputedStyle(words), samples, 24, 10, 120, 44)
  expect(windows[0].from).toBe(0)
  expect(windows.at(-1)!.until).toBe(1)
  for (let i = 1; i < windows.length; i += 1) expect(windows[i].from).toBe(windows[i - 1].until)
  // Narrower steps break more lines: the words move into several layers.
  expect(windows.length).toBeGreaterThan(2)
  expect(windows.length).toBeLessThanOrEqual(CHAT_MAX_TEXT_LAYERS)
  const handoff = samples.find(sample => sample.m >= CHAT_DRAFT_HANDOFF_AT)!.u
  expect(windows[0].until).toBeLessThanOrEqual(handoff)
})

test('a stand-in for a message the fold holds stands on the line to the landed row, whatever its words need', () => {
  const words = bubble('The same passage again: it wraps many times at the widths the flight goes through, so the words on their own would push the shape well past the box the message is held in once it lands in its row.')
  const held = narrowing(620, 240, 240)
  held.forEach((sample) => { sample.height = 240 - 140 * sample.m })
  const windows = chatSendTextWindows(words, getComputedStyle(words), held, 24, 10, 240, 100, true)
  // Every step is the line from the composer's own box to the row's; the words
  // beyond it are the shell's to clip, and the draft's own step is over at once.
  held.forEach((sample) => expect(sample.height).toBeCloseTo(240 - 140 * sample.m, 6))
  expect(windows[0]!.until).toBe(0)
  expect(windows[1]!.from).toBe(0)
  // The same words on a flight that takes off as the card push the shape past the row.
  const free = narrowing(620, 240, 240)
  free.forEach((sample) => { sample.height = 240 - 140 * sample.m })
  chatSendTextWindows(words, getComputedStyle(words), free, 24, 10, 240, 100)
  expect(Math.max(...free.map(sample => sample.height))).toBeGreaterThan(100)
})

test('each step is exactly one layout: the line breaks never change inside a step', () => {
  const words = bubble('Several words of different lengths, wrapping at a few widths as the shell narrows toward the bubble.')
  const samples = narrowing(560, 160, 120)
  const windows = chatSendTextWindows(words, getComputedStyle(words), samples, 24, 10, 120, 44)
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

test('words taller than the shell push its height, as a self-sizing bubble would, and the layout leaves nothing behind', () => {
  const words = bubble('One line at the start that breaks into several once the shell is narrow enough to force it.')
  const samples = narrowing(600, 120, 120)
  chatSendTextWindows(words, getComputedStyle(words), samples, 24, 10, 120, 44)
  expect(samples[0].height).toBe(120)
  expect(samples.at(-1)!.height).toBeGreaterThan(120)
  expect(document.body.lastElementChild).toBe(words)
})

test('the shell never stands shorter than the row it lands on', () => {
  const words = bubble('Wrapping words the shell narrows past, so the probe counts more lines than the bubble holds.')
  const row = 400
  const samples = narrowing(620, 180, 120)
  chatSendTextWindows(words, getComputedStyle(words), samples, 24, 10, 120, row)
  for (const sample of samples) expect(sample.height).toBeGreaterThanOrEqual(120 + (row - 120) * sample.m)
  // The floor is the row's own edge at the end of the flight, to the pixel.
  expect(samples.at(-1)!.height).toBe(row)
  // A row taller than the floor's own end still pushes the shell taller than it.
  const long = bubble('A passage long enough to need several lines once the shell has narrowed all the way to the row, which the floor cannot cover on its own.')
  const grown = narrowing(620, 180, 120)
  chatSendTextWindows(long, getComputedStyle(long), grown, 24, 10, 120, 120)
  expect(grown.at(-1)!.height).toBeGreaterThan(120)
})

/**
 * A short message keeps its last character on the first line while the stand-in is
 * on screen.
 *
 * The flight takes off the moment the echo appears, and the row is still growing
 * then: its box is narrower than the message it will hold. The samples are
 * interpolated floats, so a step's content width lands on a fraction, and a CJK
 * line whose advance sum sits within that fraction of the width breaks one
 * character early. The reader sees the last glyph alone on a second line for the
 * whole flight.
 */
test('a short message keeps one line at every width the flight lays it out at', () => {
  const messages = ['这是一条测试消息', '界面显示有点问题', '麻烦看一下这里', '好的', '测试', '请确认这个改动', '这段文字应该保持在一行']
  const broken: string[] = []
  for (const text of messages) {
    const words = bubble(text)
    // The width the row settles at, and the widths the flight hands its text layers.
    const settled = words.clientWidth
    const windows = chatSendTextWindows(words, getComputedStyle(words), held(settled), 24, 10, 44, 44)
    for (const window of windows) {
      if (window.width <= 0) continue
      const lines = linesAt(words, window.width)
      if (lines > 1) broken.push(`${text}: ${lines} lines at ${window.width}`)
    }
  }
  expect(broken).toEqual([])
})

test('the widths the flight lays the words out at are whole pixels', () => {
  // A destination a fraction of a pixel under the settled width, the shape the
  // interpolated samples take.
  const broken: string[] = []
  for (const text of ['这是一条测试消息', '请确认这个改动', '这段文字应该保持在一行']) {
    const words = bubble(text)
    const settled = words.clientWidth
    const windows = chatSendTextWindows(words, getComputedStyle(words), held(settled - 0.335), 24, 10, 44, 44)
    for (const window of windows) {
      if (window.width <= 0) continue
      if (!Number.isInteger(window.width)) broken.push(`${text}: ${window.width}`)
    }
  }
  expect(broken).toEqual([])
})