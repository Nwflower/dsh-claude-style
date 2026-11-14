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
  const units: [number, string][] = [[1e3, 'k'], [1e6, 'M'], [1e9, 'B']]
  let unit = 0
  while (unit + 1 < units.length && value >= units[unit + 1][0]) unit++
  let tenths = Math.round(value / units[unit][0] * 10)
  // A reading that the next step up would take over — 999,960 reads 1000.0k —
  // moves to that unit, so no figure stands above its own unit's reach.
  if (tenths >= 1e4 && unit + 1 < units.length) {
    unit += 1
    tenths = Math.round(value / units[unit][0] * 10)
  }
  return String(tenths / 10) + units[unit][1]
}
