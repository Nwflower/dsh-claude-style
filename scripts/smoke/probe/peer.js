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
        var count = 0
        for (var step = 0; step < 24; step++) if (registry.has('dsh-claude-tok-' + step)) count += 1
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
      // uses: the Conversation tab's rows, which of them refuse input, which
      // carry the line naming the owner, and what answer each control shows.
      var PeerSection = (window.__slotComponents || {})['claude-style']
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
          if (typeof className === 'string' && className.split(' ').indexOf('dsh-claude-settings-row-managed') >= 0) found = true
        })
        return found
      }
      // What the row's control shows: a switch's state, or the pressed option of
      // a segmented control. The reader's own stored answer, not a forced off.
      var peerAnswer = function (node) {
        var answer = { on: false, option: null, options: [] }
        peerWalk(node, function (child) {
          var props = child.props || {}
          if (props['data-on'] === '') answer.on = true
          if (typeof props.className === 'string' && props.className.split(' ').indexOf('dsh-claude-segment') !== -1) answer.options.push(props.key)
          if (props['aria-pressed'] === 'true') answer.option = props.key
        })
        return answer
      }
      r.peer.settings = { registered: typeof PeerSection === 'function', rows: [], refusing: [], managed: [], answers: {}, texts: [] }
      if (r.peer.settings.registered) {
        var peerReact = window.__react
        peerReact.rendering = true
        peerReact.states = { general: 'conversation' }
        var peerTree = PeerSection({})
        peerReact.rendering = false
        peerReact.states = null
        peerWalk(peerTree, function (node) {
          var props = node.props || {}
          if (typeof props.className === 'string' && /(^| )dsh-claude-settings-row( |$)/.test(props.className)) {
            r.peer.settings.rows.push(props.key)
            if (peerDisabled(props.children)) r.peer.settings.refusing.push(props.key)
            if (peerManages(props.children)) r.peer.settings.managed.push(props.key)
            r.peer.settings.answers[props.key] = peerAnswer(props.children)
          }
        })
        peerTexts(peerTree, r.peer.settings.texts)
      }
      peerChat.remove()
    })
    // The other owner of the page, a skin, from the first frame (D49): the theme
    // stands its whole visual down and keeps the settings section, then takes
    // the page back when the skin leaves.
    await probe.onlyFor(['skin-center-handoff'], async function () {
      // The settings section registers through ctx.inject, so its seat appears
      // on a later turn than apply() returns.
      await sleep(400)
      var owner = {
        sheet: document.getElementById('dsh-claude-style-style') !== null,
        live: document.body.hasAttribute('data-dsh-claude-style'),
        handoff: document.body.hasAttribute('data-dsh-claude-style-handoff'),
        bodyAttrs: attrs(document.body),
        settingsRegistered: typeof (window.__slotComponents || {})['claude-style'] !== 'undefined',
        uncaught: window.__uncaught.length,
      }
      // The owner leaves: the theme takes the page back in one observer turn.
      document.documentElement.removeAttribute('data-dsh-skin')
      await sleep(300)
      owner.afterRelease = {
        sheet: document.getElementById('dsh-claude-style-style') !== null,
        live: document.body.hasAttribute('data-dsh-claude-style'),
        handoff: document.body.hasAttribute('data-dsh-claude-style-handoff'),
      }
      // And it returns: the theme gives the page back without a reload.
      document.documentElement.setAttribute('data-dsh-skin', 'blue-fantasy')
      await sleep(300)
      owner.afterReturn = {
        sheet: document.getElementById('dsh-claude-style-style') !== null,
        live: document.body.hasAttribute('data-dsh-claude-style'),
      }
      r.owner = owner
    })
    // The other owner arriving after the theme took the page (D49): the watch
    // follows a flip whichever way the page booted.
    await probe.onlyFor(['skin-center-arrival'], async function () {
      await sleep(400)
      var arrival = {
        before: {
          sheet: document.getElementById('dsh-claude-style-style') !== null,
          live: document.body.hasAttribute('data-dsh-claude-style'),
        },
      }
      document.documentElement.setAttribute('data-dsh-skin', 'blue-fantasy')
      await sleep(300)
      arrival.yielded = {
        sheet: document.getElementById('dsh-claude-style-style') !== null,
        live: document.body.hasAttribute('data-dsh-claude-style'),
        handoff: document.body.hasAttribute('data-dsh-claude-style-handoff'),
        settingsRegistered: typeof (window.__slotComponents || {})['claude-style'] !== 'undefined',
      }
      document.documentElement.removeAttribute('data-dsh-skin')
      await sleep(300)
      arrival.back = {
        sheet: document.getElementById('dsh-claude-style-style') !== null,
        live: document.body.hasAttribute('data-dsh-claude-style'),
      }
      r.arrival = arrival
    })
  })
})()
