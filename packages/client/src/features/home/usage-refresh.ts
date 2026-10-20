/**
 * When the usage panel reads its roll-up again (features/home/data.ts).
 *
 * The route answers with the host half's last finished fold, so the panel holds
 * a snapshot: read once, it would stand at whatever the host knew when the page
 * opened, which on a window left open all day is the morning's numbers. The
 * panel therefore asks again while it stands on the page, and the figures on
 * show are at most one period old.
 */

/**
 * How old the numbers on show may get: the page's own minute clock
 * (engine/scheduler.ts) asks for a pass about this often, so a panel standing
 * on the page reads again at the first pass past this age.
 */
export const HOME_REFRESH_MS = 45_000

/**
 * The stretch away after which a returning reader's numbers are read again: the
 * window taking the focus back, or the panel coming back into view. Below it
 * the numbers on show are the ones that were just read.
 */
export const HOME_REFRESH_FLOOR_MS = 10_000

/** Why the page is asking: its numbers aged on show, or the reader came back to them. */
export type HomeRefreshReason = 'tick' | 'wake'

/**
 * What the ask is judged against: how old the numbers on show are, and whether
 * a read is already under way.
 */
export interface HomeUsageAge {
  /** When the route last answered this page, on the page's clock; null before the first answer. A route that failed counts as an answer, so a failing route is asked on the same period rather than on every pass. */
  answeredAt: number | null
  /** A read is crossing, or the host half is still folding: a second ask would change nothing. */
  busy: boolean
}

/**
 * Whether the page reads the roll-up now.
 *
 * @param now - the page's clock.
 * @param age - how old the numbers on show are.
 * @param reason - `'tick'` for a panel standing on the page, `'wake'` for one the reader came back to.
 */
export function homeRefreshDue(now: number, age: HomeUsageAge, reason: HomeRefreshReason) {
  if (age.busy) return false
  if (age.answeredAt === null) return true
  return now - age.answeredAt >= (reason === 'wake' ? HOME_REFRESH_FLOOR_MS : HOME_REFRESH_MS)
}
