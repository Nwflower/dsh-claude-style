/**
 * When the home usage panel reads its roll-up again: a panel standing on the
 * hero reads on the period the page's own clock gives it, a reader coming back
 * to the window reads sooner, and neither asks while a read is crossing or the
 * host half is still folding.
 *
 * @capability usage-refresh
 * @features home
 * @risk A window left open shows the morning's token totals all afternoon, and the reader takes the panel for a live reading.
 */
import { describe, expect, test } from 'vitest'
import { HOME_REFRESH_FLOOR_MS, HOME_REFRESH_MS, homeRefreshDue } from '@dsh-claude-style/client/pure'

const answeredAt = 1_000_000
const at = (age: number) => answeredAt + age

describe('a panel standing on the page', () => {
  test('reads again once its numbers reach the period, and not before', () => {
    expect(homeRefreshDue(at(HOME_REFRESH_MS - 1), { answeredAt, busy: false }, 'tick')).toBe(false)
    expect(homeRefreshDue(at(HOME_REFRESH_MS), { answeredAt, busy: false }, 'tick')).toBe(true)
  })

  test('reads at once when no answer has arrived yet', () => {
    expect(homeRefreshDue(at(0), { answeredAt: null, busy: false }, 'tick')).toBe(true)
  })

  test('holds off while a read crosses, however old the numbers are', () => {
    expect(homeRefreshDue(at(HOME_REFRESH_MS * 10), { answeredAt, busy: true }, 'tick')).toBe(false)
  })
})

describe('a reader coming back to the window', () => {
  test('reads again after the floor, sooner than the period', () => {
    expect(HOME_REFRESH_FLOOR_MS).toBeLessThan(HOME_REFRESH_MS)
    expect(homeRefreshDue(at(HOME_REFRESH_FLOOR_MS), { answeredAt, busy: false }, 'wake')).toBe(true)
  })

  test('takes the numbers it has when the reader never left for long', () => {
    expect(homeRefreshDue(at(HOME_REFRESH_FLOOR_MS - 1), { answeredAt, busy: false }, 'wake')).toBe(false)
  })

  test('holds off while a read crosses', () => {
    expect(homeRefreshDue(at(HOME_REFRESH_MS * 10), { answeredAt, busy: true }, 'wake')).toBe(false)
  })
})
