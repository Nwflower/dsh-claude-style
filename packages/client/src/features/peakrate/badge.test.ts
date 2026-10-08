import { expect, test } from 'vitest'
import { buildRateBadge, rateDetail, rateName } from './badge'
import type { RateState } from '@dsh-claude-style/contracts/peakrate'

/**
 * The badge and its wording: the state's name, the whole judgement in one line,
 * and the element a row carries. The copy document has not been fetched here, so
 * these read the neutral constants the bundle carries — the same ones a page
 * falls back to before the document answers (docs/decisions D5).
 */

const PEAK: RateState = { period: 'peak', badge: '2×', minutesUntilSwitch: 80, nextPeriod: 'offPeak', nextBadge: '1×' }

test('the state names and the judgement read as one line', () => {
  expect(rateName('peak')).toBe('Peak rate')
  expect(rateDetail(PEAK)).toBe('Now Peak rate 2× · in 1h 20m → Off-peak rate 1×')
})

test('a state with no switch in sight says only what it is', () => {
  expect(rateDetail({ period: 'offPeak', badge: '1×', minutesUntilSwitch: Number.POSITIVE_INFINITY }))
    .toBe('Now Off-peak rate 1×')
})

test('a promotion is named as one, with the badge the source prints for it', () => {
  expect(rateName('campaign')).toBe('Promotion')
  expect(rateDetail({ period: 'campaign', badge: '0.5× credits', minutesUntilSwitch: Number.POSITIVE_INFINITY }))
    .toBe('Now Promotion 0.5× credits')
})

test('the badge carries the state, the value, the countdown and its own mark', () => {
  const badge = buildRateBadge(PEAK)
  expect(badge.getAttribute('data-period')).toBe('peak')
  expect(badge.getAttribute('role')).toBe('img')
  expect(badge.getAttribute('title')).toBe(rateDetail(PEAK))
  expect(badge.getAttribute('aria-label')).toBe(rateDetail(PEAK))
  expect(badge.querySelector('.dsh-claude-peakrate-value')?.textContent).toBe('2×')
  expect(badge.querySelector('.dsh-claude-peakrate-countdown')?.textContent).toBe('· 1h 20m')
  expect(badge.querySelector('svg')).not.toBeNull()
})

test('a badge with nothing to count down to draws no countdown', () => {
  const badge = buildRateBadge({ period: 'campaign', badge: '0.5× credits', minutesUntilSwitch: Number.POSITIVE_INFINITY })
  expect(badge.querySelector('.dsh-claude-peakrate-countdown')).toBeNull()
  expect(badge.querySelector('.dsh-claude-peakrate-value')?.textContent).toBe('0.5× credits')
  expect(badge.querySelector('svg')).not.toBeNull()
})
