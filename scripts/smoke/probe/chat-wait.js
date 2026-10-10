/**
 * The chat-wait case: the live turn's running row takes the skin's line — the
 * host's words, the turn's clock and, once the model is silent, the overtime
 * badge — and gives the host's words back when the choice is switched off.
 */
(function () {
  var probe = window.__dshSmokeProbe
  var sleep = probe.sleep
  var r = probe.report

  probe.step(async function () {
    // The host's running row (ui-chat ChatView's RunningStatus): its live
    // region, a divider, and a content span holding the whale and its words.
    // The fixture's running turn started 65 s ago and is still reasoning.
    await probe.onlyFor(['chat-wait'], async function () {
      var waitSession = document.createElement('div')
      waitSession.setAttribute('data-conversation-session', 'smoke-session')
      waitSession.innerHTML = '<div data-chat-flow="">' +
        '<div data-chat-running="true"><span role="status">Deep diving</span><span aria-hidden="true"></span>' +
        '<span><span aria-hidden="true">whale</span><span data-shimmer="true" id="debugRunningWords">Deep diving for 1m 5s ···</span></span></div>' +
        '</div>'
      document.body.appendChild(waitSession)
      var row = waitSession.querySelector('[data-chat-running]')
      var words = document.getElementById('debugRunningWords')
      var lineOf = function () {
        var line = row.querySelector('.dsh-claude-chat-wait')
        if (line === null) return null
        var parts = line.children
        return {
          marked: row.hasAttribute('data-dsh-claude-wait'),
          besideWords: line.previousElementSibling === words,
          label: parts[0].textContent,
          swap: parts[0].getAttribute('data-dsh-claude-wait-swap'),
          filter: getComputedStyle(parts[0]).filter,
          opacity: getComputedStyle(parts[0]).opacity,
          sweep: getComputedStyle(parts[0], '::before').animationName,
          clock: parts[1].hidden ? null : parts[1].textContent,
          badge: parts[2].hidden ? null : parts[2].textContent,
          wordsShown: getComputedStyle(words).display !== 'none',
        }
      }
      // The wording swaps with transitions.dev's three phases: the old one leaves
      // upward with a blur, the text changes once it has gone, and the new one
      // enters from below. Sampled across the swap, rather than once at the end.
      var watchSwap = async function () {
        var frames = []
        for (var round = 0; round < 16; round += 1) {
          frames.push(lineOf())
          await sleep(30)
        }
        // One settled frame after the window: the swap can land late in it, and
        // the last reading is what "at rest" is judged on.
        await sleep(250)
        frames.push(lineOf())
        return frames
      }
      await sleep(400)
      r.wait = { working: lineOf() }
      // The model goes silent: the running turn has written nothing, so the
      // line falls back to the host's own word for a wait.
      window.__dshSmokeHost.turnFixtureRunning.steps = []
      r.wait.silent = await watchSwap()
      // A tool call in flight is a state of its own, with no block streaming.
      window.__dshSmokeHost.turnFixtureRunning.steps = [{ data: { get: function (kind) { return kind === 'assistant-step' ? { status: 'settled', step: 1, blocks: [{ kind: 'reasoning' }, { kind: 'tool-call' }] } : undefined } } }]
      window.__dshSmokeHost.turnFixtureCalls.push({ turn: 2 })
      await sleep(400)
      r.wait.tools = lineOf()
      window.__dshSmokeHost.turnFixtureCalls.length = 0
      // The reader's animation choice: reduced writes the new wording at once.
      window.__pushForm({ motion: 'reduced' })
      await sleep(200)
      window.__dshSmokeHost.turnFixtureRunning.steps = []
      await sleep(100)
      r.wait.reduced = lineOf()
      window.__pushForm({ motion: 'system' })
      await sleep(200)
      window.__pushForm({ chatAnimations: false })
      await sleep(300)
      r.wait.off = {
        line: row.querySelector('.dsh-claude-chat-wait') !== null,
        marked: row.hasAttribute('data-dsh-claude-wait'),
        wordsShown: getComputedStyle(words).display !== 'none',
      }
      window.__pushForm({ chatAnimations: true })
      await sleep(300)
      waitSession.remove()
    })
  })
})()
