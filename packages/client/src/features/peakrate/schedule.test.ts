import { expect, test, beforeEach } from 'vitest'
import { currentRate, forgetRates, formatCountdown } from './schedule'
import type { RateProfile, RateSchedule } from '@dsh-claude-style/contracts/peakrate'

/**
 * The billing clock's judgement: the boundaries the meter is judged by
 * (docs/decisions D54). Every case names its instant in UTC, so the schedule's
 * own zone is the only thing that moves the answer.
 */

beforeEach(() => {
  forgetRates()
})

function profile(schedule: RateSchedule, id = 'fixture'): RateProfile {
  return { id, provider: 'DeepSeek', model: 'Fixture', schedule, peakBadge: '2×', offPeakBadge: '1×' }
}

/** Weekdays 01:00–04:00 UTC, one window — the shape the official service publishes. */
const WEEKDAY_WINDOW: RateSchedule = {
  timeZone: 'UTC',
  peakDays: [1, 2, 3, 4, 5],
  peakWindows: [{ start: '01:00', end: '04:00' }],
}

/** A window crossing midnight, the shape the promotional profiles use. */
const NIGHT_WINDOW: RateSchedule = {
  timeZone: 'UTC',
  peakDays: [1, 2, 3, 4, 5],
  peakWindows: [{ start: '23:00', end: '09:00' }],
}

test('a weekday inside its window bills peak, and the countdown names the window end', () => {
  // 2026-10-07 is a Wednesday.
  const state = currentRate(profile(WEEKDAY_WINDOW), new Date('2026-10-07T02:00:00Z'))
  expect(state.period).toBe('peak')
  expect(state.badge).toBe('2×')
  expect(state.minutesUntilSwitch).toBe(120)
  expect(state.nextPeriod).toBe('offPeak')
  expect(state.nextBadge).toBe('1×')
})

test('between two windows the state is off-peak, and the next window is tomorrow', () => {
  const state = currentRate(profile(WEEKDAY_WINDOW), new Date('2026-10-07T05:00:00Z'))
  expect(state.period).toBe('offPeak')
  expect(state.nextPeriod).toBe('peak')
  expect(state.minutesUntilSwitch).toBe(20 * 60)
})

test('a weekend day is off-peak from midnight to midnight', () => {
  // 2026-10-10 is a Saturday, 2026-10-11 a Sunday.
  const saturday = currentRate(profile(WEEKDAY_WINDOW, 'saturday'), new Date('2026-10-10T02:00:00Z'))
  expect(saturday.period).toBe('offPeak')
  // Monday 01:00 is 47 hours after Saturday 02:00.
  expect(saturday.minutesUntilSwitch).toBe(47 * 60)
  const sunday = currentRate(profile(WEEKDAY_WINDOW, 'sunday'), new Date('2026-10-11T02:00:00Z'))
  expect(sunday.period).toBe('offPeak')
  expect(sunday.minutesUntilSwitch).toBe(23 * 60)
})

test('a window crossing midnight belongs to the day it starts', () => {
  // Wednesday 23:30 is inside the window that started that evening...
  const evening = currentRate(profile(NIGHT_WINDOW, 'evening'), new Date('2026-10-07T23:30:00Z'))
  expect(evening.period).toBe('peak')
  // ...and so is Thursday 02:00, the same window's other leg.
  const spill = currentRate(profile(NIGHT_WINDOW, 'spill'), new Date('2026-10-08T02:00:00Z'))
  expect(spill.period).toBe('peak')
  expect(spill.minutesUntilSwitch).toBe(7 * 60)
  // Saturday 02:00 is still Friday's window: the start day is the one judged.
  const fridayLeg = currentRate(profile(NIGHT_WINDOW, 'fridayLeg'), new Date('2026-10-10T02:00:00Z'))
  expect(fridayLeg.period).toBe('peak')
  // Sunday 02:00 has no window behind it — Saturday is no peak day.
  const sundayLeg = currentRate(profile(NIGHT_WINDOW, 'sundayLeg'), new Date('2026-10-11T02:00:00Z'))
  expect(sundayLeg.period).toBe('offPeak')
})

test('the same instant is judged in each schedule\'s own zone', () => {
  const instant = new Date('2026-10-07T17:30:00Z')
  const shanghai: RateSchedule = { ...WEEKDAY_WINDOW, timeZone: 'Asia/Shanghai' }
  // 01:30 on Thursday in Shanghai: inside the window. 17:30 Wednesday in UTC: not.
  expect(currentRate(profile(shanghai, 'shanghai'), instant).period).toBe('peak')
  expect(currentRate(profile(WEEKDAY_WINDOW, 'utc'), instant).period).toBe('offPeak')
})

test('a public holiday is off-peak in full, and suppresses the evening before it', () => {
  const holiday: RateSchedule = { ...WEEKDAY_WINDOW, publicHolidayDates: ['2026-10-07'] }
  const inside = currentRate(profile(holiday, 'holiday'), new Date('2026-10-07T02:00:00Z'))
  expect(inside.period).toBe('offPeak')
  expect(inside.nextPeriod).toBe('peak')

  // A window that started on the holiday evening does not make the working
  // day after it peak.
  const nightHoliday: RateSchedule = { ...NIGHT_WINDOW, publicHolidayDates: ['2026-10-07'] }
  const spill = currentRate(profile(nightHoliday, 'nightHoliday'), new Date('2026-10-08T02:00:00Z'))
  expect(spill.period).toBe('offPeak')
})

test('a dated promotion outranks the regular cycle and carries its own badge', () => {
  const promoted: RateSchedule = {
    ...WEEKDAY_WINDOW,
    overrides: [{
      period: 'campaign',
      periodName: 'promotion',
      badge: '0.5×',
      name: 'All-day off-peak',
      startDate: '2026-10-01',
      endDate: '2026-10-07',
      days: [],
      windows: [{ start: '00:00', end: '00:00' }],
    }],
  }
  const during = currentRate(profile(promoted, 'promoted'), new Date('2026-10-07T02:00:00Z'))
  expect(during.period).toBe('campaign')
  expect(during.badge).toBe('0.5×')
  expect(during.overrideName).toBe('All-day off-peak')
  // The day after the window closes the regular cycle is back, and the peak
  // rate is what the source prints for it.
  const after = currentRate(profile(promoted, 'promotedAfter'), new Date('2026-10-08T02:00:00Z'))
  expect(after.period).toBe('peak')
  expect(after.badge).toBe('2×')
})

test('a promotion inside one part of the day switches back to the regular cycle', () => {
  const campaign: RateSchedule = {
    ...WEEKDAY_WINDOW,
    overrides: [{
      period: 'campaign',
      periodName: 'campaign',
      badge: 'Campaign',
      startDate: '2026-09-03',
      endDate: '2026-10-07',
      days: [],
      windows: [{ start: '23:00', end: '09:00' }],
    }],
  }
  const during = currentRate(profile(campaign, 'campaign'), new Date('2026-10-07T02:00:00Z'))
  expect(during.period).toBe('campaign')
  expect(during.minutesUntilSwitch).toBe(7 * 60)
  expect(during.nextPeriod).toBe('offPeak')
  const after = currentRate(profile(campaign, 'campaignAfter'), new Date('2026-10-07T10:00:00Z'))
  expect(after.period).toBe('offPeak')
})

test('a window edge that changes no state is not a switch', () => {
  const twoWindows: RateSchedule = {
    timeZone: 'UTC',
    peakDays: [1, 2, 3, 4, 5],
    peakWindows: [{ start: '01:00', end: '04:00' }, { start: '04:00', end: '06:00' }],
  }
  // 03:00 is peak; noon's edge at 04:00 changes nothing, so the switch is the
  // second window's own end.
  const state = currentRate(profile(twoWindows), new Date('2026-10-07T03:00:00Z'))
  expect(state.period).toBe('peak')
  expect(state.minutesUntilSwitch).toBe(3 * 60)
})

test('the countdown reads in whole minutes, hours and days', () => {
  expect(formatCountdown(45)).toBe('45m')
  expect(formatCountdown(60)).toBe('1h')
  expect(formatCountdown(80)).toBe('1h 20m')
  expect(formatCountdown(1440)).toBe('1d')
  expect(formatCountdown(1500)).toBe('1d 1h')
  expect(formatCountdown(Number.POSITIVE_INFINITY)).toBe('')
})
