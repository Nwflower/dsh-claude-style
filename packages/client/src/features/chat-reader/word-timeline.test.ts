import { expect, test } from 'vitest'
import { WORD_MOTION, WordTimeline } from './word-timeline'

/** A timeline that has seen an empty answer, so whatever comes next fades. */
const live = () => {
  const timeline = new WordTimeline()
  timeline.update('', true, 0)
  return timeline
}

/** The fading runs' text, for readable assertions. */
const runText = (timeline: WordTimeline, text: string, now: number) => timeline.fading(now).map(run => text.slice(run.start, run.end))

test('the first text a container shows is history and never fades', () => {
  const history = new WordTimeline()
  history.update('已经完成的正文。', true, 100)
  expect(history.fading(100)).toEqual([])
})

test('appended words fade in source order, one batch inside one window', () => {
  const timeline = live()
  const text = 'one two three four five six seven'
  timeline.update(text, true, 100)
  const runs = timeline.fading(100)
  const born = runs.map(run => run.born!)
  expect(born).toEqual([...born].sort((a, b) => a - b))
  expect(born[0]).toBeGreaterThanOrEqual(100)
  expect(born.at(-1)).toBeLessThanOrEqual(100 + WORD_MOTION.batchMs)
  expect(runs.map(run => text.slice(run.start, run.end)).join('')).toBe(text)
})

test('a lone later word keeps the typing rhythm and is never born in the past', () => {
  const timeline = live()
  timeline.update('one two', true, 100)
  timeline.update('one two three', true, 900)
  const runs = timeline.fading(900)
  expect(runs.map(run => run.born!).every(born => born >= 900)).toBe(true)
  expect(runText(timeline, 'one two three', 900)).toEqual(['three'])
})

test('finished words drop out, and the whole answer settles after the last fade', () => {
  const timeline = live()
  timeline.update('alpha beta', true, 100)
  expect(timeline.fading(100 + WORD_MOTION.batchMs + WORD_MOTION.duration)).toEqual([])
})

test('Markdown resolving at the tail keeps earlier births and refades only what changed', () => {
  const timeline = live()
  timeline.update('前面的字 **加', true, 100)
  const before = timeline.fading(100)[0]!
  timeline.update('前面的字 加粗', true, 120)
  const after = timeline.fading(120)
  expect(after[0]).toEqual(before)
  expect(after.at(-1)!.end).toBe('前面的字 加粗'.length)
})

test('a change in text already read restarts nothing', () => {
  const timeline = live()
  timeline.update('第一段。', true, 0)
  timeline.update('第一段。第二段。', true, 2000)
  timeline.fading(4000)
  timeline.update('改过的第一段。第二段。第三段。', true, 4000)
  expect(timeline.fading(4000)).toEqual([])
})

test('turning the fade off settles everything at once', () => {
  const timeline = live()
  timeline.update('正在出现的文字', true, 100)
  timeline.update('正在出现的文字，更多', false, 110)
  expect(timeline.fading(110)).toEqual([])
})
