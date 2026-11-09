/**
 * Notify in registration order and isolate reported listener failures.
 * Snapshot iteration avoids skips; recheck membership so listeners removed this round are not called.
 */
export function notifyAll<Args extends unknown[]>(listeners: ((...args: Args) => void)[], ...args: Args) {
  for (const listener of listeners.slice()) {
    if (!listeners.includes(listener)) continue
    try {
      listener(...args)
    } catch (error) {
      reportError(error)
    }
  }
}
