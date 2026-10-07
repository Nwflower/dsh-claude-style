/**
 * The studio case: the registered home panel rendered per tab the way its dock
 * seat would, the crab on the hero card with its poke and its reduced-motion
 * frame, the cold start screen without a dock, and where the studio stylesheet
 * lets a panel draw.
 */
(function () {
  var probe = window.__dshSmokeProbe
  var sleep = probe.sleep
  var pillState = probe.pillState
  var r = probe.report

  probe.step(async function () {
    await probe.onlyFor(['studio'], async function () {
      // Render the registered panel on the hero page, once per tab, the way
      // the dock seat would: a throw here is the slot's error boundary on the
      // live page, which leaves the new-conversation page without its panel.
      var heroRoot = document.createElement('div')
      heroRoot.className = '_x_root_1'
      heroRoot.setAttribute('data-phase', 'hero')
      // Arriving on the hero draws the yardstick book; the draw is pinned to the
      // last book on the shelf, which no window here has passed, so the line has
      // to step down to the longest book each window did pass.
      var random = Math.random
      Math.random = function () { return 0.999 }
      document.body.appendChild(heroRoot)
      await sleep(200)
      Math.random = random
      r.panelRenders = {}
      // The Overview tab twice — all time, and the 7d pill picked — and the
      // Models tab folded and open; each state is keyed by the initial value it
      // replaces.
      var tabs = {
        overview: null,
        'overview-7d': { all: '7d' },
        models: { overview: 'models' },
        'models-open': { overview: 'models', false: true },
      }
      for (var tab in tabs) {
        var react = window.__react
        react.rendering = true
        react.states = tabs[tab]
        try {
          var classes = []
          var texts = []
          ;(function collect(node) {
            if (typeof node === 'string') { if (node) texts.push(node); return }
            if (node === null || typeof node !== 'object') return
            if (Array.isArray(node)) { node.forEach(collect); return }
            if (node.props && typeof node.props.className === 'string') classes.push(node.props.className)
            if (node.props) collect(node.props.children)
          })(window.__slotComponents['claude-style-usage']({}))
          r.panelRenders[tab] = { error: null, classes: classes, texts: texts }
        } catch (e) {
          r.panelRenders[tab] = { error: String((e && e.stack) || e), classes: [], texts: [] }
        } finally {
          react.rendering = false
          react.states = null
        }
      }
      // The crab rides the hero card, idling, drawn from its inlined sheet and
      // ink mask. A click on its left half pokes it, and the poke plays out
      // back to idle on the browser's animation engine, so no frame wakes a
      // pass. With the animation choice on "reduced" it holds the idle
      // sheet's still frame; a click still plays the poke.
      var crab = document.querySelector('[data-composer-card] > .dsh-claude-crab')
      r.mascot = { mounted: crab !== null }
      if (crab !== null) {
        var crabStrip = crab.querySelector('.dsh-claude-crab-strip')
        var crabHit = crab.querySelector('.dsh-claude-crab-hit')
        r.mascot.ready = crab.hasAttribute('data-ready')
        r.mascot.animation = crab.getAttribute('data-animation')
        r.mascot.body = getComputedStyle(crabStrip).backgroundImage.indexOf('data:image/png') !== -1
        r.mascot.ink = getComputedStyle(crabStrip, '::after').maskImage.indexOf('data:image/png') !== -1
        // A real press has to reach the crab: nothing on the page may cover it.
        crab.scrollIntoView({ block: 'center' })
        var crabBox = crabHit.getBoundingClientRect()
        var topmost = document.elementFromPoint(crabBox.left + crabBox.width / 2, crabBox.top + crabBox.height / 2)
        r.mascot.reachable = topmost === crabHit
        var crabPress = { pointerId: 1, pointerType: 'mouse', isPrimary: true, button: 0, clientX: crabBox.left + 6, clientY: crabBox.top + crabBox.height / 2, bubbles: true }
        var pokeCrab = function () {
          crabHit.dispatchEvent(new PointerEvent('pointerdown', Object.assign({ buttons: 1 }, crabPress)))
          crabHit.dispatchEvent(new PointerEvent('pointerup', Object.assign({ buttons: 0 }, crabPress)))
        }
        // The press settles focus (and the caret motion's own frames with it),
        // so the count starts once that is over: what is measured is the poke's
        // animation running on the browser's engine.
        pokeCrab()
        await sleep(300)
        r.mascot.poked = crab.getAttribute('data-animation')
        var passesBefore = window.__passes
        await sleep(1150)
        r.mascot.afterPoke = crab.getAttribute('data-animation')
        r.mascot.passesDuring = window.__passes - passesBefore
        // The choice is pushed through the host form, which is what the
        // settings row does.
        window.__pushForm({ motion: 'reduced' })
        await sleep(150)
        r.mascot.reducedAttr = document.body.getAttribute('data-dsh-claude-motion')
        r.mascot.stillFrame = crabStrip.style.transform
        r.mascot.stillAnimations = crabStrip.getAnimations().length
        pokeCrab()
        await sleep(150)
        r.mascot.reducedClick = crab.getAttribute('data-animation')
        await sleep(1300)
        window.__pushForm({ motion: 'full' })
      }
      // The cold start screen: no session yet, so the host renders no dock
      // under the hero stack and no access button, and the card is the
      // workspace picker with an empty mode strip. The page's own access button
      // stands for a session, so it leaves the page for the length of this.
      var access = document.querySelector('button[aria-label^="Access mode"]')
      var accessParent = access.parentElement
      access.remove()
      var coldStack = document.createElement('div')
      coldStack.className = '_x_composerStack_1 _x_composerHero_1'
      coldStack.innerHTML = '<div data-composer-card class="_x_card_1 _x_cardWorkspaceTrigger_1">' +
        '<div class="_x_row_1"><div class="_x_tools_1"><div class="_x_modes_1"></div></div></div></div>'
      heroRoot.appendChild(coldStack)
      await sleep(200)
      var coldSeat = coldStack.querySelector(':scope > .dsh-claude-home-seat')
      var coldRoot = window.__roots.filter(function (root) { return root.element === coldSeat })[0]
      r.coldStart = {
        seat: coldSeat !== null,
        rendered: coldRoot !== undefined && coldRoot.renders > 0,
        segments: Array.prototype.map.call(coldStack.querySelectorAll('._x_modes_1 > .dsh-claude-segments > .dsh-claude-segment'), function (item) {
          return { label: item.textContent, disabled: item.disabled, active: item.hasAttribute('data-active') }
        }),
      }
      var coldGroup = coldStack.querySelector('._x_modes_1 > .dsh-claude-segments')
      var coldActive = coldGroup === null ? null : coldGroup.querySelector('[data-active]')
      r.coldStart.pill = coldActive === null ? null : pillState(coldGroup, coldActive)
      // The session arrives: the host renders its dock, and the skin's seat
      // gives the panel back.
      var coldDock = document.createElement('div')
      coldDock.setAttribute('data-slot', 'conversation.input.dock')
      coldStack.insertBefore(coldDock, coldStack.firstChild)
      await sleep(200)
      r.coldStart.seatAfterDock = coldStack.querySelector('.dsh-claude-home-seat') !== null
      r.coldStart.unmountedAfterDock = coldRoot !== undefined && coldRoot.unmounted
      coldStack.remove()
      accessParent.appendChild(access)
      await sleep(200)
      r.homeHero = { onHero: document.body.hasAttribute('data-dsh-claude-home-hero') }
      // The studio rules reach the hero stack through that mark: the stack
      // takes the studio column's 720px cap.
      var studioStack = document.createElement('div')
      studioStack.className = '_x_composerStack_1 _x_composerHero_1'
      document.body.appendChild(studioStack)
      r.homeHero.stackMaxWidth = getComputedStyle(studioStack).maxWidth
      studioStack.remove()
      heroRoot.remove()
      await sleep(200)
      r.homeHero.offHero = document.body.hasAttribute('data-dsh-claude-home-hero')
      r.mascot.afterHero = document.querySelector('.dsh-claude-crab') !== null
      // The stylesheet alone decides where a panel may draw: under the hero
      // stack's dock it shows, and the moment the host drops the stack's hero
      // class (the first message sent) it is gone, before any pass runs.
      function panelDisplay(stackClass, coldStart) {
        var stack = document.createElement('div')
        stack.className = stackClass
        var dock = document.createElement('div')
        if (coldStart) dock.className = 'dsh-claude-home-seat'
        else dock.setAttribute('data-slot', 'conversation.input.dock')
        var panel = document.createElement('section')
        panel.className = 'dsh-claude-home-panel'
        dock.appendChild(panel)
        stack.appendChild(dock)
        document.body.appendChild(stack)
        var display = getComputedStyle(panel).display
        stack.remove()
        return display
      }
      r.panelDisplay = {
        hero: panelDisplay('_x_composerStack_1 _x_composerHero_1'),
        coldStart: panelDisplay('_x_composerStack_1 _x_composerHero_1', true),
        conversation: panelDisplay('_x_composerStack_1'),
      }
    })
  })
})()
