/** The running-effect cards, read from the product's rendered tree and shipped CSS. */
(function () {
  var probe = window.__dshSmokeProbe
  var surface = probe.surface

  // The stand-in React returns a plain tree. Carry its actual HTML and fragment
  // children into the document so preview paint includes the product's parents.
  var mountTree = function (tree, parent) {
    if (tree === null || tree === undefined || typeof tree === 'boolean') return
    if (Array.isArray(tree)) { tree.forEach(function (child) { mountTree(child, parent) }); return }
    if (typeof tree === 'string' || typeof tree === 'number') { parent.appendChild(document.createTextNode(String(tree))); return }
    var props = tree.props || {}
    if (tree.type === window.__react.Fragment) { mountTree(props.children, parent); return }
    if (typeof tree.type !== 'string') throw new Error('smoke: preview contains an unrendered component')
    var element = document.createElement(tree.type)
    Object.keys(props).forEach(function (key) {
      if (key === 'children' || key === 'key' || key === 'ref' || /^on[A-Z]/.test(key)) return
      var value = props[key]
      if (value === undefined || value === null || value === false) return
      element.setAttribute(key === 'className' ? 'class' : key, value === true ? '' : String(value))
    })
    mountTree(props.children, element)
    parent.appendChild(element)
  }
  var readPaint = function (element) {
    if (element === null) return null
    var style = getComputedStyle(element)
    return { width: style.width, border: style.borderTopWidth, animation: style.animationName, duration: style.animationDuration, visibility: style.visibility }
  }

  probe.step(async function () {
    await probe.onlyFor(['settings'], async function () {
      if (!probe.report.settings.registered) return
      var cardSelector = surface('settings.ongoing-card')
      var sampleSelector = surface('settings.ongoing-sample')
      var titleSelector = surface('settings.ongoing-title')
      var markSelector = surface('settings.ongoing-mark')
      var part = surface('skin.part')
      var runningMark = document.querySelector('[' + part + '~="session-row"] svg[data-state="ongoing"]')
      if (runningMark === null) throw new Error('smoke: no native running row')
      var runningRow = runningMark.closest('[' + part + '~="session-row"]')
      var runningTitle = runningRow.querySelector('[' + part + '~="row-title"]')
      var cardsHost = document.createElement('div')
      cardsHost.style.cssText = 'position:absolute;left:-10000px;top:-10000px'
      document.body.appendChild(cardsHost)
      var readCards = function () {
        cardsHost.replaceChildren()
        probe.walkSettingsTree(probe.settingsTree('motion'), function (node) {
          var className = (node.props || {}).className
          if (typeof className === 'string' && className.split(/\s+/).indexOf(cardSelector.slice(1)) >= 0) mountTree(node, cardsHost)
        })
        return [].slice.call(cardsHost.querySelectorAll(cardSelector)).map(function (card) {
          var sample = card.querySelector(sampleSelector)
          var title = card.querySelector(titleSelector)
          var mark = card.querySelector(markSelector)
          return {
            label: card.getAttribute('aria-label'),
            active: card.hasAttribute('data-active'),
            pressed: card.getAttribute('aria-pressed'),
            sample: sample !== null && sample.getAttribute('aria-hidden') === 'true',
            look: sample === null ? null : sample.getAttribute('data-look'),
            title: title === null ? null : title.textContent,
            titleFirst: title !== null && mark !== null && title.nextElementSibling === mark,
            titlePaint: readPaint(title),
            markPaint: readPaint(mark),
          }
        })
      }
      var readRunning = function () {
        return {
          attribute: document.body.getAttribute(surface('skin.ongoing-indicator')),
          mark: readPaint(runningMark),
          title: readPaint(runningTitle),
          applicable: runningRow.hasAttribute(surface('sidebar-status.running-title')),
        }
      }
      var settings = probe.report.settings
      settings.ongoingCards = { cards: readCards(), choices: {} }
      settings.ongoingStored = {}
      try {
        for (var look of ['ring', 'shimmer', 'breathe']) {
          window.__pushForm({ ongoingIndicator: look })
          await probe.settle()
          settings.ongoingCards.choices[look] = readCards()
          settings.ongoingStored[look] = readRunning()
        }
        window.__pushForm({ ongoingIndicator: 'shimmer', motion: 'reduced' })
        await probe.settle()
        settings.ongoingReduced = { cards: readCards(), running: readRunning() }
      } finally {
        cardsHost.remove()
        window.__pushForm({ ongoingIndicator: 'breathe', motion: 'system' })
        await probe.settle()
      }
    })
  })
})()
