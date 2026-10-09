import { expect, test } from 'vitest'
import { STREAM_TIMING, StreamBuffer } from './stream-buffer'

test('a burst becomes many bounded frames that only grow and finish in bounded time', () => {
  const buffer = new StreamBuffer()
  const text = '让新到的文字柔和显现，已经读过的内容保持稳定。'.repeat(6)
  buffer.update(text, 0)
  const frames: string[] = []
  let firstFrameAt: number | null = null
  for (let time = 16; time <= STREAM_TIMING.catchUpMs * 2; time += 16) {
    const previous = buffer.visible
    if (buffer.advance(time)) {
      frames.push(buffer.visible)
      firstFrameAt ??= time
    }
    expect(buffer.visible.startsWith(previous)).toBe(true)
    expect(text.startsWith(buffer.visible)).toBe(true)
  }
  expect(frames.length).toBeGreaterThan(8)
  expect(frames[0]!.length).toBeLessThan(text.length / 4)
  expect(firstFrameAt).not.toBeNull()
  expect(firstFrameAt!).toBeLessThanOrEqual(32)
  expect(buffer.visible).toBe(text)
  expect(buffer.pending).toBe(false)
})

test('no received batch waits past the queue ceiling while input keeps coming', () => {
  const buffer = new StreamBuffer()
  const deliveries: { at: number, end: number }[] = []
  let text = ''
  for (let time = 0; time <= 1200; time += 16) {
    if (time % 64 === 0) {
      text += '中文 English 输出片段，'.repeat(3)
      buffer.update(text, time)
      deliveries.push({ at: time, end: text.length })
    }
    buffer.advance(time)
    for (const item of deliveries) if (time - item.at >= STREAM_TIMING.maxQueuedMs) expect(buffer.visible.length).toBeGreaterThanOrEqual(item.end)
  }
})

test('the reveal never splits combined emoji, flags or accents', () => {
  const buffer = new StreamBuffer()
  const text = '你好👩🏽‍💻é🇨🇳👨‍👩‍👧‍👦完整。'.repeat(4)
  const starts = new Set([...new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(text)].map(part => part.index))
  starts.add(text.length)
  buffer.update(text, 0)
  for (let time = 8; time <= 256; time += 8) {
    buffer.advance(time)
    expect(starts.has(buffer.visible.length)).toBe(true)
  }
  expect(buffer.visible).toBe(text)
})

test('half of a surrogate pair split across two chunks is never shown', () => {
  const buffer = new StreamBuffer()
  buffer.update('你好\uD83D', 0)
  buffer.advance(250)
  expect(buffer.visible).toBe('你好')
  buffer.update('你好😀继续', 260)
  buffer.advance(520)
  expect(buffer.visible).toBe('你好😀继续')
})

test('the end of a stream drains within the short finish budget', () => {
  const buffer = new StreamBuffer()
  const text = '最终文本'.repeat(40)
  buffer.update(text, 0)
  buffer.advance(16)
  buffer.update(text, 20, { finished: true })
  buffer.advance(20 + STREAM_TIMING.finishMs)
  expect(buffer.visible).toBe(text)
})

test('an immediate update, a correction and history show everything at once', () => {
  const flushed = new StreamBuffer()
  flushed.update('所有已经收到的文字必须保留。'.repeat(20), 0)
  flushed.advance(16)
  flushed.update(flushed.target, 17, { immediate: true })
  expect(flushed.pending).toBe(false)
  const history = new StreamBuffer('这是已完成的历史文本。')
  expect(history.visible).toBe(history.target)
  history.update('修正后的权威文本。', 0)
  expect(history.visible).toBe('修正后的权威文本。')
  expect(history.revision).toBe(1)
})

test('a large payload or a long background pause builds no typing backlog', () => {
  const large = new StreamBuffer()
  large.update('x'.repeat(12000), 0)
  expect(large.visible).toBe(large.target)
  const delayed = new StreamBuffer()
  delayed.update('一次长时间暂停后应立刻赶上全部已收到的内容。'.repeat(20), 0)
  delayed.advance(10000)
  expect(delayed.visible).toBe(delayed.target)
})
