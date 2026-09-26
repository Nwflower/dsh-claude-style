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
     * placed fixed in the titlebar row, centred (chrome.css). This mirrors that
     * marker onto <body> so the stylesheet can switch, and skips the measured
     * shift entirely there.
     *
     * The strip's active pill slides between tabs. It is one pseudo-element on
     * the strip (chrome.css), placed by two custom properties this writes from
     * the active tab's box: `--dsh-view-tabs-pill-x` and `--dsh-view-tabs-pill-w`.
     * The `data-dsh-view-tabs-pill` attribute brings the pseudo-element into
     * being, and it is set in the same frame as the first placement, so the pill
     * appears where it belongs and only later moves animate. Without the
     * attribute (this feature retired) the active tab keeps its own background.
     *
     * @param ctx - client context.
     * @param ui - shared handle table.
     * @returns teardown.
     */
    function installViewTabs(ctx, ui) {
      var HEADER = '[class*="header"]:has([class*="_tabs"])'
      var STRIP = HEADER + ' [class*="_tabs"]'
      /**
       * The title's TEXT, not its row or cluster: `.titleRow` is a flex row and the
       * cluster takes up the slack, so testing against them reported a clash on
       * every window and the strip never lifted. The crumb is the content-sized
       * element that actually draws the words.
       */
      var TITLE = '[class*="crumbCurrent"], [class*="crumb"], [class*="titleCluster"]'
      var ACTIONS = '[class*="headerActions"], [class*="headerUtilities"]'
      /** The stylesheet's fallback: the strip's own row, 10px up from y=50. */
      var FALLBACK = -10
      /** The header's own top inset; the lifted strip may not enter it. */
      var TOP_INSET = 8
      /** Breathing room between the lifted strip and whatever shares the line. */
      var CLEARANCE = 6
      var last = null
      /** The element last was written to: a re-rendered strip must be told again. */
      var lastEl = null
      /** The body marker the stylesheet reads for the fixed titlebar placement. */
      var TITLEBAR_ATTR = 'data-dsh-titlebar-tabs'
      /** Whether the last pass saw the host's Windows titlebar marker. */
      var titlebar = false
      /** The strip attribute the stylesheet draws the sliding pill for. */
      var PILL_ATTR = 'data-dsh-view-tabs-pill'
      /** The pill's last written offset and width, and the strip they went to. */
      var pillX = null
      var pillW = null
      var pillEl = null
      /**
       * Tab widths change without a DOM mutation when a font finishes loading;
       * the strip hugs its tabs, so its own size change re-places the pill.
       */
      var pillObserver = new ResizeObserver(function () {
        if (pillEl !== null) syncPill(pillEl)
      })

      /**
       * Mirror the host's Windows titlebar marker onto <body>, the way D9 moves
       * structure-sensitive branches from CSS to a JS-written attribute. The
       * observer's attributeFilter is aria-* only, so this write cannot feed
       * itself another pass; value-change only, so an unchanged mode writes
       * nothing.
       */
      function syncTitlebar() {
        var next = document.documentElement.hasAttribute('data-windows-titlebar')
        if (next === titlebar) return
        titlebar = next
        if (next) document.body.setAttribute(TITLEBAR_ATTR, '')
        else document.body.removeAttribute(TITLEBAR_ATTR)
      }

      function rect(el) {
        if (el === null || el === undefined) return null
        var box = el.getBoundingClientRect()
        if (box.width === 0 && box.height === 0) return null
        return box
      }

      /** The boxes the strip would share the title's line with. */
      function neighbours(header) {
        var out = []
        var title = titleBoxOf(header)
        var actions = rect(header.querySelector(ACTIONS))
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
        var all = header.querySelectorAll(TITLE)
        var best = null
        for (var i = 0; i < all.length; i++) {
          var box = rect(all[i])
          if (box === null) continue
          if (best === null || box.width <= best.width) best = box
        }
        return best
      }

      /**
       * Place the sliding pill under the active tab. The offset is taken from
       * the two boxes' left edges, so the strip's own transform (the measured
       * shift, the titlebar centring) moves both alike and cancels out.
       */
      function syncPill(strip) {
        if (strip !== pillEl) {
          if (pillEl !== null) pillObserver.unobserve(pillEl)
          pillEl = strip
          pillX = null
          pillW = null
          pillObserver.observe(strip)
        }
        var active = strip.querySelector('[aria-selected="true"]')
        var stripBox = rect(strip)
        var tabBox = rect(active)
        if (stripBox === null || tabBox === null) {
          if (strip.hasAttribute(PILL_ATTR)) strip.removeAttribute(PILL_ATTR)
          pillX = null
          pillW = null
          return
        }
        var x = Math.round((tabBox.left - stripBox.left - strip.clientLeft) * 100) / 100
        var w = Math.round(tabBox.width * 100) / 100
        if (x === pillX && w === pillW) return
        pillX = x
        pillW = w
        strip.style.setProperty('--dsh-view-tabs-pill-x', x + 'px')
        strip.style.setProperty('--dsh-view-tabs-pill-w', w + 'px')
        if (!strip.hasAttribute(PILL_ATTR)) strip.setAttribute(PILL_ATTR, '')
      }

      function sync() {
        syncTitlebar()
        var header = document.querySelector(HEADER)
        if (header === null) return
        var strip = header.querySelector('[class*="_tabs"]')
        if (strip === null) return
        syncPill(strip)
        // Windows titlebar mode places the strip itself (chrome.css): it is
        // fixed there, so neither the measured shift nor the fallback applies.
        if (titlebar) return
        var stripBox = rect(strip)
        if (stripBox === null) return
        var headerBox = rect(header)
        if (headerBox === null) return
        // The strip's own layout position, with the shift we may already have
        // applied taken back out: rect.top moves with the transform.
        var applied = parseFloat(strip.style.getPropertyValue('--dsh-view-tabs-shift'))
        if (!isFinite(applied)) applied = FALLBACK
        var naturalTop = stripBox.top - applied
        var titleBox = titleBoxOf(header)
        var shift = FALLBACK
        if (titleBox !== null) {
          var want = titleBox.top + titleBox.height / 2 - naturalTop - stripBox.height / 2
          // Room above: the lifted strip stays under the header's top inset.
          var top = naturalTop + want
          if (top < headerBox.top + TOP_INSET) want = headerBox.top + TOP_INSET - naturalTop
          // Room sideways: centred, it must clear the title and the actions.
          var left = stripBox.left
          var right = stripBox.right
          var clash = false
          var others = neighbours(header)
          for (var i = 0; i < others.length; i++) {
            var box = others[i]
            if (box === null) continue
            if (right > box.left - CLEARANCE && left < box.right + CLEARANCE) clash = true
          }
          if (!clash) shift = Math.round(want)
        }
        if (shift === last && strip === lastEl) return
        last = shift
        lastEl = strip
        strip.style.setProperty('--dsh-view-tabs-shift', shift + 'px')
      }

      ui.viewTabs = { sync: sync }

      return function () {
        if (titlebar) {
          document.body.removeAttribute(TITLEBAR_ATTR)
          titlebar = false
        }
        var header = document.querySelector(HEADER)
        var strip = header === null ? null : header.querySelector('[class*="_tabs"]')
        if (strip !== null) strip.style.removeProperty('--dsh-view-tabs-shift')
        pillObserver.disconnect()
        if (pillEl !== null) {
          pillEl.removeAttribute(PILL_ATTR)
          pillEl.style.removeProperty('--dsh-view-tabs-pill-x')
          pillEl.style.removeProperty('--dsh-view-tabs-pill-w')
        }
        pillEl = null
        pillX = null
        pillW = null
        last = null
        lastEl = null
        delete ui.viewTabs
      }
    }
