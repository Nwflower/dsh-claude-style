/**
 * The details rail's open state, shared by the rail and the header's control
 * (D94). The rail owns the decision (its column's width and the reader's own
 * choice); the header's button reads that decision and asks the rail to flip it.
 */
type Listener = () => void

let open = false
let toggle: (() => void) | null = null
const listeners = new Set<Listener>()

/** Whether the rail stands on the page right now. */
export function railOpen() {
  return open
}

/** Record the rail's own decision; a changed value wakes the header's control. */
export function setRailOpen(next: boolean) {
  if (open === next) return
  open = next
  for (const listener of listeners) listener()
}

/** Follow the rail's decision. */
export function subscribeRail(listener: Listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** The rail hands its own flip over here while it is mounted; its teardown gives it back. */
export function setRailToggle(next: (() => void) | null) {
  toggle = next
  return next
}

/** Flip the rail: open it, or put it away for this session. */
export function toggleRail() {
  toggle?.()
}
