/**
 * The number roll (D55): one figure inside a segment summary, jumping to its
 * new value the way dsh-better-display's SubtleNumberRoll does — the old figure
 * slides up and out while the new one rises in.
 *
 * The figure is painted twice: a hidden sizer holds the box's width at the new
 * value, and the visible digits sit on top of it. The summary's accessible name
 * is the plain figures line, so the doubled digits never reach a reader.
 */

/** One figure's roll node, with the outgoing digit kept for the jump. */
export interface NumberRoll {
  root: HTMLElement
  show(value: number, motion: boolean): void
  /** Take the roll off the page. */
  remove(): void
}

/** How long the jump runs; the stylesheet's keyframes are the same length. */
export const ROLL_MS = 160

export function createNumberRoll(initial: number): NumberRoll {
  const root = document.createElement('span')
  root.setAttribute('data-dsh-claude-number-roll', '')
  root.setAttribute('aria-hidden', 'true')
  const sizer = document.createElement('span')
  sizer.setAttribute('data-dsh-claude-number-roll-sizer', '')
  root.append(sizer)
  let shown = initial
  let timer = 0
  const paint = (outgoing: number | null, incoming: number, motion: boolean) => {
    for (const child of [...root.querySelectorAll('[data-dsh-claude-number-roll-digit]')]) child.remove()
    sizer.textContent = String(incoming)
    if (outgoing !== null && motion) {
      const exit = document.createElement('span')
      exit.setAttribute('data-dsh-claude-number-roll-digit', 'exit')
      exit.textContent = String(outgoing)
      root.append(exit)
    }
    const enter = document.createElement('span')
    enter.setAttribute('data-dsh-claude-number-roll-digit', outgoing !== null && motion ? 'enter' : 'still')
    enter.textContent = String(incoming)
    root.append(enter)
  }
  paint(null, initial, false)
  return {
    root,
    show(value, motion) {
      if (value === shown) return
      const old = shown
      shown = value
      window.clearTimeout(timer)
      if (!motion) {
        paint(null, value, false)
        return
      }
      paint(old, value, true)
      timer = window.setTimeout(() => {
        timer = 0
        paint(null, shown, false)
      }, ROLL_MS)
    },
    remove() {
      window.clearTimeout(timer)
      root.remove()
    },
  }
}
