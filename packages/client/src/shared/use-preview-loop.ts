import * as React from 'react'

/**
 * The one loop the settings page's preview cards run (D40: a page resource has
 * a single owner, so the mechanism is written once rather than five times).
 *
 * A card shows its effect by taking turns on a timer while the row can take
 * input. The cards differ in the step they take and in what that step writes,
 * so the timer, its teardown and the rules every card follows live here:
 *
 * - A row that takes no input holds its sample still.
 * - A hidden page skips the tick: the card a reader left in a background tab
 *   still runs its timer, and there is nobody there to show the change to.
 * - The tick is held through a ref. A tick changes the card's own state, and
 *   rebuilding the interval on every such render would restart the cadence the
 *   card is showing; a new step length is what replaces the interval.
 */

export interface PreviewLoopOptions {
  /** Milliseconds between ticks, resolved from the period's token by the caller (D9). */
  everyMs: number
  /** What one tick does, read through a ref, so the timer always runs the latest render's closure. */
  tick: () => void
  /** Work the card's phase starts from, run whenever the loop starts or starts over. */
  restart?: () => void
  /** The row takes no input: the loop does not run. */
  disabled?: boolean
}

export function usePreviewLoop(options: PreviewLoopOptions): void {
  const disabled = options.disabled === true
  const latest = React.useRef({ tick: options.tick, restart: options.restart })
  // Before paint, so a tick that follows a rebuilt interval reads the render
  // that rebuilt it rather than the one before.
  React.useLayoutEffect(() => {
    latest.current = { tick: options.tick, restart: options.restart }
  })
  React.useEffect(() => {
    if (disabled) return
    latest.current.restart?.()
    const timer = window.setInterval(() => {
      if (document.hidden) return
      latest.current.tick()
    }, options.everyMs)
    return () => window.clearInterval(timer)
  }, [options.everyMs, disabled])
}
