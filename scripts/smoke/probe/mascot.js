/**
 * The mascot cases: the DeepSeek brand on the home card and beside the
 * conversation's work, and the crab walking every state — the state the session
 * is in, the frames changing without waking a pass, the poke, the reduced-motion
 * still frame, the reconnect and the quiet minute.
 */
(function () {
  var probe = window.__dshSmokeProbe
  var sleep = probe.sleep
  var r = probe.report

  probe.step(async function () {
    // The DeepSeek brand, stored under its old name ("off"): the whale takes
    // the crab's place and the canvas turns sky white. On the home page it
    // stands on the card; on the conversation page it follows the session's
    // work from the top of the input area, and stands on the panel that takes
    // the card's place while the reader is asked for something.
    await probe.onlyFor(['deepy', 'crab-states'], async function () {
      var mascotName = window.SMOKE_CASE === 'deepy' ? 'deepy' : 'crab'
      var driver = window.__deepy
      var whaleNow = function () {
        var node = document.querySelector('.dsh-claude-' + mascotName)
        if (node === null) return null
        // The frame is the strip's translation: read the computed matrix (a
        // running WAAPI animation has no inline style) as "Xpx Ypx".
        var strip = node.querySelector('.dsh-claude-' + mascotName + '-strip')
        var matrix = getComputedStyle(strip).transform
        var offsets = matrix === 'none' ? null : matrix.match(/matrix\([^,]+,[^,]+,[^,]+,[^,]+,\s*(-?[\d.]+),\s*(-?[\d.]+)\)/)
        return {
          animation: node.getAttribute('data-animation'),
          ready: node.hasAttribute('data-ready'),
          place: node.parentElement === null ? null : node.parentElement.getAttribute('data-dsh-claude-' + mascotName + '-anchor'),
          frame: offsets === null ? '0px 0px' : offsets[1] + 'px ' + offsets[2] + 'px',
          sheet: getComputedStyle(strip).backgroundImage,
        }
      }
      var wakeDeepyPass = function () {
        var node = document.createElement('span')
        document.body.appendChild(node)
        document.body.removeChild(node)
      }
      var bodyStyle = getComputedStyle(document.body)
      r.states = {
        brand: document.body.getAttribute('data-dsh-claude-brand'),
        canvas: bodyStyle.backgroundColor,
        accent: bodyStyle.getPropertyValue('--dsw-alias-brand-primary').trim(),
        link: bodyStyle.getPropertyValue('--dsw-alias-link').trim(),
      }
      // The dark palette, read with the host's dark marker set for a moment.
      document.body.setAttribute('data-ds-dark-theme', '')
      var darkStyle = getComputedStyle(document.body)
      r.states.dark = {
        canvas: darkStyle.backgroundColor,
        accent: darkStyle.getPropertyValue('--dsw-alias-brand-primary').trim(),
        raised: darkStyle.getPropertyValue('--dsh-claude-raised').trim(),
      }
      document.body.removeAttribute('data-ds-dark-theme')
      var deepyHero = document.createElement('div')
      deepyHero.setAttribute('data-phase', 'hero')
      document.body.appendChild(deepyHero)
      await sleep(500)
      r.states.home = whaleNow()
      r.states.crab = document.querySelector('.dsh-claude-crab') !== null
      // Frames change on the whale's own node, and no frame wakes a pass. The
      // caret motion's own frames are settled first (see the crab case).
      if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
      await sleep(250)
      var deepyPasses = window.__passes
      await sleep(600)
      r.states.idle = { before: r.states.home && r.states.home.frame, after: whaleNow().frame, passes: window.__passes - deepyPasses }
      if (mascotName === 'deepy') {
        // The motion choice holds the playing sheet's still frame: a looping
        // animation stops advancing, while a one-shot (the poke below) plays out.
        window.__pushForm({ motion: 'reduced' })
        await sleep(150)
        r.states.stillAttr = document.body.getAttribute('data-dsh-claude-motion')
        var whaleStill = whaleNow().frame
        await sleep(400)
        r.states.still = { before: whaleStill, after: whaleNow().frame }
        window.__pushForm({ motion: 'full' })
        await sleep(150)
        r.states.alwaysAttr = document.body.getAttribute('data-dsh-claude-motion')
      }
      // A click on its face pokes it.
      var hit = document.querySelector('.dsh-claude-' + mascotName + '-hit')
      var hitBox = hit.getBoundingClientRect()
      var press = { pointerId: 1, pointerType: 'mouse', isPrimary: true, button: 0, clientX: hitBox.left + 6, clientY: hitBox.top + hitBox.height / 2, bubbles: true }
      hit.dispatchEvent(new PointerEvent('pointerdown', Object.assign({ buttons: 1 }, press)))
      hit.dispatchEvent(new PointerEvent('pointerup', Object.assign({ buttons: 0 }, press)))
      await sleep(250)
      r.states.poke = whaleNow()
      if (mascotName === 'deepy') {
        // Two sheets are all this case asks for: the one it plays above, and the
        // one this state change switches to. It leaves with the page.
        deepyHero.remove()
        await sleep(200)
        r.states.gone = whaleNow() === null && document.querySelectorAll('[data-dsh-claude-deepy-anchor]').length === 0
        return
      }
      // The crab plays every state on the conversation page, and stands where
      // its scope puts it: the walk below is the crab case's alone.
      // The poke plays out (2s) before the page moves on.
      await sleep(1900)
      deepyHero.remove()
      // The conversation page: the host's composer seat, its chain wrapper and
      // the composer stack inside it.
      var deepyConversation = document.createElement('div')
      deepyConversation.setAttribute('data-phase', 'active')
      deepyConversation.innerHTML = '<div data-conversation-content data-conversation-session="smoke-deepy"><div data-composer-seat>' +
        '<div data-slot="conversation.composer" style="display:contents">' +
        '<div data-chain-overlay-fallback="conversation.composer" style="display:contents">' +
        '<div class="_x_composerStack_1"><div class="_x_inputBar_1">input</div></div></div></div></div></div>'
      document.body.appendChild(deepyConversation)
      // A pass moves the whale onto the conversation first: the home page reads
      // the whole workspace, where a running session is work.
      await sleep(200)
      driver.setStatus('smoke-deepy', { running: true })
      driver.setTurn('reasoning')
      wakeDeepyPass()
      await sleep(400)
      r.states.thinking = whaleNow()
      r.states.chatFollowed = driver.chatFollowed()
      driver.setTurn('text')
      wakeDeepyPass()
      await sleep(250)
      r.states.typing = whaleNow()
      // Two more sessions at work: the hard hat, once the typing whale has
      // held the stage for its second.
      driver.addSessions(['smoke-two', 'smoke-three'])
      driver.setStatus('smoke-two', { running: true })
      driver.setStatus('smoke-three', { running: true })
      await sleep(1300)
      r.states.building = whaleNow()
      // An approval: the host hides the composer and mounts its panel after it.
      var fallback = deepyConversation.querySelector('[data-chain-overlay-fallback]')
      var panel = document.createElement('div')
      panel.setAttribute('data-approval-key', 'smoke')
      panel.textContent = 'approve?'
      fallback.style.display = 'none'
      fallback.parentElement.appendChild(panel)
      driver.setStatus('smoke-deepy', { running: true, pendingInteraction: { kind: 'approval', key: 'smoke' } })
      await sleep(400)
      r.states.notification = whaleNow()
      // Answered and finished; a compaction starts, then ends.
      panel.remove()
      fallback.style.display = 'contents'
      driver.setTurn(null)
      driver.setStatus('smoke-deepy', { running: false })
      driver.setStatus('smoke-two', { running: false })
      driver.setStatus('smoke-three', { running: false })
      driver.emit({ type: 'compaction/start', seq: 1, time: Date.now(), data: { compactionId: 'c1', turn: null } })
      wakeDeepyPass()
      // Each state holds the stage for a second against a lesser one.
      await sleep(1100)
      r.states.compacting = whaleNow()
      await sleep(100)
      driver.emit({ type: 'compaction/end', seq: 2, time: Date.now(), data: { compactionId: 'c1', turn: null } })
      // The celebration's sheet converts on its first use (one of the biggest
      // sheets); the switch holds the current animation until the vector is
      // ready, so wait it out instead of landing on a fixed delay.
      for (var ci = 0; ci < 60 && (whaleNow() || {}).animation !== 'happy'; ci++) await sleep(50)
      r.states.celebrating = whaleNow()
      driver.emit({ type: 'tool/result', seq: 3, time: Date.now(), data: { turn: 2, step: 1, message: { isError: true } } })
      await sleep(400)
      r.states.failed = whaleNow()
      // Reduced motion: the settings page's animation choice, pushed through the
      // host form the way the settings row writes it. The choice resolves onto
      // <body> (packages/client/src/core/prefs.ts) and the whale holds the state's still frame.
      window.__pushForm({ motion: 'reduced' })
      await sleep(150)
      r.states.stillAttr = document.body.getAttribute('data-dsh-claude-motion')
      var stillBefore = whaleNow().frame
      await sleep(400)
      r.states.still = { before: stillBefore, after: whaleNow().frame }
      window.__pushForm({ motion: 'full' })
      await sleep(150)
      r.states.alwaysAttr = document.body.getAttribute('data-dsh-claude-motion')
      // A compaction starts; the connection drops and the feed comes back
      // whole with the compaction's end in it. The shake above holds 4.8s.
      driver.emit({ type: 'compaction/start', seq: 4, time: Date.now(), data: { compactionId: 'c2', turn: null } })
      await sleep(4200)
      r.states.resendBefore = whaleNow()
      driver.resend([{ type: 'compaction/end', seq: 5, time: Date.now(), data: { compactionId: 'c2', turn: null } }])
      await sleep(1200)
      r.states.resent = whaleNow()
      // The quiet minute to sleep, with the page's clock moved ahead: a minute
      // of work is no quiet spell, a minute idle is, and a pointer move wakes it.
      var deepyClock = Date.now
      var deepyAhead = 0
      Date.now = function () { return deepyClock.call(Date) + deepyAhead }
      driver.setStatus('smoke-deepy', { running: true })
      driver.setTurn('text')
      await sleep(300)
      deepyAhead += 61000
      await sleep(200)
      driver.setTurn(null)
      driver.setStatus('smoke-deepy', { running: false })
      await sleep(1200)
      r.states.afterWork = whaleNow()
      deepyAhead += 61000
      // The probe's clock is fake while setTimeout runs on the real one: wake a
      // pass to stand in for the sleep deadline the whale's timer would fire.
      wakeDeepyPass()
      await sleep(400)
      r.states.asleep = whaleNow()
      // Asleep for its second on stage first, as any state holds it.
      await sleep(700)
      document.dispatchEvent(new PointerEvent('pointermove', { bubbles: true }))
      await sleep(400)
      for (var wi = 0; wi < 60 && (whaleNow() || {}).animation !== 'waking'; wi++) await sleep(50)
      r.states.woken = whaleNow()
      Date.now = deepyClock
      deepyConversation.remove()
      await sleep(200)
      r.states.gone = whaleNow() === null && document.querySelectorAll('[data-dsh-claude-' + mascotName + '-anchor]').length === 0
      if (mascotName === 'crab') {
        // Where it appears: kept to the home page, the crab stays off the
        // conversation; with the mascot off it leaves the home card as well.
        document.body.appendChild(deepyConversation)
        await sleep(300)
        r.states.backInConversation = whaleNow() !== null
        window.__pushForm({ mascotScope: 'home' })
        await sleep(300)
        r.states.homeOnly = whaleNow()
        deepyConversation.remove()
        var scopeHero = document.createElement('div')
        scopeHero.setAttribute('data-phase', 'hero')
        document.body.appendChild(scopeHero)
        await sleep(300)
        r.states.homeOnlyHero = whaleNow()
        window.__pushForm({ mascot: 'off' })
        await sleep(300)
        r.states.off = whaleNow()
        window.__pushForm({ mascot: 'deepy' })
        await sleep(300)
        r.states.deepyPicked = document.querySelector('.dsh-claude-deepy') !== null && document.querySelector('.dsh-claude-crab') === null
        window.__pushForm({ mascot: 'crab', mascotScope: 'all' })
        scopeHero.remove()
        await sleep(200)
      }
    })
  })
})()
