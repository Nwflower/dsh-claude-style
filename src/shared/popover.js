    var POPOVER_MARGIN = 8

    /**
     * Position a fixed-position popover relative to its trigger.
     *
     * `side: 'right'` opens to the trigger's right and bottom-aligns it (the
     * account popover in the rail). The default `side: 'above'` right-aligns
     * the popover with the trigger and opens above it with `gap` spacing (the
     * model picker). `important` switches to `style.setProperty(..., 'important')`
     * and rounds the coordinates, as the account popover requires.
     *
     * @param trigger - element the popover is anchored to.
     * @param pop - the fixed-position popover element.
     * @param opts - `{ side, gap, important }`.
     * @returns the chosen `{ x, y }` in viewport coordinates.
     */
    function positionAnchoredPopover(trigger, pop, opts) {
      opts = opts || {}
      var rect = trigger.getBoundingClientRect()
      var width = pop.offsetWidth
      var height = pop.offsetHeight
      var margin = opts.margin || POPOVER_MARGIN
      var x
      var y
      if (opts.side === 'right') {
        x = rect.right + margin
        if (x + width > window.innerWidth - margin) {
          x = Math.max(margin, rect.left - margin - width)
        }
        y = Math.min(Math.max(margin, rect.bottom - height), Math.max(margin, window.innerHeight - height - margin))
      } else {
        x = Math.max(margin, Math.min(rect.right - width, window.innerWidth - width - margin))
        y = rect.top - (opts.gap || 0) - height
        if (y < margin) y = Math.min(rect.bottom + (opts.gap || 0), Math.max(margin, window.innerHeight - height - margin))
      }
      // Same-value guard: this runs on every scheduler pass while a popover is
      // open, and an identical write still dirties layout — the next geometry
      // read (the drag paths read rect/offset every frame) would then force a
      // synchronous recalc. Skip the write when the anchor did not move.
      var leftValue = Math.round(x) + 'px'
      var topValue = Math.round(y) + 'px'
      if (opts.important) {
        if (pop.style.left !== leftValue) pop.style.setProperty('left', leftValue, 'important')
        if (pop.style.top !== topValue) pop.style.setProperty('top', topValue, 'important')
      } else {
        if (pop.style.left !== leftValue) pop.style.left = leftValue
        if (pop.style.top !== topValue) pop.style.top = topValue
      }
      return { x: x, y: y }
    }

    /**
     * Hover dwell before a popover unfolds, and grace before it closes.
     *
     * The dwell exists to swallow a pointer that merely CROSSES a trigger on its
     * way somewhere else, not to make the user wait for the card: 100ms is what a
     * pointer travelling at an ordinary pace needs to clear a 28px trigger, so a
     * pass-through no longer unfolds anything while a pointer the user parked
     * there still opens at once. The grace is what lets the pointer travel the
     * gap between a trigger and its card without the card vanishing underneath
     * it.
     */
    var POPOVER_OPEN_DELAY = 100
    var POPOVER_CLOSE_DELAY = 100

    /**
     * Hover-intent helper shared by the model picker, permission popover and
     * account popover.
     *
     * BOTH sides are scheduled: `scheduleOpen` waits out the dwell (so a pointer
     * crossing the trigger never unfolds anything) and `scheduleClose` waits out
     * the grace. `cancel` clears whichever side is pending — entering the card
     * cancels a close, and leaving the trigger before the dwell cancels the open
     * (`scheduleClose` drops a pending open as well, so a leave needs only the
     * one call).
     */
    function createHoverIntent(open, close, openDelay, closeDelay) {
      var openTimer = null
      var closeTimer = null
      return {
        cancel: function () {
          if (openTimer) {
            clearTimeout(openTimer)
            openTimer = null
          }
          if (closeTimer) {
            clearTimeout(closeTimer)
            closeTimer = null
          }
        },
        scheduleOpen: function () {
          if (openTimer) clearTimeout(openTimer)
          openTimer = setTimeout(function () {
            openTimer = null
            open()
          }, openDelay)
        },
        scheduleClose: function () {
          if (openTimer) {
            clearTimeout(openTimer)
            openTimer = null
          }
          if (closeTimer) clearTimeout(closeTimer)
          closeTimer = setTimeout(function () {
            closeTimer = null
            close()
          }, closeDelay)
        },
      }
    }

    /**
     * The skin's popovers, one entry per popover.
     *
     * A picker whose second level is a card of its own registers ONCE: opening
     * that second level must not fold the first, and both levels answer the same
     * choice. A host menu is registered by the feature that drives its trigger,
     * so it takes part on the same terms as the skin's own cards.
     *
     * An entry carries the feature's close path and nothing else. Every closer is
     * a no-op while its popover is down, so the registry never holds "who is
     * open": a card the user dismissed with Escape or an outside press leaves no
     * stale entry behind.
     */
    var popoverRegistry = []

    /**
     * Register (or replace) one popover's closer. Replacing by name is what makes
     * a client reload safe: the previous generation's disposals never ran, so its
     * closer is still registered and points at a scope that is gone.
     */
    function registerPopover(name, close) {
      for (var i = 0; i < popoverRegistry.length; i++) {
        if (popoverRegistry[i].name === name) {
          popoverRegistry[i].close = close
          return
        }
      }
      popoverRegistry.push({ name: name, close: close })
    }

    /** Drop one popover's entry when its feature is torn down. */
    function unregisterPopover(name) {
      for (var i = 0; i < popoverRegistry.length; i++) {
        if (popoverRegistry[i].name === name) {
          popoverRegistry.splice(i, 1)
          return
        }
      }
    }

    /**
     * Close every registered popover except the one named. Called on the way
     * open, so two cards never share the screen.
     */
    function closeOtherPopovers(name) {
      for (var i = 0; i < popoverRegistry.length; i++) {
        if (popoverRegistry[i].name === name) continue
        popoverRegistry[i].close()
      }
    }

    /**
     * Remove the skin's own nodes that no live reference holds.
     *
     * Client HMR drops the previous generation's disposals instead of running
     * them, so its triggers, cards and lists are still in the document while a
     * fresh scope starts from null; a host re-render can also strand a copy in
     * a container React replaced. Every node matching `selector` under `scope`
     * goes, except the ones in `keep` — an empty `keep` removes them all.
     *
     * @param scope - the element or document to search.
     * @param selector - the nodes to sweep.
     * @param keep - the live nodes this generation holds (null entries match nothing).
     */
    function removeStrayNodes(scope, selector, keep) {
      var nodes = scope.querySelectorAll(selector)
      for (var i = 0; i < nodes.length; i++) {
        if (keep.indexOf(nodes[i]) !== -1) continue
        if (nodes[i].parentElement !== null) nodes[i].parentElement.removeChild(nodes[i])
      }
    }
