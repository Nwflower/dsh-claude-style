/**
 * The context-statistics case: the session's meter, the host panel it opens and
 * the skin's block inside it — the skeleton before the first projection frame,
 * the numbers that replace it, a rewrite while the popover is open, and the ring
 * the composer row carries after the seat box.
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
      // The dock owns the strip's band: the plugin draws its strip inside the
      // dock's own box, so the pass's reading of the two is the real one. The
      // host's own placement is what the stats-inline case asserts, so the dock's
      // computed position stays the host's.
      statsDock.style.position = 'relative'
      await sleep(300)
      var statsMeter = document.querySelector('[data-dsh-claude-context-meter]')
      // The face the panel hangs from: the ring the skin draws in the row, or
      // the host's own meter wherever the host keeps it.
      var statsRing = document.querySelector('[data-dsh-claude-meter-ring]')
      var statsFace = statsRing === null ? statsMeter : statsRing
      if (statsFace !== null) statsFace.dispatchEvent(new MouseEvent('mouseenter'))
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
      // The first projection frame: the numbers replace the place, in full. The
      // count they run to changes the block's width, so the panel's own size
      // settles only after it lands; the alignment follows that size.
      window.__pushStats('sessionStats', { turns: 2, steps: 3, llmMs: 1200, toolMs: 400, ttftMs: 800, ttftSteps: 1, decodeMs: 2000, decodeTokens: 210 })
      window.__pushStats('tokenUsage', { uncachedInputTokens: 1000, outputTokens: 105, cacheReadTokens: 9000, cacheWriteTokens: 0 })
      await sleep(450)
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
      // The meter's reading is a pie in both positions: the surface the numbers
      // live on never changes the reading's own look. The ring the skin draws
      // carries it in this position, the host's meter in the other.
      r.context.meterPie = statsFace !== null && statsFace.hasAttribute('data-dsh-claude-meter-pie')
      // A press on the ring whose panel the dwell opened leaves the panel up:
      // the host's trigger toggles on a click, and the skin hands the press to
      // that trigger rather than letting the host read it as a press outside.
      // The press is the one the reader makes, on the face the panel hangs from.
      var faceButton = statsFace === null ? null : statsFace.querySelector('button')
      if (faceButton !== null) {
        faceButton.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, isPrimary: true, button: 0 }))
        faceButton.click()
      }
      await sleep(150)
      r.meterPanelAfterPress = statsPanel !== null && statsPanel.isConnected
      r.meterExpandedAfterPress = statsMeter === null ? null : statsMeter.querySelector('button').getAttribute('aria-expanded')
      r.context.hostRows = statsPanel === null ? 0 : statsPanel.querySelectorAll('dl dt').length
      // The panel is the host's and it places from the anchor's left edge; the
      // skin hands over the left value that puts the panel's right edge on the
      // face the reader pressed — or on the viewport margin when the panel is
      // wider than the room left of the window's edge.
      var statsWidth = statsPanel === null ? 0 : statsPanel.offsetWidth
      var statsFaceRight = statsFace === null ? 0 : Math.round(statsFace.getBoundingClientRect().right)
      var statsLeft = statsPanel === null ? NaN : parseInt(statsPanel.style.getPropertyValue('--dsh-claude-context-panel-left'), 10)
      r.context.aligned = statsPanel !== null && statsPanel.hasAttribute('data-dsh-claude-context-aligned')
      r.context.edgeAligned = statsPanel !== null && statsWidth > 0 && !isNaN(statsLeft) &&
        (Math.abs(statsLeft + statsWidth - statsFaceRight) <= 1 ||
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
      // from the new value, with no pass and no second hover. The figures count
      // to the new reading (features/context-stats/stats-count.ts), so the
      // reading waits for the count to arrive and the value part way there is
      // neither the one before nor the one it heads for.
      window.__pushStats('sessionStats', { llmMs: 61000 })
      await sleep(120)
      var statsDuring = document.querySelector('.dsh-claude-context-stats .dsh-claude-context-stats-value')
      r.context.pushedDuring = statsDuring === null ? null : (statsDuring.textContent || '').trim()
      await sleep(330)
      var statsPushed = document.querySelector('.dsh-claude-context-stats .dsh-claude-context-stats-value')
      r.context.pushed = statsPushed === null ? null : (statsPushed.textContent || '').trim()
      if (statsFace !== null) statsFace.dispatchEvent(new MouseEvent('mouseleave'))
      await sleep(500)
      r.context.closedAfterLeave = document.querySelector('.dsh-claude-context-stats') === null
      // The ring the skin draws stands in the row after the seat box, and the
      // host's meter keeps the dock the host renders it in, unpainted: the row
      // lays the ring out, so nothing has to keep room for it.
      var rowBox = function (node) {
        if (node === null) return null
        var box = node.getBoundingClientRect()
        return { left: Math.round(box.left), right: Math.round(box.right), top: Math.round(box.top), bottom: Math.round(box.bottom), height: Math.round(box.height) }
      }
      var seatBoxNode = document.querySelector('.dsh-claude-model-seat')
      var ringButton = statsRing === null ? null : statsRing.querySelector('button')
      var ringValue = ringButton === null ? null : ringButton.querySelector('span')
      var pieImage = ringButton === null ? null : getComputedStyle(ringButton).backgroundImage
      var pieDraw = pieImage === null || pieImage === 'none' ? null : decodeURIComponent(pieImage)
      var ringRamp = statsRing === null ? null : statsRing.getAttribute('data-dsh-claude-ramp')
      r.context.meterRow = {
        ring: rowBox(statsRing),
        seat: rowBox(seatBoxNode),
        meterDisplay: statsMeter === null ? null : getComputedStyle(statsMeter).display,
        // The two stand on one line, the ring after the seat, inside the card:
        // the row's own layout is the room the ring takes.
        oneLine: statsRing !== null && seatBoxNode !== null && rowBox(statsRing).top >= rowBox(seatBoxNode).top && rowBox(statsRing).bottom <= rowBox(seatBoxNode).bottom,
        afterSeat: statsRing !== null && seatBoxNode !== null && rowBox(statsRing).left >= rowBox(seatBoxNode).right,
        insideCard: statsRing !== null && statsCard !== null && rowBox(statsRing).right <= rowBox(statsCard).right,
        cardOverflow: statsCard === null ? null : statsCard.scrollWidth - statsCard.clientWidth,
        reading: statsRing === null ? null : (statsRing.textContent || '').trim(),
        hostReading: statsMeter === null ? null : (statsMeter.textContent || '').trim(),
        label: ringButton === null ? null : ringButton.getAttribute('aria-label'),
        hostLabel: statsMeter === null ? null : statsMeter.querySelector('button').getAttribute('aria-label'),
        ramped: ringRamp === 'context',
        pieTone: pieDraw !== null && ringValue !== null && pieDraw.indexOf('fill="' + getComputedStyle(ringValue).color + '"') !== -1,
      }
      // A new reading on the host's own ring — the words a host serving no
      // context-pressure projection is read by — reaches the ring the skin
      // draws, without any room being measured for it.
      var meterReading = statsMeter === null ? null : statsMeter.querySelector('button > span')
      if (statsMeter !== null) statsMeter.style.display = 'none'
      if (meterReading !== null) meterReading.textContent = meterReading.textContent === '43%' ? '44%' : '43%'
      statsCard.appendChild(document.createElement('span'))
      await sleep(400)
      if (statsMeter !== null) statsMeter.style.display = ''
      r.context.meterReadingMoved = {
        host: meterReading === null ? null : (meterReading.textContent || '').trim(),
        ring: statsRing === null ? null : (statsRing.textContent || '').trim(),
      }

      // The composer feature leaves the page while its scope preference is off.
      // The ring goes with the seat box it stood behind, and the host's own
      // meter takes its place back.
      window.__pushForm({ composerScope: 'off' })
      await sleep(600)
      r.context.composerOff = {
        gate: document.body.hasAttribute('data-dsh-claude-composer-active'),
        marked: statsMeter !== null && statsMeter.hasAttribute('data-dsh-claude-context-meter'),
        ringGone: document.querySelector('[data-dsh-claude-meter-ring]') === null,
        meterDisplay: statsMeter === null ? null : getComputedStyle(statsMeter).display,
        ramp: statsMeter === null ? null : statsMeter.getAttribute('data-dsh-claude-ramp'),
        pie: statsMeter !== null && statsMeter.hasAttribute('data-dsh-claude-meter-pie'),
      }
      window.__pushForm({ composerScope: 'all' })
      await sleep(600)
      r.context.composerBack = {
        gate: document.body.hasAttribute('data-dsh-claude-composer-active'),
        marked: statsMeter !== null && statsMeter.hasAttribute('data-dsh-claude-context-meter'),
        ringBack: document.querySelector('[data-dsh-claude-meter-ring]') !== null,
      }
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
      var cacheFigure = cache === null ? null : cache.querySelector('.dsh-claude-digit-group')
      var cacheTail = cache === null ? null : cache.querySelector('.dsh-claude-inline-tail')
      var cacheLabel = cache === null ? null : cache.querySelector('.dsh-claude-inline-label')
      var meterTrigger = meter === null ? null : meter.querySelector('button')
      var meterRing = meterTrigger === null ? null : meterTrigger.querySelector('svg')
      var meterReading = meterTrigger === null ? null : meterTrigger.querySelector('span')
      var pieImage = meterTrigger === null ? null : getComputedStyle(meterTrigger).backgroundImage
      var pieDraw = pieImage === null || pieImage === 'none' ? null : decodeURIComponent(pieImage)
      var readingColor = meterReading === null ? null : getComputedStyle(meterReading).color
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
        glyphs: line === null ? 0 : line.querySelectorAll('svg, img').length,
        rowDisplay: row === null ? null : getComputedStyle(row).display,
        dockPosition: dock === null ? null : getComputedStyle(dock).position,
        meterPosition: meter === null ? null : getComputedStyle(meter).position,
        cacheRamp: cache === null ? null : {
          span: cache.getAttribute('data-dsh-claude-ramp-span'),
          // The band reaches the figure and the percent sign after it; the
          // label before them keeps the line's own colour.
          color: cacheFigure === null ? null : getComputedStyle(cacheFigure).color,
          tail: cacheTail === null ? null : getComputedStyle(cacheTail).color,
        },
        meterRamp: meter === null ? null : {
          kind: meter.getAttribute('data-dsh-claude-ramp'),
          span: meter.getAttribute('data-dsh-claude-ramp-span'),
        },
        cacheLabelColor: cacheLabel === null ? null : getComputedStyle(cacheLabel).color,
        // The meter's reading is a pie in the band's own colour: the host's ring
        // is hidden inside the cell it keeps, and the trigger's background is
        // the image the browser half computed.
        pie: meter !== null && meter.hasAttribute('data-dsh-claude-meter-pie'),
        ringVisibility: meterRing === null ? null : getComputedStyle(meterRing).visibility,
        pieTone: pieDraw !== null && readingColor !== null &&
          pieDraw.indexOf('fill="' + readingColor + '"') !== -1,
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
      // The exact-reading checks below switch away from the default units;
      // the first reading above has already judged that default.
      window.__pushForm({ statsFooterTokenFormat: 'digits' })
      await sleep(400)
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
      // A new reading: the figures count to it instead of re-entering character
      // by character. Read them just after the push, part way through the
      // count's stretch, and once it has arrived.
      var readFigures = function () {
        return line === null ? [] : Array.prototype.map.call(line.querySelectorAll(visible + ' .dsh-claude-digit-group'), function (group) {
          return (group.textContent || '').trim()
        })
      }
      var countBefore = readFigures()
      window.__pushStats('sessionStats', { turns: 8, steps: 400, decodeMs: 2000, decodeTokens: 240 })
      await sleep(70)
      var countDuring = readFigures()
      await sleep(700)
      var countAfter = readFigures()
      r.statsInline.count = { before: countBefore, during: countDuring, after: countAfter }
      // The choice the other way, live: the popover's own surface takes the
      // numbers back and the line goes.
      window.__pushForm({ statsPosition: 'context' })
      await sleep(600)
      r.statsInline.backAttr = document.body.getAttribute('data-dsh-claude-stats-position')
      r.statsInline.backLine = document.querySelectorAll('[data-dsh-claude-inline-stats]').length
    })
  })
})()
