/**
 * Call every listener of one change, in registration order. A listener
 * that throws is reported (`reportError`: the console and the window's
 * error event) and the rest still hear the change — one broken subscriber
 * must neither stop the others nor vanish without a trace.
 *
 * @param listeners - the subscribers; copied first, so one that
 *   unsubscribes while being called does not skip its neighbour, and asked
 *   again before each call, so one an earlier listener unsubscribed in this
 *   round (a feature torn down by the entry's switch) is not called.
 * @param args - what each listener is called with.
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
