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
      // The host's own model seat, the way ui-conversation renders it. It lands
      // after boot, so the skin's next pass is what builds its trigger in it.
      var card = document.createElement('div')
      card.setAttribute('data-composer-card', '')
      card.innerHTML = '<div data-slot="conversation.input.model" style="display:contents">' +
        '<div class="_m_root_1"><button type="button" class="_m_trigger_1">GLM-5.3</button></div></div>'
      document.body.appendChild(card)
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
          var value = meter === null ? null : meter.querySelector('.dsh-claude-peakrate-value')
          var countdown = meter === null ? null : meter.querySelector('.dsh-claude-peakrate-countdown')
          var box = option.getBoundingClientRect()
          var style = getComputedStyle(option)
          rows.push({
            name: name === null ? '' : name.textContent,
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
              beforeCheck: meter.nextElementSibling === check,
              title: meter.getAttribute('title'),
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
      card.remove()
    })
  })
})()
