import type { HostText } from '../../core/host'

/**
 * The numbers, in the host's own words.
 *
 * Four small formatting rules live on top of the host's raw projection
 * values, the ones ui-chat applies before it paints; each is mirrored here
 * and named after its source — formatDuration, formatTokensPerSecond,
 * formatExactTokens and formatCacheHitPercent.
 */

/**
 * Compact duration, mirroring ui-chat's `formatDuration`: tenths of a
 * second under a minute, whole minutes and seconds from there on,
 * through the namespace's own templates.
 */
export function sessionStatsDuration(ms: number, chat: HostText) {
  const seconds = ms / 1_000
  if (seconds < 60) return chat('duration.compactSeconds', { seconds: Math.round(seconds * 10) / 10 })
  const whole = Math.round(seconds)
  return chat('duration.compactMinutes', { minutes: Math.floor(whole / 60), seconds: whole % 60 })
}

/** Decode throughput, mirroring ui-chat's `formatTokensPerSecond`. */
export function sessionStatsSpeed(tps: number) {
  const clamped = Math.max(0, tps)
  return clamped >= 10 ? String(Math.round(clamped)) : String(Math.round(clamped * 10) / 10)
}

/** Exact token count with the locale's group separator, mirroring ui-chat's `formatExactTokens`. */
function sessionStatsGrouped(value: number, chat: HostText) {
  const digits = String(value)
  const groups = []
  for (let end = digits.length; end > 0; end -= 3) groups.unshift(digits.slice(Math.max(0, end - 3), end))
  return groups.join(chat('number.groupSeparator'))
}

/** One usage row's reading, as the host writes it: the count template around the grouped number. */
export function sessionStatsTokens(value: number, chat: HostText) {
  return chat('message.turnUsage.count', { count: sessionStatsGrouped(value, chat) })
}

/**
 * The largest whole-percent unit a ratio reaches, ties rounded up —
 * ui-chat's `roundedPercentUnits` at its ordinary precision.
 */
function sessionStatsPercentUnits(cacheReadTokens: number, denominator: number) {
  const scale = 100
  const doubled = scale * 2
  const quotient = Math.floor(denominator / doubled)
  const remainder = denominator % doubled
  let lower = 0
  let upper = scale
  while (lower < upper) {
    const candidate = Math.floor((lower + upper + 1) / 2)
    const factor = candidate * 2 - 1
    const threshold = factor * quotient + Math.ceil(factor * remainder / doubled)
    if (cacheReadTokens >= threshold) lower = candidate
    else upper = candidate - 1
  }
  return lower
}

/**
 * Cache-hit share of the prompt side, mirroring ui-chat's
 * `formatCacheHitPercent`: a partial hit never rounds up to 100 — the
 * ordinary precision is one whole percent, and a ratio that would round
 * to 100 takes exactly enough extra decimals to stay below it. Null when
 * nothing was billed.
 */
export function sessionStatsCacheHit(cacheReadTokens: number, promptTokens: number) {
  if (promptTokens === 0) return null
  const missed = promptTokens - cacheReadTokens
  if (missed === 0) return '100'
  const units = sessionStatsPercentUnits(cacheReadTokens, promptTokens)
  if (units < 100) return String(units)
  let places = 1
  let gap = missed * 200
  const tens = Math.floor(promptTokens / 10)
  while (gap <= tens) {
    gap *= 10
    places += 1
  }
  const ones = promptTokens % 10
  let loss = 5
  for (let candidate = 1; candidate < 5; candidate += 1) {
    const factor = candidate * 2 + 1
    if (gap <= factor * tens + Math.floor(factor * ones / 10)) {
      loss = candidate
      break
    }
  }
  return `99.${'9'.repeat(places - 1)}${10 - loss}`
}
