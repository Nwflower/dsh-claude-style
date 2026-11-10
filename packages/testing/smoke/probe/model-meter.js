/**
 * The model menu and the peak rate meter on its rows: the host's model seat is
 * put on the page, the picker's trigger is pressed, and both levels are read
 * back — what each row carries and where the meter stands in it.
 *
 * The page's model directory puts the model in force in a provider level 1 does
 * not list, so the picker appends the seat's own row at the bottom of that
 * level: the row this case exists for.
 */
(function () {
  var probe = window.__dshSmokeProbe
  var r = probe.report

  probe.step(async function () {
    await probe.onlyFor(['model-meter'], async function () {
      /** Every row one card holds, with the meter's own place in it. */
      var readRows = function (card) {
        var rows = []
        if (card === null) return rows
        var options = card.querySelectorAll('.dsh-claude-model-option')
        for (var i = 0; i < options.length; i++) {
          var option = options[i]
          var meter = option.querySelector('.dsh-claude-peakrate')
          var check = option.querySelector('.dsh-claude-popover-check')
          var name = option.querySelector('.dsh-claude-model-name')
          var desc = option.querySelector('.dsh-claude-model-desc')
          var value = meter === null ? null : meter.querySelector('.dsh-claude-peakrate-value')
          var countdown = meter === null ? null : meter.querySelector('.dsh-claude-peakrate-countdown')
          // The badge rides in the tooltip anchor the skin wraps it in
          // (shared/host-tooltip.ts): the anchor is the row's own child that
          // holds the badge, and it stands where the badge stood, immediately
          // in front of the check.
          var anchor = null
          if (meter !== null) {
            for (var child = option.firstElementChild; child !== null; child = child.nextElementSibling) {
              if (child.contains(meter)) { anchor = child; break }
            }
          }
          var standing = anchor === null ? meter : anchor
          var box = option.getBoundingClientRect()
          var style = getComputedStyle(option)
          rows.push({
            name: name === null ? '' : name.textContent,
            text: (option.textContent || '').replace(/\s+/g, ' ').trim(),
            desc: desc === null ? null : desc.textContent,
            current: option.getAttribute('aria-checked') === 'true',
            // The shape every row shares: a row built apart from the others
            // shows up here before it is visible as a difference.
            box: {
              height: Math.round(box.height),
              padding: style.paddingLeft + ' ' + style.paddingRight,
              radius: style.borderRadius,
              display: style.display,
            },
            meter: meter === null ? null : {
              period: meter.getAttribute('data-period'),
              value: value === null ? '' : value.textContent,
              countdown: countdown === null ? '' : countdown.textContent,
              beforeCheck: standing !== null && standing.nextElementSibling === check,
              // The judgement the badge announces: the host's own bubble shows
              // the same words, the way the page's other controls do.
              name: meter.getAttribute('aria-label'),
              icon: meter.querySelector('svg') !== null,
            },
          })
        }
        return rows
      }

      var levelOneCard = function () { return document.querySelector('.dsh-claude-model-popover:not(.dsh-claude-model-popover-sub)') }
      /** The first level's open card and how many rows it holds, or null before it is drawn. */
      var levelOneState = function () {
        var card = levelOneCard()
        return card === null ? null : { open: card.getAttribute('data-open') === 'true', rows: readRows(card).length }
      }
      var triggers = await probe.until(function () { return document.querySelector(probe.surface('model.trigger')) },
        function (read) { return read[read.length - 1] !== null }, 'the model trigger to be seated')
      var trigger = triggers[triggers.length - 1]
      trigger.click()
      // The card and its rows are written by the pass after the press; the
      // open card carrying rows is the state this read waits for (D92).
      await probe.until(levelOneState,
        function (read) { var last = read[read.length - 1]; return last !== null && last.open && last.rows > 0 },
        'the model picker to open its first level')
      var levelOne = readRows(levelOneCard())
      // The dwell opens the card on the real page, and the reader's hand then
      // presses the trigger: the card stays up
      // (shared/popover.ts::pressKeepsPopoverOpen). The pointer is dispatched
      // before the press, the way a real one arrives.
      trigger.dispatchEvent(new MouseEvent('mouseleave'))
      trigger.dispatchEvent(new MouseEvent('mouseenter'))
      // The dwell opens the card; the press is taken on the card it left open.
      await probe.until(function () { return document.querySelector('.dsh-claude-model-popover:not(.dsh-claude-model-popover-sub)[data-open="true"]') !== null },
        function (read) { return read[read.length - 1] === true }, 'the model card to open under the pointer')
      var triggerOpen = document.querySelector('.dsh-claude-model-popover:not(.dsh-claude-model-popover-sub)[data-open="true"]') !== null
      // With hover on, the press keeps the open card by doing nothing: the
      // handler's own decision is synchronous, so the state is read when the
      // press returns.
      trigger.click()
      r.modelPress = {
        opened: triggerOpen,
        kept: document.querySelector('.dsh-claude-model-popover:not(.dsh-claude-model-popover-sub)[data-open="true"]') !== null,
      }

      // The More-models cell opens the second level, beside the first.
      var cell = document.querySelector('.dsh-claude-model-cell')
      if (cell !== null) cell.click()
      // The second level's rows are the state this read waits for.
      await probe.until(function () {
        var card = document.querySelector(probe.surface('model.sub-card'))
        return card === null ? 0 : readRows(card).length
      }, function (read) { return read[read.length - 1] > 0 }, 'the model picker to open its second level')

      r.modelMeter = {
        trigger: trigger !== null,
        levelOne: levelOne,
        // The last row of level 1 is the seat's own: a provider level 1 does
        // not list, so the picker adds that row under the list.
        currentRow: levelOne.length === 0 ? null : levelOne[levelOne.length - 1],
        levelTwo: readRows(document.querySelector('.dsh-claude-model-popover-sub')),
      }
      // The description line has a switch of its own under the picker's row, and
      // the card repaints on a preference change: the same page reads its rows
      // once with the line on and once with it off.
      var lineCount = function (rows) {
        return rows.filter(function (row) { return row.desc !== null && row.desc !== '' }).length
      }
      var firstLevelLines = function () {
        var card = levelOneCard()
        return card === null ? 0 : lineCount(readRows(card))
      }
      window.__pushForm({ modelDescriptions: false })
      // The card repaints on the pass after the preference changes; the lines
      // leaving the first level is the state this read waits for (D92).
      await probe.until(firstLevelLines, function (read) { return read[read.length - 1] === 0 },
        'the model description lines to leave the first level')
      var bareLevelOne = readRows(levelOneCard())
      var bareLevelTwo = readRows(document.querySelector(probe.surface('model.sub-card')))
      window.__pushForm({ modelDescriptions: true })
      await probe.until(firstLevelLines, function (read) { return read[read.length - 1] > 0 },
        'the model description lines to come back')
      r.modelDescriptions = {
        listed: levelOne.length,
        lines: lineCount(levelOne),
        bareListed: bareLevelOne.length,
        bareLines: lineCount(bareLevelOne),
        secondLevelLines: lineCount(r.modelMeter.levelTwo),
        bareSecondLevelLines: lineCount(bareLevelTwo),
      }
      // The picker's own switch is live: off hands the host's seat back, on
      // puts the skin's trigger into it again.
      window.__pushForm({ modelPicker: false })
      // The teardown hands the seat back on the pass after the preference
      // changes; the trigger leaving is the state this read waits for.
      await probe.until(function () { return document.querySelector(probe.surface('model.trigger')) },
        function (read) { return read[read.length - 1] === null }, 'the model picker to hand the host seat back')
      var pickerOff = {
        trigger: document.querySelector(probe.surface('model.trigger')) !== null,
        hostMarked: document.querySelector('[' + probe.surface('model.host-root') + ']') !== null,
      }
      window.__pushForm({ modelPicker: true })
      await probe.until(function () { return document.querySelector(probe.surface('model.trigger')) },
        function (read) { return read[read.length - 1] !== null }, 'the model picker to take the seat again')
      r.modelPicker = {
        off: pickerOff,
        back: {
          trigger: document.querySelector(probe.surface('model.trigger')) !== null,
          hostMarked: document.querySelector('[' + probe.surface('model.host-root') + ']') !== null,
        },
      }
      // The seat's own line carries the tag with the Flash model in force: the
      // same rule the rows use (features/model/release-tag.ts), drawn beside the
      // trigger's name. The reader picks the row; the seat names the model it
      // landed on.
      var seatTrigger = document.querySelector(probe.surface('model.trigger'))
      if (seatTrigger !== null) {
        seatTrigger.click()
        await probe.until(levelOneState,
          function (read) { var last = read[read.length - 1]; return last !== null && last.open && last.rows > 0 },
          'the model picker to open its first level again')
        var seatRows = document.querySelectorAll('.dsh-claude-model-popover:not(.dsh-claude-model-popover-sub) .dsh-claude-model-option')
        for (var s = 0; s < seatRows.length; s++) {
          var seatName = seatRows[s].querySelector('.dsh-claude-model-name')
          if (seatName !== null && seatName.textContent === 'V4.1 Flash') {
            seatRows[s].click()
            break
          }
        }
        // The seat names the model it landed on, on the pass after the pick.
        await probe.until(function () {
          var btn = document.querySelector(probe.surface('model.trigger'))
          return btn === null ? '' : btn.textContent
        }, function (read) { return (read[read.length - 1] || '').indexOf('V4.1 Flash') !== -1 },
        'the seat to name the picked model')
      }
      var seatBtn = document.querySelector(probe.surface('model.trigger'))
      var seatTag = seatBtn === null ? null : seatBtn.lastElementChild
      r.modelSeat = {
        text: seatBtn === null ? null : seatBtn.textContent,
        // The tag's own face: the pill's background is what the trigger's
        // transparent-innards rule must leave standing, and its ink is neutral
        // metadata rather than a second accent.
        tagBg: seatTag === null ? null : getComputedStyle(seatTag).backgroundColor,
        tagColor: seatTag === null ? null : getComputedStyle(seatTag).color,
      }

      var controls = window['__DSH_CLAUDE_' + 'STYLE_CONTROLS__']
      var externalSlot = document.createElement('div')
      document.body.appendChild(externalSlot)
      var externalStop = controls.mount('model-picker', {
        slot: externalSlot,
        directory: window.__dshSmokeHost.modelDirectories.directoryFor('smoke-session'),
      })
      var externalTriggers = await probe.until(function () { return externalSlot.querySelector(probe.surface('model.trigger')) },
        function (read) { return read[read.length - 1] !== null }, 'the external model picker to mount')
      var externalTrigger = externalTriggers[externalTriggers.length - 1]
      if (externalTrigger !== null) externalTrigger.click()
      // The external card opens on the pass after the press.
      await probe.until(function () { return document.querySelector('[data-dsh-claude-model-owner^="external-"][data-open="true"]') !== null },
        function (read) { return read[read.length - 1] === true }, 'the external model picker to open')
      var mountedCount = document.querySelectorAll('.dsh-claude-' + 'model-btn').length
      var externalPopover = document.querySelector('[data-dsh-claude-' + 'model-owner^="external-"][data-open="true"]') !== null
      var externalStyle = externalTrigger === null ? null : getComputedStyle(externalTrigger)
      var externalStyleValues = externalStyle === null ? null : { display: externalStyle.getPropertyValue('display'), height: externalStyle.getPropertyValue('height'), border: externalStyle.getPropertyValue('border-top-width'), background: externalStyle.getPropertyValue('background-color') }
      var unknownRejected = false
      try { controls.mount('not-a-control', {}) } catch (error) { unknownRejected = true }
      externalStop()
      externalSlot.remove()
      // The unmount takes the external trigger away; the one trigger left is
      // the primary seat's.
      await probe.until(function () { return document.querySelectorAll('.dsh-claude-' + 'model-btn').length },
        function (read) { return read[read.length - 1] === 1 }, 'the external model picker to unmount')
      r.externalControls = {
        available: controls.has('model-picker'),
        mountedCount: mountedCount,
        externalPopover: externalPopover,
        externalStyle: externalStyleValues,
        unknownRejected: unknownRejected,
        remainingCount: document.querySelectorAll('.dsh-claude-' + 'model-btn').length,
        slotClean: externalSlot.querySelector('.dsh-claude-' + 'model-btn') === null,
      }
    })
  })
})()
