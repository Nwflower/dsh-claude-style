import type { HostText } from '@dsh-claude-style/contracts/services'


export function pad2(value: number) {
  return value < 10 ? `0${value}` : String(value)
}

/**
 * A duration the way the host's own chat clocks write it (ui-chat's
 * formatRunDuration): each figure followed by its unit word from the `chat`
 * namespace, minutes from the first minute on and hours from the first hour,
 * joined with no separator of its own — the unit words carry their spacing.
 */
export function formatHostDuration(ms: number, t: HostText) {
  const total = Math.max(0, Math.floor(ms / 1000))
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor(total / 60) % 60
  const seconds = total % 60
  let text = ''
  if (hours > 0) text += `${hours}${t('duration.hourUnit')}`
  if (total >= 60) text += `${minutes}${t('duration.minuteUnit')}`
  return `${text}${seconds}${t('duration.secondUnit')}`
}

/**
 * One value as text: a missing id or name reads as empty, so a lookup key
 * built from an absent provider, model or session still forms a string.
 */
export function textOf(value: unknown) {
  return value === undefined || value === null ? '' : String(value)
}

/** The token-unit steps, low to high; the compact reading and the footer's unit reading walk the same four. */
const TOKEN_UNIT_STEPS = [1e3, 1e6, 1e9, 1e12] as const
/** The units the compact reading writes, lowercase as Claude Code writes them. */
const COMPACT_TOKEN_UNITS = ['k', 'M', 'B', 'T'] as const
/** The units the statistics' figures write when the reader asks for them. */
const UNIT_TOKEN_UNITS = ['K', 'M', 'B', 'T'] as const

/**
 * The step a count reads in and its reading in tenths of that step, moved up a
 * step when rounding would carry it over that step's top — 999,960 is no
 * reading at 1000.0k, so it reads 1M, or 1.0M where the decimal stays.
 */
function tokenTenths(value: number) {
  let unit = 0
  while (unit + 1 < TOKEN_UNIT_STEPS.length && value >= TOKEN_UNIT_STEPS[unit + 1]) unit++
  let tenths = Math.round(value / TOKEN_UNIT_STEPS[unit] * 10)
  if (tenths >= 1e4 && unit + 1 < TOKEN_UNIT_STEPS.length) {
    unit += 1
    tenths = Math.round(value / TOKEN_UNIT_STEPS[unit] * 10)
  }
  return { unit, tenths }
}

/**
 * One token count the way Claude Code writes it: one decimal at most, a
 * whole number without its ".0", and a lowercase k — "109M", "4.4M",
 * "963.6k". The unit follows the count's own magnitude, so a value under a
 * million keeps its k reading ("953.3k") and only a k reading that would
 * round up to 1000k takes M. The turn status line, the usage panel's stat
 * cells, its model chart and the details rail all print through this.
 */
export function formatCompactTokens(count: unknown) {
  const value = Number(count) || 0
  const whole = Math.round(value)
  if (whole < 1e3) return String(whole)
  const { unit, tenths } = tokenTenths(value)
  return String(tenths / 10) + COMPACT_TOKEN_UNITS[unit]
}

/**
 * One token count in the units the statistics' figures wear when the reader
 * asks for them: K/M/B/T with one decimal place kept on every figure ("1.0K",
 * "12.3M"), so a reading keeps its width while it crosses a unit. A count
 * below a thousand has no unit to carry and stays a whole number.
 */
export function formatUnitTokens(count: unknown) {
  const value = Number(count) || 0
  const whole = Math.round(value)
  if (whole < 1e3) return String(whole)
  const { unit, tenths } = tokenTenths(value)
  return (tenths / 10).toFixed(1) + UNIT_TOKEN_UNITS[unit]
}
