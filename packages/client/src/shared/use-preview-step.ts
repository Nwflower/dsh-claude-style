import * as React from 'react'

/**
 * The one timer the settings page's preview cards run (D40: a page resource has
 * a single owner, so the mechanism is written once rather than five times).
 *
 * A card shows its effect by stepping through a cycle while the row can take
 * input; the step it is on is all a card reads, and what it draws for each step
 * is its own. The rules every card follows live here:
 *
 * - A row that takes no input holds its sample still.
 * - The cycle starts over from step 0 whenever the loop starts, or its pace or
 *   length changes.
 * - A hidden page skips the step: the card a reader left in a background tab
 *   still runs its timer, and there is nobody there to show the change to.
 */
export interface PreviewStepOptions {
  /** Milliseconds between steps, resolved from the period's token by the caller (D9). */
  everyMs: number
  /** How many steps the cycle has before it returns to 0; Infinity counts on without returning. */
  steps: number
  /** The row takes no input: the step stands where it is. */
  disabled?: boolean
  /** Asked at each step; true keeps the card on the step it shows. The loop keeps the function it started with, so pass one that does not change between renders. */
  hold?: () => boolean
}

/** @returns the step the card shows now, from 0. */
export function usePreviewStep(options: PreviewStepOptions): number {
  const { everyMs, steps, hold } = options
  const disabled = options.disabled === true
  const [step, setStep] = React.useState(0)
  React.useEffect(() => {
    if (disabled) return
    setStep(0)
    const timer = window.setInterval(() => {
      if (document.hidden || hold?.() === true) return
      setStep(current => (current + 1 >= steps ? 0 : current + 1))
    }, everyMs)
    return () => window.clearInterval(timer)
  }, [everyMs, steps, disabled])
  return step
}
