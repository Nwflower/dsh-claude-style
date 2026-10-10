import { afterEach, expect, test } from 'vitest'
import { createInlineStats } from './inline-stats'
import type { HostSessionStatsProjection, HostText, HostTokenUsageProjection } from '@dsh-claude-style/contracts/services'

/**
 * The line of figures under the composer gives way one step at a time on a
 * card narrower than itself (D27), and takes steps back only once the roomier
 * step fits with room to spare. Every walk ends: a card too narrow for the
 * last step leaves the line there, and the page keeps answering.
 */

const TEMPLATES: Record<string, string> = {
  'stats.counts': '{turns} turns, {steps} steps',
  'message.tokensPerSecond': '{tps} tok/s',
  'message.turnUsage.count': '{count} tokens',
  'stats.cacheHit': 'cache hit {percent}%',
  'number.groupSeparator': ',',
}

const chat: HostText = (key, params = {}) =>
  (TEMPLATES[key] ?? key).replace(/\{(\w+)\}/g, (_, name: string) => String(params[name]))

const stats: HostSessionStatsProjection = {
  turns: 12, steps: 345, llmMs: 0, toolMs: 0, ttftMs: 0, ttftSteps: 0, decodeMs: 10_000, decodeTokens: 512_000,
}
const usage: HostTokenUsageProjection = {
  uncachedInputTokens: 1_234_567, cacheReadTokens: 7_654_321, cacheWriteTokens: 0, outputTokens: 456_789,
}

/** One projection's value, as the session's faces hand it over. */
function read<Value>(key: string) {
  return (key === 'sessionStats' ? stats : key === 'tokenUsage' ? usage : undefined) as Value | undefined
}

/** A composer card `width` px wide, and the statistics row the line stands beside, laid out unwrapped. */
function mount(width: number) {
  const card = document.createElement('div')
  card.setAttribute('data-composer-card', '')
  card.style.width = `${width}px`
  const dock = document.createElement('div')
  dock.style.whiteSpace = 'nowrap'
  dock.style.width = 'max-content'
  const row = document.createElement('div')
  row.setAttribute('data-composer-stats', '')
  dock.appendChild(row)
  document.body.append(card, dock)
  return card
}

function lineWidth() {
  return document.querySelector('[data-dsh-claude-inline-stats]')!.getBoundingClientRect().width
}

afterEach(() => {
  document.body.replaceChildren()
})

test('a card narrower than every step leaves the line on the last one', () => {
  mount(40)
  const inline = createInlineStats(read, () => chat, () => null)
  inline.render()
  expect(inline.fit()).toBe(5)
  expect(document.querySelector('[data-dsh-claude-inline-stats]')!.textContent).not.toContain('8,888,888')
})

test('a card just narrower than the whole line takes it down until it fits', () => {
  const card = mount(4000)
  const inline = createInlineStats(read, () => chat, () => null)
  inline.render()
  expect(inline.fit()).toBe(0)
  const whole = lineWidth()
  card.style.width = `${Math.floor(whole) - 1}px`
  expect(inline.fit()).toBeGreaterThan(0)
  expect(lineWidth()).toBeLessThanOrEqual(card.clientWidth)
})

test('room coming back gives every step back', () => {
  const card = mount(40)
  const inline = createInlineStats(read, () => chat, () => null)
  inline.render()
  expect(inline.fit()).toBe(5)
  card.style.width = '4000px'
  expect(inline.fit()).toBe(0)
  expect(document.querySelector('[data-dsh-claude-inline-stats]')!.textContent).toContain('8,888,888')
})

test('a step comes back only with room to spare', () => {
  const card = mount(4000)
  const inline = createInlineStats(read, () => chat, () => null)
  inline.render()
  const whole = lineWidth()
  card.style.width = `${Math.floor(whole) - 1}px`
  const level = inline.fit()
  expect(level).toBeGreaterThan(0)
  // Room for the whole line again, but less than the slack a step back asks.
  card.style.width = `${Math.ceil(whole) + 10}px`
  expect(inline.fit()).toBe(level)
})

test('a fit that keeps its step leaves the shown line untouched, on every step', () => {
  const card = mount(4000)
  const inline = createInlineStats(read, () => chat, () => null)
  inline.render()
  const root = document.querySelector('[data-dsh-claude-inline-stats]')!
  const steps = new Set<number>()
  for (let width = Math.ceil(lineWidth()); width >= 40; width -= 8) {
    card.style.width = `${width}px`
    const level = inline.fit()
    steps.add(level)
    const watch = new MutationObserver(() => {})
    watch.observe(root, { subtree: true, childList: true, attributes: true, characterData: true })
    expect(inline.fit()).toBe(level)
    expect(inline.fit()).toBe(level)
    expect(watch.takeRecords()).toEqual([])
    watch.disconnect()
  }
  // Step 3 only takes the meter's reading, and there is no meter here.
  expect([...steps].sort()).toEqual([0, 1, 2, 4, 5])
})
