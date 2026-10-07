/**
 * The host's two statistics dialogs. They mount on the pill's own click, and the
 * host commits them on its own schedule: the delay here is longer than the
 * skin's read window used to be, so a read that gives up early loses the section
 * (the 'card drops to Token usage only' bug).
 */
(function () {
  var STATS_DIALOG_DELAY_MS = 500
  function mountStatsDialog(pill) {
    var kind = pill.getAttribute('data-stats-kind')
    var dialog = document.createElement('div')
    dialog.setAttribute('role', 'dialog')
    dialog.setAttribute('aria-label', kind === 'details' ? '会话统计' : 'Token 用量')
    var list = document.createElement('dl')
    list.setAttribute(kind === 'details' ? 'data-session-stats-details' : 'data-session-stats-usage', '')
    list.innerHTML = kind === 'details'
      ? '<dt>模型用时</dt><dd>1.2s</dd><dt>工具调用用时</dt><dd>0.4s</dd>'
      : '<dt>缓存命中</dt><dd>90%</dd><dt>输出</dt><dd>105 tok</dd>'
    dialog.appendChild(list)
    document.body.appendChild(dialog)
    return dialog
  }
  var statsPills = document.querySelectorAll('[data-composer-stat] button[aria-haspopup="dialog"]')
  for (var sp = 0; sp < statsPills.length; sp++) {
    (function (pill, index) {
      pill.setAttribute('data-stats-kind', index === 0 ? 'details' : 'usage')
      var dialog = null
      var timer = null
      var presses = 0
      pill.addEventListener('click', function () {
        if (dialog !== null) {
          if (dialog.parentElement) dialog.parentElement.removeChild(dialog)
          dialog = null
          pill.setAttribute('aria-expanded', 'false')
          return
        }
        // The host re-renders the row on its own schedule, and a press that lands
        // on a node React has since replaced goes nowhere: the second pill's first
        // press is swallowed here, and the skin has to press the live node again.
        if (index === 1 && presses++ === 0) return
        pill.setAttribute('aria-expanded', 'true')
        if (timer) clearTimeout(timer)
        timer = setTimeout(function () {
          timer = null
          if (pill.getAttribute('aria-expanded') === 'true') dialog = mountStatsDialog(pill)
        }, STATS_DIALOG_DELAY_MS)
      })
    })(statsPills[sp], sp)
  }
})()
