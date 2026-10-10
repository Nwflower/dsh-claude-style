import type { HostText } from '@dsh-claude-style/contracts/services'

/**
 * A two-digit number for a clock or a date part: "09", "23". Every caller
 * hands it a value in [0, 60); the padding is what keeps a time string the
 * same width at every hour.
 */
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
 * "963.6k". The unit is picked on the rounded value, so a count just under
 * a million reads "1M", never "1000k". The turn status line, the usage
 * panel's stat cells and its model chart all print through this.
 */
export function formatCompactTokens(count: unknown) {
  const value = Number(count) || 0
  const units: [number, string][] = [[1e9, 'B'], [1e6, 'M'], [1e3, 'k']]
  for (let u = 0; u < units.length; u++) {
    const scaled = Math.round(value / units[u][0] * 10) / 10
    if (scaled >= 1) return String(scaled) + units[u][1]
  }
  return String(Math.round(value))
}
