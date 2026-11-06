/**
 * How a rate state reads: its name, the whole judgement in one line, and the
 * badge a model row carries — the value and the countdown on show, the line
 * as the badge's accessible name. The copy document has not been fetched here,
 * so these read the neutral wording a page shows before it answers (D5).
 *
 * @capability billing-clock
 * @features peakrate
 * @risk The badge on a model row reads a rate or countdown that differs from what a screen reader announces, or announces nothing at all.
 */
import { expect, test } from 'vitest'
import { buildRateBadge, rateDetail, rateName } from '@dsh-claude-style/client/pure'
import type { RateState } from '@dsh-claude-style/contracts/peakrate'

const PEAK: RateState = { period: 'peak', badge: '2×', minutesUntilSwitch: 80, nextPeriod: 'offPeak', nextBadge: '1×' }
const CAMPAIGN: RateState = { period: 'campaign', badge: '0.5× credits', minutesUntilSwitch: Number.POSITIVE_INFINITY }

/** The badge as a reader meets it: on the page, its words, and what it is announced as. */
function shown(state: RateState) {
  const badge = buildRateBadge(state)
  document.body.append(badge)
  const reading = { role: badge.getAttribute('role'), name: badge.getAttribute('aria-label'), text: badge.textContent?.replace(/\s+/g, ' ').trim(), pictures: badge.querySelectorAll('svg').length }
  badge.remove()
  return reading
}

test('the state names and the judgement read as one line', () => {
  expect(rateName('peak')).toBe('Peak rate')
  expect(rateDetail(PEAK)).toBe('Now Peak rate 2× · in 1h 20m → Off-peak rate 1×')
})

test('a state with no switch in sight says only what it is', () => {
  expect(rateDetail({ period: 'offPeak', badge: '1×', minutesUntilSwitch: Number.POSITIVE_INFINITY })).toBe('Now Off-peak rate 1×')
})

test('a promotion is named as one, with the badge the source prints for it', () => {
  expect(rateName('campaign')).toBe('Promotion')
  expect(rateDetail(CAMPAIGN)).toBe('Now Promotion 0.5× credits')
})

test('the badge shows the value and the countdown, and is announced as the whole judgement', () => {
  // The space between the value and the countdown is the stylesheet's gap, not a character.
  expect(shown(PEAK)).toMatchObject({ role: 'img', name: rateDetail(PEAK), pictures: 1 })
  expect(shown(PEAK).text).toMatch(/^2×\s*· 1h 20m$/)
})

test('a badge with nothing to count down to shows its value alone', () => {
  expect(shown(CAMPAIGN)).toEqual({ role: 'img', name: rateDetail(CAMPAIGN), text: '0.5× credits', pictures: 1 })
})
