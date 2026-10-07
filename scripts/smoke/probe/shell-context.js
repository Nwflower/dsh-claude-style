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
})()
