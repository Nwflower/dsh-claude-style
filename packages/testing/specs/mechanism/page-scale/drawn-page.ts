/**
 * The page drawn at a scale, for the specs that drive a mechanism which reads it:
 * the stylesheet draws the page with one `zoom` on the body, and the mechanism
 * reads that scale from the vocabulary it is handed (D73).
 */

/** The scale the page is drawn at, as the mechanism's own vocabulary answers it. */
let scale = 1

/** What the mechanism reads: the scale this file has drawn the page at. */
export const drawnScale = () => scale

/** Every teardown a case registered, taken off when that case ends. */
const cleanups: (() => void)[] = []

/** Draw the page at `factor`, the way the stylesheet's own rule does. */
export function drawnAt(factor: number) {
  scale = factor
  document.body.style.zoom = String(factor)
}

/** Register a teardown to run when the case ends. */
export function after(done: () => void) {
  cleanups.push(done)
}

/** Take the page back: every teardown run, every node gone, the scale at one. */
export function resetPage() {
  for (const cleanup of cleanups.splice(0)) cleanup()
  document.body.replaceChildren()
  scale = 1
  document.body.style.removeProperty('zoom')
}

/** Wait for the mechanism's observer to have run its pass. */
export const settle = () => new Promise(resolve => setTimeout(resolve, 0))
