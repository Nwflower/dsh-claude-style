export const HOME_REFRESH_MS = 45_000
export const HOME_REFRESH_FLOOR_MS = 10_000

export type HomeRefreshReason = 'tick' | 'wake'

export interface HomeUsageAge {
  /** Failed reads count as answers so a failing route is retried on the period, not every scheduler pass. */
  answeredAt: number | null
  busy: boolean
}

export function homeRefreshDue(now: number, age: HomeUsageAge, reason: HomeRefreshReason) {
  if (age.busy) return false
  if (age.answeredAt === null) return true
  return now - age.answeredAt >= (reason === 'wake' ? HOME_REFRESH_FLOOR_MS : HOME_REFRESH_MS)
}
