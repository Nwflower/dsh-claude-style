    /**
     * Call every listener of one change, in registration order. A listener
     * that throws is reported (`reportError`: the console and the window's
     * error event) and the rest still hear the change — one broken subscriber
     * must neither stop the others nor vanish without a trace.
     *
     * @param listeners - the subscribers; copied first, so one that
     *   unsubscribes while being called does not skip its neighbour.
     * @param args - what each listener is called with.
     */
    function notifyAll(listeners, ...args) {
      for (const listener of listeners.slice()) {
        try {
          listener(...args)
        } catch (error) {
          reportError(error)
        }
      }
    }
