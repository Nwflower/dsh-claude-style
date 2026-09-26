    /**
     * One element of the skin's own markup: tag, class and text in one call —
     * the builder every hand-built surface uses (rows, cards, lists).
     *
     * @param tag - element name.
     * @param className - class attribute; empty or omitted leaves it unset.
     * @param text - text content; omitted or null leaves it empty.
     * @returns the new element.
     */
    function buildElement(tag, className, text) {
      const element = document.createElement(tag)
      if (className) element.className = className
      if (text !== undefined && text !== null) element.textContent = text
      return element
    }

    /**
     * One host element the skin marks for its stylesheet, followed across
     * re-renders. React replaces host nodes freely, so the mark has to move
     * with the element the pass finds this time and come off the one it
     * found before; an unchanged mark writes nothing (re-setting the same
     * value still invalidates the element's styles).
     *
     * @param attr - the attribute the stylesheet keys on.
     * @returns `{ mark(element, value), current(), release() }`: `mark` moves
     *   the attribute (value defaults to empty) onto `element`, or takes it off
     *   when `element` is null; `current` is the marked element; `release`
     *   takes the mark off for the teardown.
     */
    function createStamp(attr) {
      let marked = null

      function mark(element, value = '') {
        if (marked !== null && marked !== element) marked.removeAttribute(attr)
        marked = element
        if (element !== null && element.getAttribute(attr) !== value) element.setAttribute(attr, value)
      }

      return {
        mark,
        current: () => marked,
        release: () => mark(null),
      }
    }
