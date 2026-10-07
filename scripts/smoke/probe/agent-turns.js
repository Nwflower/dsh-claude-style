/**
 * The turn-status case: a failed turn followed by a running one, read for each
 * turn's process control — its state, its written status, the line it draws and
 * where it sits against the turn's work.
 */
(function () {
  var probe = window.__dshSmokeProbe
  var sleep = probe.sleep
  var r = probe.report

  probe.step(async function () {
    // The chat column (ui-chat ChatView) of a failed turn followed by a running
    // one: each turn's process control renders first, then the turn's work;
    // the failed turn has its error and its footer, and a queued message
    // follows the running turn. Each status line has to show below its turn's
    // work, above what follows.
    await probe.onlyFor(['turn-status', 'switches', 'switches-off'], async function () {
      var chatSession = document.createElement('div')
      chatSession.setAttribute('data-conversation-session', 'smoke-session')
      chatSession.innerHTML = '<div data-chat-flow="" style="display:flex;flex-direction:column">' +
        '<div data-chat-flow-kind="user" data-chat-turn="1">first question</div>' +
        '<div data-chat-flow-kind="turn-process" data-chat-turn="1"><button type="button" data-turn-process="1" disabled>' +
        '<span class="_p_label_1">Failed</span></button></div>' +
        '<div data-chat-flow-kind="assistant-step" data-chat-turn="1">first work</div>' +
        '<div data-chat-flow-kind="turn-error" data-chat-turn="1">error</div>' +
        '<div data-chat-flow-kind="turn-tail" data-chat-turn="1">footer</div>' +
        '<div data-chat-flow-kind="user" data-chat-turn="2">second question</div>' +
        '<div data-chat-flow-kind="turn-process" data-chat-turn="2"><button type="button" data-turn-process="2" disabled>' +
        '<span class="_p_label_1">Deep diving for 1m 5s</span></button></div>' +
        '<div data-chat-flow-kind="assistant-step" data-chat-turn="2">second work</div>' +
        '<div class="_p_pending_1">queued</div></div>'
      document.body.appendChild(chatSession)
      await sleep(150)
      var chatRows = Array.prototype.slice.call(chatSession.querySelectorAll('[data-chat-flow] > *'))
      var statusButtons = chatSession.querySelectorAll('button[data-turn-process]')
      var seen = chatRows.slice().sort(function (a, b) { return a.getBoundingClientRect().top - b.getBoundingClientRect().top })
      var lineOf = function (button) {
        return {
          state: button.getAttribute('data-dsh-claude-turn-state'),
          text: button.getAttribute('data-dsh-claude-turn-status'),
          drawn: getComputedStyle(button, '::after').content,
          label: getComputedStyle(button.querySelector('span')).display,
          turning: getComputedStyle(button, '::before').animationName,
        }
      }
      r.turnStatus = {
        seen: seen.map(function (row) { return row.textContent }),
        failed: lineOf(statusButtons[0]),
        live: lineOf(statusButtons[1]),
      }
    })
  })
})()
