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
  var sleep = probe.sleep
  var r = probe.report

  probe.step(async function () {
    await probe.onlyFor(['model-meter'], async function () {
      await sleep(400)

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

      var trigger = document.querySelector('.dsh-claude-model-btn')
      if (trigger !== null) trigger.click()
      await sleep(400)
      var levelOne = readRows(document.querySelector('.dsh-claude-model-popover:not(.dsh-claude-model-popover-sub)'))
      // The dwell opens the card on the real page, and the reader's hand then
      // presses the trigger: the card stays up
      // (shared/popover.ts::pressKeepsPopoverOpen). The pointer is dispatched
      // before the press, the way a real one arrives.
      var triggerOpen = false
      if (trigger !== null) {
        trigger.dispatchEvent(new MouseEvent('mouseleave'))
        trigger.dispatchEvent(new MouseEvent('mouseenter'))
        await sleep(250)
        triggerOpen = document.querySelector('.dsh-claude-model-popover[data-open="true"]') !== null
        trigger.click()
        await sleep(150)
      }
      r.modelPress = {
        opened: triggerOpen,
        kept: document.querySelector('.dsh-claude-model-popover:not(.dsh-claude-model-popover-sub)[data-open="true"]') !== null,
      }

      // The More-models cell opens the second level, beside the first.
      var cell = document.querySelector('.dsh-claude-model-cell')
      if (cell !== null) cell.click()
      await sleep(300)

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
      window.__pushForm({ modelDescriptions: false })
      await sleep(250)
      var bareLevelOne = readRows(document.querySelector('.dsh-claude-model-popover:not(.dsh-claude-model-popover-sub)'))
      var bareLevelTwo = readRows(document.querySelector('.dsh-claude-model-popover-sub'))
      window.__pushForm({ modelDescriptions: true })
      await sleep(250)
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
      await sleep(400)
      var pickerOff = {
        trigger: document.querySelector('.dsh-claude-model-btn') !== null,
        hostMarked: document.querySelector('[data-dsh-claude-model-host]') !== null,
      }
      window.__pushForm({ modelPicker: true })
      await sleep(500)
      r.modelPicker = {
        off: pickerOff,
        back: {
          trigger: document.querySelector('.dsh-claude-model-btn') !== null,
          hostMarked: document.querySelector('[data-dsh-claude-model-host]') !== null,
        },
      }
      // The seat's own line carries the tag with the Flash model in force: the
      // same rule the rows use (features/model/release-tag.ts), drawn beside the
      // trigger's name. The reader picks the row; the seat names the model it
      // landed on.
      var seatTrigger = document.querySelector('.dsh-claude-model-btn')
      if (seatTrigger !== null) {
        seatTrigger.click()
        await sleep(300)
        var seatRows = document.querySelectorAll('.dsh-claude-model-popover:not(.dsh-claude-model-popover-sub) .dsh-claude-model-option')
        for (var s = 0; s < seatRows.length; s++) {
          var seatName = seatRows[s].querySelector('.dsh-claude-model-name')
          if (seatName !== null && seatName.textContent === 'V4.1 Flash') {
            seatRows[s].click()
            break
          }
        }
        await sleep(600)
      }
      var seatBtn = document.querySelector('.dsh-claude-model-btn')
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
      await sleep(250)
      var externalTrigger = externalSlot.querySelector('.dsh-claude-' + 'model-btn')
      if (externalTrigger !== null) externalTrigger.click()
      await sleep(200)
      var mountedCount = document.querySelectorAll('.dsh-claude-' + 'model-btn').length
      var externalPopover = document.querySelector('[data-dsh-claude-' + 'model-owner^="external-"][data-open="true"]') !== null
      var externalStyle = externalTrigger === null ? null : getComputedStyle(externalTrigger)
      var externalStyleValues = externalStyle === null ? null : { display: externalStyle.getPropertyValue('display'), height: externalStyle.getPropertyValue('height'), border: externalStyle.getPropertyValue('border-top-width'), background: externalStyle.getPropertyValue('background-color') }
      var unknownRejected = false
      try { controls.mount('not-a-control', {}) } catch (error) { unknownRejected = true }
      externalStop()
      externalSlot.remove()
      await sleep(200)
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
