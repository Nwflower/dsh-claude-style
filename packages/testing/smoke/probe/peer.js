/**
 * The cases about the other plugins on the page: the chat-behaviour plugin whose
 * arrival stands the ported features down and greys their settings rows, and a
 * skin that owns the page — arriving before the theme or after it.
 */
(function () {
  var probe = window.__dshSmokeProbe
  var sleep = probe.sleep
  var attrs = probe.attrs
  var r = probe.report

  probe.step(async function () {
    // The other chat-behaviour plugin installed (packages/client/src/shared/peer-plugin.ts): the
    // ported features stand down whole, and the settings page shows their
    // switches off and disabled with the reason.
    await probe.onlyFor(['peer-chat-ux'], async function () {
      var peerHighlights = function () {
        var registry = window.CSS && window.CSS.highlights
        if (!registry) return 0
        // The reveal registers one highlight per step under this prefix
        // (constants.ts's CHAT_REVEAL_HIGHLIGHT_PREFIX); any of them is a live engine.
        var count = 0
        registry.forEach(function (_highlight, name) { if (name.indexOf('dsh-claude-tok-') === 0) count += 1 })
        return count
      }
      // A chat area and a focused composer: live features would mark, fold or
      // draw on them within a pass or two.
      var peerChat = document.createElement('div')
      peerChat.innerHTML = '<div data-chat-flow><div data-streaming><p>streaming text</p></div>' +
        '<div data-variant="think" data-state="running"><button type="button">Thinking</button></div>' +
        '<div data-step-process><button type="button" data-process-activity><span data-shimmer>Working</span></button>' +
        '<div data-step-process-body hidden="until-found"><div data-step-process-content>x</div></div></div></div>'
      document.body.appendChild(peerChat)
      var peerEditor = document.querySelector('[data-composer-input]')
      if (peerEditor !== null) {
        peerEditor.focus()
        document.dispatchEvent(new Event('selectionchange'))
      }
      // The fade ships off, so the choice is turned on here: the reveal staying
      // uninstalled below is then the hand-over rather than the default.
      window.__pushForm({ chatReveal: 'on' })
      await sleep(300)
      r.peer = {
        marks: {
          follow: document.body.hasAttribute('data-dsh-claude-chat-follow'),
          fold: document.body.hasAttribute('data-dsh-claude-chat-fold'),
          reveal: document.body.hasAttribute('data-dsh-claude-chat-reveal'),
          caretLayer: document.querySelector('[data-dsh-claude-caret-layer]') !== null,
          caretMark: peerEditor !== null && peerEditor.hasAttribute('data-dsh-claude-caret'),
        },
        seats: (window.__slots || []).filter(function (entry) { return entry.key === 'tool.call.toolview' }).length,
        highlights: peerHighlights(),
        thinkExpanded: document.querySelector('[data-variant="think"]').hasAttribute('data-expanded'),
        groupOpen: !document.querySelector('[data-step-process-body]').hasAttribute('hidden'),
      }
      // The settings page, through the same React-tree walk the settings case
      // uses: the rows of the two tabs the ported controls are registered on —
      // the chat-area animation in the main window's conversation group, the
      // caret on the Motion tab — which of them refuse input, which carry the
      // line naming the owner, and what answer each control shows.
      var PeerSection = (window.__slotComponents || {})['claude-style']
      var PEER_TABS = ['conversation', 'motion']
      var peerWalk = function (node, visit) {
        if (node === null || node === undefined || typeof node !== 'object') return
        if (Array.isArray(node)) { node.forEach(function (child) { peerWalk(child, visit) }); return }
        visit(node)
        peerWalk(node.props && node.props.children, visit)
      }
      var peerTexts = function (node, out) {
        if (typeof node === 'string') { out.push(node); return }
        if (node === null || node === undefined || typeof node !== 'object') return
        if (Array.isArray(node)) { node.forEach(function (child) { peerTexts(child, out) }); return }
        peerTexts(node.props && node.props.children, out)
      }
      var peerDisabled = function (node) {
        var found = false
        peerWalk(node, function (child) { if ((child.props || {}).disabled === true) found = true })
        return found
      }
      var peerManages = function (node) {
        var found = false
        peerWalk(node, function (child) {
          var className = (child.props || {}).className
          if (typeof className === 'string' && className.split(' ').indexOf('dsh-claude-settings-row-note') >= 0) found = true
        })
        return found
      }
      // What the row's control shows: a switch's state, or the pressed option of
      // a segmented control. The reader's own stored answer, not a forced off.
      // A control that renders a subtree of its own (the new-text fade's preview
      // cards carry a clock) is not in this element tree, so the answer it shows
      // is read from the preference it was handed.
      var peerAnswer = function (node, key) {
        var answer = { on: false, option: null, options: [] }
        peerWalk(node, function (child) {
          var props = child.props || {}
          if (props['data-on'] === '') answer.on = true
          if (typeof props.className === 'string' && props.className.split(' ').indexOf('dsh-claude-segment') !== -1) answer.options.push(props.key)
          if (props['aria-pressed'] === 'true') answer.option = props.key
          var prefs = props.prefs
          if (typeof prefs === 'object' && prefs !== null && typeof prefs[key] === 'string') answer.option = prefs[key]
        })
        return answer
      }
      r.peer.settings = { registered: typeof PeerSection === 'function', tabs: {}, texts: [] }
      if (r.peer.settings.registered) {
        var peerReact = window.__react
        peerReact.rendering = true
        PEER_TABS.forEach(function (tab) {
          peerReact.states = { general: tab }
          var peerTree = PeerSection({})
          var page = { rows: [], refusing: [], managed: [], answers: {} }
          peerWalk(peerTree, function (node) {
            var props = node.props || {}
            if (typeof props.className === 'string' && /(^| )dsh-claude-settings-row( |$)/.test(props.className)) {
              page.rows.push(props.key)
              if (peerDisabled(props.children)) page.refusing.push(props.key)
              if (peerManages(props.children)) page.managed.push(props.key)
              page.answers[props.key] = peerAnswer(props.children, props.key)
            }
          })
          r.peer.settings.tabs[tab] = page
          peerTexts(peerTree, r.peer.settings.texts)
        })
        peerReact.rendering = false
        peerReact.states = null
      }
      peerChat.remove()
    })
    // The two seats the settings page registers: the settings dialog's section
    // and the plugin page's configuration entry (settings.ts). The stand-in's
    // registry splices an entry when its feature comes down, so this answers
    // whether the page stands on the page right now.
    var settingsSeats = function () {
      return (window.__slots || []).filter(function (entry) {
        return entry.key === 'settings.section' || entry.key === 'plugins.bundle.config'
      }).length
    }
    // The seats arrive on a later turn than the install that registers them
    // (settings.ts registers through ctx.inject): a loaded runner took longer
    // than one fixed wait, so a reading asks for the count it expects and
    // gives it up to a few seconds to stand.
    var seatsSettled = async function (wanted) {
      var until = Date.now() + 3000
      while (settingsSeats() !== wanted && Date.now() < until) await sleep(50)
      return settingsSeats()
    }
    // The other owner of the page, a skin, from the first frame (D74): the theme
    // stands its whole visual down, settings page included, then takes the page
    // back when the skin leaves.
    await probe.onlyFor(['skin-center-handoff'], async function () {
      // The settings page registers through ctx.inject, so its seats appear on
      // a later turn than apply() returns. The live seat list is what says the
      // page is on the page: the component map keeps what was registered.
      await sleep(400)
      var owner = {
        sheet: document.getElementById('dsh-claude-style-style') !== null,
        live: document.body.hasAttribute('data-dsh-claude-style'),
        handoff: document.body.hasAttribute('data-dsh-claude-style-handoff'),
        bodyAttrs: attrs(document.body),
        settingsSeats: settingsSeats(),
        uncaught: window.__uncaught.length,
      }
      // The owner leaves: the theme takes the page back in one observer turn.
      document.documentElement.removeAttribute('data-dsh-skin')
      await sleep(300)
      owner.afterRelease = {
        sheet: document.getElementById('dsh-claude-style-style') !== null,
        live: document.body.hasAttribute('data-dsh-claude-style'),
        handoff: document.body.hasAttribute('data-dsh-claude-style-handoff'),
        settingsSeats: await seatsSettled(2),
      }
      // And it returns: the theme gives the page back without a reload.
      document.documentElement.setAttribute('data-dsh-skin', 'blue-fantasy')
      await sleep(300)
      owner.afterReturn = {
        sheet: document.getElementById('dsh-claude-style-style') !== null,
        live: document.body.hasAttribute('data-dsh-claude-style'),
        settingsSeats: settingsSeats(),
      }
      r.owner = owner
    })
    // The other owner arriving after the theme took the page (D74): the watch
    // follows a flip whichever way the page booted.
    await probe.onlyFor(['skin-center-arrival'], async function () {
      await sleep(400)
      var arrival = {
        before: {
          sheet: document.getElementById('dsh-claude-style-style') !== null,
          live: document.body.hasAttribute('data-dsh-claude-style'),
          settingsSeats: await seatsSettled(2),
        },
      }
      document.documentElement.setAttribute('data-dsh-skin', 'blue-fantasy')
      await sleep(300)
      arrival.yielded = {
        sheet: document.getElementById('dsh-claude-style-style') !== null,
        live: document.body.hasAttribute('data-dsh-claude-style'),
        handoff: document.body.hasAttribute('data-dsh-claude-style-handoff'),
        settingsSeats: settingsSeats(),
      }
      document.documentElement.removeAttribute('data-dsh-skin')
      await sleep(300)
      arrival.back = {
        sheet: document.getElementById('dsh-claude-style-style') !== null,
        live: document.body.hasAttribute('data-dsh-claude-style'),
        settingsSeats: await seatsSettled(2),
      }
      r.arrival = arrival
    })
  })
})()
