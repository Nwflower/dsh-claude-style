/**
 * The model picker with no API key configured: the host's API-key route
 * advertises no models, the reader is signed in to the account route, and a
 * quick provider is chosen. The account must lead the first level beside that
 * provider and stay out of More models.
 */
(function () {
  var probe = window.__dshSmokeProbe
  var sleep = probe.sleep
  var r = probe.report

  probe.step(async function () {
    await probe.onlyFor(['model-account'], async function () {
      await sleep(400)

      /** The names of one card's model rows. */
      var names = function (card) {
        var rows = []
        if (card === null) return rows
        var options = card.querySelectorAll('.dsh-claude-model-option')
        for (var i = 0; i < options.length; i++) {
          var name = options[i].querySelector('.dsh-claude-model-name')
          rows.push(name === null ? '' : name.textContent)
        }
        return rows
      }

      var trigger = document.querySelector('.dsh-claude-model-btn')
      if (trigger !== null) trigger.click()
      await sleep(300)
      var main = document.querySelector('.dsh-claude-model-popover:not(.dsh-claude-model-popover-sub)')
      var rule = main === null ? null : main.querySelector('.dsh-claude-model-rule-name')
      var cell = main === null ? null : main.querySelector('.dsh-claude-model-cell')
      if (cell !== null) cell.click()
      await sleep(300)
      r.modelAccount = {
        lead: rule === null ? null : rule.textContent,
        levelOne: names(main),
        levelTwo: names(document.querySelector('.dsh-claude-model-popover-sub')),
      }
    })
  })
})()
