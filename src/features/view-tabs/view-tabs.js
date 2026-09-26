    /**
     * The conversation view-tab strip's vertical placement — measured, not guessed.
     *
     * The strip's own row sits below the header's title row, and that title row
     * ALSO carries the header actions (the background-task chip, the workspace /
     * preset picker, the overflow menu, the panel toggle). Whether the strip can
     * rise onto the title's line therefore depends on the window: centred, it fits
     * beside a short title on a wide header and collides with the actions on a
     * narrow one. A fixed offset cannot be right in both cases — this was learned
     * the hard way, with -38px landing the strip on top of the task chip.
     *
     * So the skin measures the boxes and writes ONE custom property,
     * `--dsh-view-tabs-shift`, which the stylesheet turns into the translate. The
     * stylesheet keeps the fallback (its own row); this only lifts the strip when
     * the room above is real — the title and the actions both clear it, and the
     * header's top inset still holds.
     *
     * Windows titlebar mode is the one case where no measurement is needed: the
     * desktop shell marks <html> with `data-windows-titlebar` and the strip is
     * placed fixed in the titlebar row, centred (view-tabs.css). This mirrors that
     * marker onto <body> so the stylesheet can switch, and skips the measured
     * shift entirely there.
     *
     * The strip itself is stamped `data-dsh-view-tabs`, and every strip rule in
     * view-tabs.css keys on that attribute. Finding the strip is a query this pass
     * runs once; as a stylesheet selector (`header:has(tabs) tabs`) it made the
     * browser re-match the whole document on every DOM change — measured at
     * 7–13ms of style recalculation per changed frame, for each such rule.
     *
     * The strip's active pill slides between tabs (src/shared/sliding-pill.js).
     *
     * @param ctx - client context.
     * @param ui - shared handle table.
     * @returns teardown.
     */
    function installViewTabs(ctx, ui) {
      const HEADER = '[class*="header"]:has([class*="_tabs"])'
      const STRIP = `${HEADER} [class*="_tabs"]`
      /**
       * The title's TEXT, not its row or cluster: `.titleRow` is a flex row and the
       * cluster takes up the slack, so testing against them reported a clash on
       * every window and the strip never lifted. The crumb is the content-sized
       * element that actually draws the words.
       */
      const TITLE = '[class*="crumbCurrent"], [class*="crumb"], [class*="titleCluster"]'
      const ACTIONS = '[class*="headerActions"], [class*="headerUtilities"]'
      /** The stylesheet's fallback: the strip's own row, 10px up from y=50. */
      const FALLBACK = -10
      /** The header's own top inset; the lifted strip may not enter it. */
      const TOP_INSET = 8
      /** Breathing room between the lifted strip and whatever shares the line. */
      const CLEARANCE = 6
      let last = null
      /** The element last was written to: a re-rendered strip must be told again. */
      let lastEl = null
      /** The body marker the stylesheet reads for the fixed titlebar placement. */
      const TITLEBAR_ATTR = 'data-dsh-titlebar-tabs'
      /** Whether the last pass saw the host's Windows titlebar marker. */
      let titlebar = false
      /** The strip attribute every strip rule in view-tabs.css keys on. */
      const STRIP_ATTR = 'data-dsh-view-tabs'
      /** The strip last stamped, so a re-rendered strip is stamped again. */
      let stamped = null
      const pill = createSlidingPill('[aria-selected="true"]')

      /**
       * Mirror the host's Windows titlebar marker onto <body>, the way D9 moves
       * structure-sensitive branches from CSS to a JS-written attribute. The
       * observer's attributeFilter is aria-* only, so this write cannot feed
       * itself another pass; value-change only, so an unchanged mode writes
       * nothing.
       */
      function syncTitlebar() {
        const next = document.documentElement.hasAttribute('data-windows-titlebar')
        if (next === titlebar) return
        titlebar = next
        if (next) document.body.setAttribute(TITLEBAR_ATTR, '')
        else document.body.removeAttribute(TITLEBAR_ATTR)
      }

      function rect(el) {
        if (el === null || el === undefined) return null
        const box = el.getBoundingClientRect()
        if (box.width === 0 && box.height === 0) return null
        return box
      }

      /** The boxes the strip would share the title's line with. */
      function neighbours(header) {
        const out = []
        const title = titleBoxOf(header)
        const actions = rect(header.querySelector(ACTIONS))
        if (title !== null) out.push(title)
        if (actions !== null) out.push(actions)
        return out
      }

      /**
       * The title's box. `querySelector` on the selector list returns the first
       * match in DOCUMENT order, which is the wrapper (`.titleCluster` contains
       * the crumb) — and the wrapper stretches, so the strip never lifted. Take
       * the narrowest match instead: that is the element drawing the words.
       */
      function titleBoxOf(header) {
        const all = header.querySelectorAll(TITLE)
        let best = null
        for (let i = 0; i < all.length; i++) {
          const box = rect(all[i])
          if (box === null) continue
          if (best === null || box.width <= best.width) best = box
        }
        return best
      }

      /** Stamp the strip the stylesheet styles; a strip React replaced gives its stamp up. */
      function stampStrip(strip) {
        if (strip === stamped) return
        if (stamped !== null) stamped.removeAttribute(STRIP_ATTR)
        stamped = strip
        if (strip !== null) strip.setAttribute(STRIP_ATTR, '')
      }

      function sync() {
        syncTitlebar()
        const header = document.querySelector(HEADER)
        const strip = header === null ? null : header.querySelector('[class*="_tabs"]')
        stampStrip(strip)
        pill.sync(strip)
        if (strip === null) return
        // Windows titlebar mode places the strip itself (view-tabs.css): it is
        // fixed there, so neither the measured shift nor the fallback applies.
        if (titlebar) return
        const stripBox = rect(strip)
        if (stripBox === null) return
        const headerBox = rect(header)
        if (headerBox === null) return
        // The strip's own layout position, with the shift we may already have
        // applied taken back out: rect.top moves with the transform.
        let applied = parseFloat(strip.style.getPropertyValue('--dsh-view-tabs-shift'))
        if (!isFinite(applied)) applied = FALLBACK
        const naturalTop = stripBox.top - applied
        const titleBox = titleBoxOf(header)
        let shift = FALLBACK
        if (titleBox !== null) {
          let want = titleBox.top + titleBox.height / 2 - naturalTop - stripBox.height / 2
          // Room above: the lifted strip stays under the header's top inset.
          const top = naturalTop + want
          if (top < headerBox.top + TOP_INSET) want = headerBox.top + TOP_INSET - naturalTop
          // Room sideways: centred, it must clear the title and the actions.
          const left = stripBox.left
          const right = stripBox.right
          let clash = false
          const others = neighbours(header)
          for (let i = 0; i < others.length; i++) {
            const box = others[i]
            if (box === null) continue
            if (right > box.left - CLEARANCE && left < box.right + CLEARANCE) clash = true
          }
          if (!clash) shift = Math.round(want)
        }
        if (shift === last && strip === lastEl) return
        last = shift
        lastEl = strip
        strip.style.setProperty('--dsh-view-tabs-shift', `${shift}px`)
      }

      ui.viewTabs = { sync }

      return () => {
        if (titlebar) {
          document.body.removeAttribute(TITLEBAR_ATTR)
          titlebar = false
        }
        const header = document.querySelector(HEADER)
        const strip = header === null ? null : header.querySelector('[class*="_tabs"]')
        if (strip !== null) strip.style.removeProperty('--dsh-view-tabs-shift')
        pill.release()
        stampStrip(null)
        last = null
        lastEl = null
        delete ui.viewTabs
      }
    }
