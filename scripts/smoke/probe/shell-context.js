/**
 * The context-statistics case: the session's meter, the host panel it opens and
 * the skin's block inside it — the skeleton before the first projection frame,
 * the numbers that replace it, a rewrite while the popover is open, and the room
 * the row keeps for the meter.
 */
(function () {
  var probe = window.__dshSmokeProbe
  var sleep = probe.sleep
  var r = probe.report

  probe.step(async function () {
    await probe.onlyFor(['context-stats', 'stats-compact'], async function () {
      // The shown conversation, marked the way the host marks it: the skin reads
      // the session id off the conversation column, so the card and its dock are
      // wrapped in the case's own phase/column pair (the dock stays the card's
      // next sibling, which is what the composer pass measures).
      var statsCard = document.querySelector('[data-composer-card]')
      var statsDock = statsCard.nextElementSibling
      var statsPhase = document.createElement('div')
      statsPhase.setAttribute('data-phase', 'active')
      var statsColumn = document.createElement('div')
      statsColumn.setAttribute('data-conversation-session', 'smoke-stats')
      statsCard.parentElement.insertBefore(statsPhase, statsCard)
      statsPhase.appendChild(statsColumn)
      statsColumn.appendChild(statsCard)
      statsColumn.appendChild(statsDock)
      await sleep(300)
      var statsMeter = document.querySelector('[data-dsh-claude-context-meter]')
      if (statsMeter !== null) statsMeter.dispatchEvent(new MouseEvent('mouseenter'))
      await sleep(700)
      // No projection frame yet: the block holds the numbers' place, under the
      // host's own headings, at a row's own size.
      var statsSkeleton = document.querySelector('[data-dsh-claude-context-skeleton]')
      r.context = {
        panelStamped: document.querySelector('[data-dsh-claude-context-panel]') !== null,
        skeletonSections: statsSkeleton === null ? null : Array.prototype.map.call(statsSkeleton.querySelectorAll('.dsh-claude-context-stats-section'), function (s) {
          return (s.textContent || '').trim()
        }),
        skeletonRows: statsSkeleton === null ? 0 : statsSkeleton.querySelectorAll('.dsh-claude-context-stats-skeleton-value').length,
        skeletonItemHeight: statsSkeleton === null ? null : Math.round(statsSkeleton.querySelector('.dsh-claude-context-stats-item').getBoundingClientRect().height),
      }
      // The first projection frame: the numbers replace the place, in full.
      window.__pushStats('sessionStats', { turns: 2, steps: 3, llmMs: 1200, toolMs: 400, ttftMs: 800, ttftSteps: 1, decodeMs: 2000, decodeTokens: 210 })
      window.__pushStats('tokenUsage', { uncachedInputTokens: 1000, outputTokens: 105, cacheReadTokens: 9000, cacheWriteTokens: 0 })
      await sleep(200)
      var statsBlock = document.querySelector('.dsh-claude-context-stats')
      var statsPanel = statsBlock === null ? null : statsBlock.closest('[role="dialog"]')
      r.context.opened = statsPanel !== null
      // Another plugin's popover is on the page, holding a `dl` of its own, and
      // it carries what a generation before this one left on it. The block is
      // the host's panel's, and none of that is left on the popover.
      r.context.panelId = statsPanel === null ? null : statsPanel.id
      r.context.strayBlockGone = document.getElementById('stray-context-block') === null
      var foreignPopover = document.getElementById('foreign-popover')
      r.context.foreignUnmarked = foreignPopover !== null &&
        !foreignPopover.hasAttribute('data-dsh-claude-context-panel') &&
        !foreignPopover.hasAttribute('data-dsh-claude-context-aligned')
      r.context.expanded = statsMeter === null ? null : statsMeter.querySelector('button').getAttribute('aria-expanded')
      r.context.hostRows = statsPanel === null ? 0 : statsPanel.querySelectorAll('dl dt').length
      // The panel is the host's and it places from the anchor's left edge; the
      // skin hands over the left value that puts the panel's right edge on the
      // meter's — or on the viewport margin when the panel is wider than the
      // room left of the window's edge.
      var statsWidth = statsPanel === null ? 0 : statsPanel.offsetWidth
      var statsMeterRight = statsMeter === null ? 0 : Math.round(statsMeter.getBoundingClientRect().right)
      var statsLeft = statsPanel === null ? NaN : parseInt(statsPanel.style.getPropertyValue('--dsh-claude-context-panel-left'), 10)
      r.context.aligned = statsPanel !== null && statsPanel.hasAttribute('data-dsh-claude-context-aligned')
      r.context.edgeAligned = statsPanel !== null && statsWidth > 0 && !isNaN(statsLeft) &&
        (statsLeft + statsWidth === statsMeterRight ||
          statsLeft === 12 ||
          statsLeft === window.innerWidth - statsWidth - 12)
      r.context.skeletonGone = statsBlock !== null && !statsBlock.hasAttribute('data-dsh-claude-context-skeleton')
      r.context.sections = statsBlock === null ? null : Array.prototype.map.call(statsBlock.querySelectorAll('.dsh-claude-context-stats-section'), function (s) {
        return (s.textContent || '').trim()
      })
      r.context.labels = statsBlock === null ? null : Array.prototype.map.call(statsBlock.querySelectorAll('.dsh-claude-context-stats-label'), function (s) {
        return (s.textContent || '').trim()
      })
      r.context.values = statsBlock === null ? null : Array.prototype.map.call(statsBlock.querySelectorAll('.dsh-claude-context-stats-value'), function (s) {
        return (s.textContent || '').trim()
      })
      // A projection frame while the popover is open: the block is rewritten
      // from the new value, with no pass and no second hover.
      window.__pushStats('sessionStats', { llmMs: 61000 })
      await sleep(150)
      var statsPushed = document.querySelector('.dsh-claude-context-stats .dsh-claude-context-stats-value')
      r.context.pushed = statsPushed === null ? null : (statsPushed.textContent || '').trim()
      if (statsMeter !== null) statsMeter.dispatchEvent(new MouseEvent('mouseleave'))
      await sleep(500)
      r.context.closedAfterLeave = document.querySelector('.dsh-claude-context-stats') === null
      // The room the skin keeps for the meter is what holds the model trigger
      // clear of the ring. A pass that measures the meter with no box — the seat
      // is display: none while another conversation tab is up — is no reading,
      // so the row keeps its room and the pass after the box returns measures
      // again. Taking the room away here left the trigger under the ring until
      // the reading itself moved.
      r.context.roomBefore = document.body.style.getPropertyValue('--dsh-claude-meter-room')
      // The host rewrites the reading beside the ring (ContextMeter's `<span>`).
      var meterReading = statsMeter === null ? null : statsMeter.querySelector('button > span')
      if (statsMeter !== null) statsMeter.style.display = 'none'
      if (meterReading !== null) meterReading.textContent = meterReading.textContent === '43%' ? '44%' : '43%'
      statsCard.appendChild(document.createElement('span'))
      await sleep(400)
      if (statsMeter !== null) statsMeter.style.display = ''
      statsCard.appendChild(document.createElement('span'))
      await sleep(400)
      r.context.roomAfter = document.body.style.getPropertyValue('--dsh-claude-meter-room')
    })
  })

  // The numbers asked onto a line of their own: the host's words around the
  // host's figures, no glyph of the host's row, the cache share and the meter
  // each taking their colour band, and the line giving way to the popover the
  // moment the choice moves back.
  probe.step(async function () {
    await probe.onlyFor(['stats-inline'], async function () {
      var card = document.querySelector('[data-composer-card]')
      var dock = card.nextElementSibling
      var phase = document.createElement('div')
      phase.setAttribute('data-phase', 'active')
      var column = document.createElement('div')
      column.setAttribute('data-conversation-session', 'smoke-stats')
      card.parentElement.insertBefore(phase, card)
      phase.appendChild(column)
      column.appendChild(card)
      column.appendChild(dock)
      // The figures the reader asked for: 2 turns and 374 steps, 279 tok/s, a
      // prompt of 777,345,457 tokens read 99% from cache, and 7,345,457 written back.
      window.__pushStats('sessionStats', { turns: 2, steps: 374, decodeMs: 2000, decodeTokens: 558 })
      window.__pushStats('tokenUsage', { uncachedInputTokens: 6345457, cacheReadTokens: 771000000, cacheWriteTokens: 0, outputTokens: 7345457 })
      await sleep(400)
      var line = document.querySelector('[data-dsh-claude-inline-stats]')
      var meter = document.querySelector('[data-dsh-claude-context-meter]')
      var row = document.querySelector('[data-composer-stat]')
      var cache = line === null ? null : line.querySelector('[data-dsh-claude-ramp="cache"]')
      var stroke = function (selector) {
        var circle = meter === null ? null : meter.querySelector(selector)
        return circle === null || circle === undefined ? null : getComputedStyle(circle).stroke
      }
      // The line keeps the figures the ladder has taken away in the document
      // (they are hidden rather than removed, so they can come back), so every
      // reading below counts what the reader can see.
      var visible = '.dsh-claude-inline-seg:not([hidden])'
      var segments = function () {
        return line === null ? [] : Array.prototype.slice.call(line.querySelectorAll(visible))
      }
      r.statsInline = {
        attr: document.body.getAttribute('data-dsh-claude-stats-position'),
        text: segments().map(function (segment) { return (segment.textContent || '').trim() }).join(' · '),
        figures: line === null ? null : Array.prototype.map.call(line.querySelectorAll(visible + ' .dsh-claude-digit-group'), function (group) {
          return (group.textContent || '').trim()
        }),
        digits: line === null ? 0 : line.querySelectorAll(visible + ' .dsh-claude-digit').length,
        staggered: line === null ? 0 : line.querySelectorAll(visible + ' .dsh-claude-digit[data-stagger]').length,
        glyphs: line === null ? 0 : line.querySelectorAll('svg, img').length,
        rowDisplay: row === null ? null : getComputedStyle(row).display,
        dockPosition: dock === null ? null : getComputedStyle(dock).position,
        meterPosition: meter === null ? null : getComputedStyle(meter).position,
        cacheRamp: cache === null ? null : {
          span: cache.getAttribute('data-dsh-claude-ramp-span'),
          color: getComputedStyle(cache).color,
        },
        meterRamp: meter === null ? null : {
          kind: meter.getAttribute('data-dsh-claude-ramp'),
          span: meter.getAttribute('data-dsh-claude-ramp-span'),
        },
        ringStroke: stroke('circle[stroke-dasharray]'),
        trackStroke: stroke('circle:not([stroke-dasharray])'),
        // The figures stand apart by the line's own gap: the host's separators
        // are gone, and the line's text is what a reader would copy out of it.
        separators: line === null ? null : (line.textContent || '').split('·').length - 1,
        role: line === null ? null : line.getAttribute('role'),
      }
      // The line is the panel's second trigger: pressing it opens the panel the
      // meter owns and fills with the session's rows (stats-binding.ts).
      var panelBlock = function () { return document.querySelector('.dsh-claude-context-stats') }
      var linePanel = function () { return document.querySelector('[data-dsh-claude-context-panel]') }
      if (line !== null) {
        // The pointer path is the meter's alone; a press is what the line answers.
        line.dispatchEvent(new MouseEvent('mouseenter', { bubbles: false }))
        await sleep(300)
        r.statsInline.hoverOpened = linePanel() !== null
        line.dispatchEvent(new MouseEvent('mouseleave', { bubbles: false }))
        line.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
        await sleep(300)
        r.statsInline.panelOpened = linePanel() !== null
        r.statsInline.panelRows = panelBlock() === null ? 0 : panelBlock().querySelectorAll('.dsh-claude-context-stats-item').length
        r.statsInline.expanded = line.getAttribute('aria-expanded')
        line.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
        await sleep(300)
        r.statsInline.panelClosed = linePanel() === null
      }
      // A card too narrow for the whole line: the figures give way one step at
      // a time, in the reader's own order — the cache share's words, the turns
      // and steps, the meter's number, the two token figures in favour of one
      // total, and at the last step the counts folded into k / M / B. A card
      // with room again gets them all back.
      var fitCard = document.querySelector('[data-composer-card]')
      var wakePass = function () {
        var node = document.createElement('span')
        document.body.appendChild(node)
        document.body.removeChild(node)
      }
      var shows = function (selector) {
        var element = line === null ? null : line.querySelector(selector)
        return element === null ? null : element.getClientRects().length > 0
      }
      var readFit = function () {
        var total = line === null ? null : line.querySelector('.dsh-claude-inline-total .dsh-claude-digit-group')
        var number = meter === null ? null : meter.querySelector('button > span')
        return {
          counts: shows('.dsh-claude-inline-seg'),
          cacheLabel: shows('.dsh-claude-inline-label'),
          input: shows('.dsh-claude-inline-input'),
          output: shows('.dsh-claude-inline-output'),
          total: shows('.dsh-claude-inline-total'),
          totalText: total === null ? null : (total.textContent || '').trim(),
          meterTight: meter !== null && meter.hasAttribute('data-dsh-claude-meter-tight'),
          meterNumber: number === null ? null : number.getClientRects().length > 0,
          cardWidth: fitCard === null ? null : fitCard.clientWidth,
          needed: line === null || meter === null ? null
            : Math.round(meter.getBoundingClientRect().right - line.getBoundingClientRect().left),
          boxes: line === null || meter === null ? null : {
            line: [Math.round(line.getBoundingClientRect().left), Math.round(line.getBoundingClientRect().width)],
            meter: [Math.round(meter.getBoundingClientRect().left), Math.round(meter.getBoundingClientRect().width)],
            dock: [Math.round(fitCard.nextElementSibling.getBoundingClientRect().left), Math.round(fitCard.nextElementSibling.getBoundingClientRect().width)],
          },
        }
      }
      r.statsInline.roomy = readFit()
      var widths = ['260px', '130px']
      var fitted = []
      for (var w = 0; w < widths.length; w++) {
        fitCard.style.width = widths[w]
        wakePass()
        await sleep(350)
        fitted.push(readFit())
      }
      r.statsInline.tight = fitted[0]
      r.statsInline.tightest = fitted[1]
      fitCard.style.width = ''
      wakePass()
      await sleep(350)
      r.statsInline.backToRoom = readFit()
      // The choice the other way, live: the popover's own surface takes the
      // numbers back and the line goes.
      window.__pushForm({ statsPosition: 'context' })
      await sleep(600)
      r.statsInline.backAttr = document.body.getAttribute('data-dsh-claude-stats-position')
      r.statsInline.backLine = document.querySelectorAll('[data-dsh-claude-inline-stats]').length
    })
  })
})()
