/**
 * Runs in the page before the bundle: counts the scheduler's frames, records
 * console errors, and stands in for the host — its account menu (a trigger
 * that portals a role=menu), its composer keymap (Enter picks an open menu's
 * item first), and the ctx services the skin reads. The case decides which
 * host API misbehaves.
 */
(function () {
  var CASE = window.SMOKE_CASE
  var MARKUP = window.SMOKE_MARKUP
  window.__pwned = 0
  window.__passes = 0
  var raf = window.requestAnimationFrame.bind(window)
  window.requestAnimationFrame = function (cb) { return raf(function (t) { window.__passes++; cb(t) }) }
  window.__errors = []
  // Errors nothing caught: thrown out of a callback, reported through
  // reportError(), or a promise rejection no one handled. The skin must leave
  // none behind in any case.
  window.__uncaught = []
  window.addEventListener('error', function (event) { window.__uncaught.push(String(event.error && event.error.stack || event.message)) })
  window.addEventListener('unhandledrejection', function (event) { window.__uncaught.push('unhandled rejection: ' + String(event.reason && event.reason.stack || event.reason)) })
  var consoleError = console.error
  console.error = function () {
    window.__errors.push(Array.prototype.map.call(arguments, String).join(' '))
    consoleError.apply(console, arguments)
  }

  var menu = null
  var menuViewport = null
  var hostRowsHtml = ''
  function closeHostMenu() {
    if (menu && menu.parentElement) menu.parentElement.removeChild(menu)
    menu = null
    menuViewport = null
  }
  function openHostSettingsDialog() {
    var area = document.querySelector('[class*="settingsArea"]')
    if (!area) return
    var dialog = document.createElement('div')
    dialog.setAttribute('role', 'dialog')
    dialog.textContent = 'Settings'
    area.appendChild(dialog)
  }
  function fillHostRows() {
    while (menuViewport.firstChild) menuViewport.removeChild(menuViewport.firstChild)
    menuViewport.innerHTML = hostRowsHtml
  }
  // The host re-renders its list from React: the viewport is emptied and the
  // host's own rows go back. Our injected container is dropped with them and the
  // skin has to re-insert it.
  window.__rerenderHostMenu = function () {
    if (menuViewport) fillHostRows()
  }
  var accountTrigger = document.getElementById('host-account')
  if (accountTrigger) accountTrigger.addEventListener('click', function () {
    if (menu) { closeHostMenu(); return }
    // The host's real Menu DOM (ui-primitives/Menu.tsx): a role=menu portal to
    // body, a role=presentation viewport, and itemWrap > button[role=menuitem].
    // Picking an item selects it and the menu closes itself (onSelect), so the
    // skin must not click the trigger again. The sign-out glyph copies
    // LogoutIcon.tsx's geometry: a 16px relative box holding a 13.664x13.571 svg
    // at (1.168, 1.214) absolute.
    hostRowsHtml = CASE === 'desktop'
      ? '<div class="itemWrap"><button type="button" role="menuitem">' +
          '<svg viewBox="0 0 16 16" width="16" height="16"></svg>Settings</button></div>' +
        '<div class="itemWrap"><button type="button" role="menuitem">' +
          '<svg viewBox="0 0 16 16" width="16" height="16"></svg>Feedback</button></div>' +
        '<div class="itemWrap"><button type="button" role="menuitem">' +
          '<span style="position:relative;display:inline-block;width:16px;height:16px">' +
            '<svg viewBox="0 0 13.664 13.571" width="13.664" height="13.571" style="position:absolute;left:1.168px;top:1.214px">' +
              '<path d="M1 1 L12.664 12.571" fill="none" stroke="currentColor" stroke-width="1.4"></path>' +
            '</svg></span>Sign out</button></div>'
      : '<div class="itemWrap"><button type="button" role="menuitem">Settings</button></div>' +
        '<div class="itemWrap"><button type="button" role="menuitem">Feedback</button></div>' +
        '<div class="itemWrap"><button type="button" role="menuitem">Sign out</button></div>'
    menu = document.createElement('div')
    menu.setAttribute('role', 'menu')
    menuViewport = document.createElement('div')
    menuViewport.className = 'viewport'
    menuViewport.setAttribute('role', 'presentation')
    menu.appendChild(menuViewport)
    fillHostRows()
    menu.addEventListener('click', function (e) {
      var item = e.target && e.target.closest ? e.target.closest('button[role="menuitem"]') : null
      if (!item) return
      if ((item.textContent || '').trim() === 'Settings') openHostSettingsDialog()
      closeHostMenu()
    })
    document.body.appendChild(menu)
  })
  // The host's Menu keyboard walk: every button in the list is reachable with
  // the direction keys, our injected rows included.
  document.addEventListener('keydown', function (e) {
    if (!menu) return
    if (e.key === 'Escape') { closeHostMenu(); return }
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
    e.preventDefault()
    var buttons = menuViewport.querySelectorAll('button:not(:disabled)')
    if (!buttons.length) return
    var idx = Array.prototype.indexOf.call(buttons, document.activeElement)
    var next = e.key === 'ArrowDown' ? idx + 1 : idx - 1
    if (next < 0) next = buttons.length - 1
    if (next >= buttons.length) next = 0
    buttons[next].focus()
  })
  // A press outside the menu closes it, the way the host's Menu does.
  document.addEventListener('pointerdown', function (e) {
    if (!menu) return
    if (menu.contains(e.target)) return
    closeHostMenu()
  }, true)

  // The hero row's two pickers and the host menus their clicks toggle, for the
  // popovers case. They are TWO independent host menus behind one row — the
  // workspace chip and the preset seat in the real page — which is what made
  // crossing from one trigger to the other leave both cards up.
  if (CASE === 'popovers') {
    var heroMenus = {}
    function heroMenuOf(id) { return heroMenus[id] || null }
    function closeHeroMenu(id) {
      var menu = heroMenus[id]
      if (menu && menu.parentElement) menu.parentElement.removeChild(menu)
      heroMenus[id] = null
      document.getElementById(id).setAttribute('aria-expanded', 'false')
    }
    // Each card is the host Menu's markup: a row with its glyph and label, and
    // for the workspace picker the pinned add row in the footer. The row carries
    // the host's own border: none (Menu.module.css .item).
    function heroMenuRow(label) {
      return '<div class="_x_itemWrap_1"><button type="button" role="menuitem" class="_x_item_1" style="border:none">' +
        '<span class="_x_itemIcon_1"><svg viewBox="0 0 16 16" width="16" height="16"></svg></span>' +
        '<span class="_x_itemLabel_1">' + label + '</span></button></div>'
    }
    function bindHeroTrigger(id, label, footer) {
      document.getElementById(id).addEventListener('click', function () {
        if (heroMenus[id]) { closeHeroMenu(id); return }
        var menu = document.createElement('div')
        menu.setAttribute('role', 'menu')
        menu.innerHTML = '<div class="_x_viewport_1" role="presentation">' + heroMenuRow(label) + '</div>' +
          (footer ? '<div class="_x_footer_1" role="presentation">' + heroMenuRow(footer) + '</div>' : '')
        document.body.appendChild(menu)
        heroMenus[id] = menu
        document.getElementById(id).setAttribute('aria-expanded', 'true')
      })
    }
    bindHeroTrigger('hero-workspace', 'Workspace A', 'Add workspace…')
    bindHeroTrigger('hero-preset', 'Standard mode', null)
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return
      closeHeroMenu('hero-workspace')
      closeHeroMenu('hero-preset')
    })
    window.__heroMenuOpen = function (id) { return heroMenuOf(id) !== null }
    window.__heroMenusOpen = function () {
      var count = 0
      for (var id in heroMenus) if (heroMenus[id]) count++
      return count
    }
  }

  window.__keys = []
  var menuOpen = true
  document.getElementById('editor').addEventListener('keydown', function (e) {
    if (e.key !== 'Enter' || e.shiftKey) return
    e.preventDefault()
    window.__keys.push(menuOpen ? 'host picked the menu item' : 'host submitted')
    menuOpen = false
  })
  document.getElementById('send').addEventListener('click', function () { window.__keys.push('skin clicked Send') })

  if (CASE === 'markup') {
    var action = document.getElementById('plugin-action')
    action.setAttribute('aria-label', MARKUP)
    action.setAttribute('data-cordis-badge', MARKUP)
  }
  // The launcher cases leave the custom nickname empty on purpose: the name
  // they show is the one the launcher published.
  var LAUNCHER = {
    hdsl: { hasSkinImage: true },
    'hdsl-noskin': { hasSkinImage: false },
    'hdsl-broken': { hasSkinImage: true },
  }
  var launcherCase = LAUNCHER[CASE] !== undefined
  var username = CASE === 'markup' ? MARKUP : CASE === 'desktop' || launcherCase ? '' : 'Tester'
  var form = {
    getSnapshot: function () { return { status: 'ready', value: { username: username, collapseFooter: true, homeLayout: CASE === 'studio' ? 'studio' : 'classic' } } },
    subscribe: function () { return function () {} },
    set: function () { return Promise.resolve(true) },
  }
  var profile = CASE === 'markup'
    ? { name: MARKUP, avatarUrl: 'https://cdn.example.invalid/a.png?"><img src=x onerror=window.__pwned=1> onmouseover=window.__pwned=1' }
    : { name: 'Ada', avatarUrl: 'https://cdn.example.invalid/a.png' }
  // The desktop account stream, driven by hand: remote.$stream wraps
  // remote.account.watch, and __pushAccountFrame hands the skin one frame.
  // A frame's accept is a no-op, and the next next() pends until the next
  // push, so the stream never spins.
  window.__profileReads = 0
  var accountFrameQueue = []
  var accountFramePending = null
  window.__pushAccountFrame = function (view) {
    var step = { done: false, value: { value: view, accept: function () {} } }
    if (accountFramePending !== null) {
      var resolve = accountFramePending
      accountFramePending = null
      resolve(step)
    } else {
      accountFrameQueue.push(step)
    }
  }
  function accountFrames() {
    return {
      next: function () {
        if (accountFrameQueue.length > 0) return Promise.resolve(accountFrameQueue.shift())
        return new Promise(function (resolve) { accountFramePending = resolve })
      },
    }
  }
  // The identity routes and the OS-user probe, answered inside the page: the
  // probe for every case, the launcher's contract only for the case that models
  // an HDSL launch. Three different names — the custom nickname Tester, the
  // account's Ada, the launcher's HDSLPlayer — are what make the fallback order
  // observable.
  var realFetch = window.fetch
  var PNG_1PX = Uint8Array.from(
    atob(window.SMOKE_PNG),
    function (c) { return c.charCodeAt(0) })
  function jsonResponse(payload) {
    return new Response(JSON.stringify(payload), { headers: { 'content-type': 'application/json' } })
  }
  window.fetch = function (input, init) {
    var url = typeof input === 'string' ? input : (input && input.url) || ''
    if (url === '/dsh-claude-style/username') return Promise.resolve(jsonResponse({ ok: true, username: 'Tester' }))
    if (url === '/dsh-claude-style/hdsl') {
      // Three launcher cases: the player's own atlas, a built-in figure (no
      // picture at all), and an atlas the player deleted before the page
      // loaded — the two fallbacks the account row has to survive.
      return Promise.resolve(jsonResponse(LAUNCHER[CASE] !== undefined
        ? {
            ok: true, contract: true, name: 'HDSLPlayer', vendor: 'deepseek', kind: 'official',
            skin: 'local', skinModel: 'default', hasSkinImage: LAUNCHER[CASE].hasSkinImage,
          }
        : { ok: true, contract: false }))
    }
    if (url === '/dsh-claude-style/usage' && CASE === 'studio') {
      // A folded answer with the model dimension, so both tabs draw their data.
      // The all-time figures reach past the one listed day (history older than
      // any range window): all time peaks at 3 AM over 500k tokens, today alone
      // peaks at 3 PM over 250k.
      var today = new Date()
      var pad = function (value) { return value < 10 ? '0' + value : String(value) }
      var date = today.getFullYear() + '-' + pad(today.getMonth() + 1) + '-' + pad(today.getDate())
      var dayHours = new Array(24).fill(0)
      dayHours[15] = 3
      var day = { date: date, input: 240000, output: 10000, cacheRead: 0, cacheWrite: 0, calls: 3, sessions: 1,
        sessionIds: ['s1'], models: { 'model-a': 175000, 'model-b': 75000 }, hours: dayHours }
      var hours = new Array(24).fill(0)
      hours[3] = 10
      hours[15] = 3
      return Promise.resolve(jsonResponse({ ok: true, computing: false, value: {
        source: 'local', computedAt: Date.now(), days: [day], firstDay: date, lastDay: date, hours: hours,
        // Eight models, two past the six rows the list shows before it folds.
        models: [
          { id: 'model-a', input: 165000, output: 10000, cacheRead: 0, cacheWrite: 0, calls: 2, tokens: 175000 },
          { id: 'model-b', input: 75000, output: 0, cacheRead: 0, cacheWrite: 0, calls: 1, tokens: 75000 },
        ].concat([6, 5, 4, 3, 2, 1].map(function (size) {
          return { id: 'model-small-' + size, input: size * 10, output: 0, cacheRead: 0, cacheWrite: 0, calls: 1, tokens: size * 10 }
        })),
        totals: { input: 490000, output: 10000, cacheRead: 0, cacheWrite: 0, calls: 9, sessions: 4, activeDays: 3 },
      } }))
    }
    if (url === '/dsh-claude-style/hdsl-skin.png') {
      // An <img> or a canvas source loads this outside the fetch stub, so the
      // HTTP stand-in serves the bytes; this branch only keeps a stray request
      // from reaching the real network.
      if (SKIN_CASES.indexOf(CASE) === -1) return Promise.resolve(new Response(null, { status: 404 }))
      return Promise.resolve(new Response(PNG_1PX, { headers: { 'content-type': 'image/png' } }))
    }
    return realFetch.apply(window, arguments)
  }
  var account = {
    getProfile: CASE === 'install-fault'
      ? function () { return undefined } // host API drift: not a promise
      : launcherCase
        ? function () { return Promise.resolve({ ok: true, value: null }) } // signed out: the launcher's name wins
        : function () {
            if (CASE === 'desktop') window.__profileReads++
            return Promise.resolve({ ok: true, value: { profile: { status: 'ready', value: profile } } })
          },
    watch: CASE === 'desktop'
      ? function () { return { [Symbol.asyncIterator]: accountFrames } }
      : undefined,
  }
  var remote = {
    $stream: function () {
      var stream = { dispose: function () {} }
      stream[Symbol.asyncIterator] = function () { return accountFrames() }
      return stream
    },
    $on: function () { return function () {} },
  }
  // The host's permission catalog: the configured presets, plus the live Auto
  // review preset only while the auto-review integration is registered. The
  // no-auto-review case models the plugin being disabled.
  var configuredPresetOptions = [
    { value: 'read-only', name: 'Read Only', description: 'read only' },
    { value: 'workspace-write', name: 'Workspace Write', description: 'workspace write' },
    { value: 'danger-full-access', name: 'Full access', description: 'full access' },
  ]
  // What each case's catalog carries on top of the configured presets, and the
  // preset its session runs. Every case not listed keeps the live Auto review
  // preset, which is the shipped shape; the auto mode cases model the
  // third-party tier being installed (alone, and together with the built-in one
  // in the hero case, where the slot has to choose). The conversation cases
  // drive the popover, the hero case the segment group.
  var PERMISSION_FIXTURES = {
    'no-auto-review': { extras: [], current: null },
    automode: { extras: [{ value: 'auto-mode', name: 'Auto mode', description: 'classified' }], current: 'workspace-write' },
    'automode-current': {
      extras: [{ value: 'auto-mode', name: 'Auto mode', description: 'classified', icon: 'M9 3 5 9h2l-1 5 4-6H8l1-5Z' }],
      current: 'auto-mode',
    },
    'automode-hero': {
      extras: [{ value: 'auto-mode', name: 'Auto mode', description: 'classified' }, { value: 'auto', name: 'Auto review' }],
      current: 'auto-mode',
    },
    'automode-roundtrip': {
      extras: [{ value: 'auto-mode', name: 'Auto mode', description: 'classified' }],
      current: 'workspace-write',
    },
  }
  var permissionFixture = PERMISSION_FIXTURES[CASE]
  var catalogExtras = permissionFixture === undefined ? [{ value: 'auto', name: 'Auto review' }] : permissionFixture.extras
  var permissionPresets = {
    catalog: function () {
      return Promise.resolve({
        ok: true,
        value: {
          options: configuredPresetOptions.concat(catalogExtras),
          defaultOptions: configuredPresetOptions,
          defaultPreset: 'workspace-write',
        },
      })
    },
  }
  // Host API drift at sync time: a session list that throws, which the
  // permission control and the model picker read on every pass. The auto mode cases carry a real
  // session instead: the control reads the running preset from its projection
  // and switches through the host permission command; the case asserts both.
  var permissionCommands = []
  // The turn-status case: one bound session whose chat snapshot (ui-chat's
  // `chat` target of uiConversation) has a running turn — a settled first step
  // that reported its usage, and a second step streaming its reasoning — and
  // the host's chat wording for durations (English).
  var turnStatusChat = CASE === 'turn-status' ? (function () {
    function stepData(value) { return { get: function (kind) { return kind === 'assistant-step' ? value : undefined } } }
    var turn = {
      turn: 1,
      status: 'open',
      start: { time: Date.now() - 65000 },
      steps: [
        { step: 1, data: stepData({ status: 'settled', step: 1, blocks: [{ kind: 'reasoning' }, { kind: 'tool-call' }], usage: { outputTokens: 1200 } }) },
        { step: 2, data: stepData({ status: 'running', step: 2, blocks: [{ kind: 'reasoning' }] }) },
      ],
    }
    var snapshot = { timeline: { turns: new Map([[1, turn]]) }, legacy: { runningCalls: [] } }
    return {
      binding: function () { return { target: function () { return { getSnapshot: function () { return snapshot } } } } },
    }
  })() : undefined
  var turnStatusLocale = CASE === 'turn-status' ? {
    getSnapshot: function () { return { active: 'en' } },
    subscribe: function () { return function () {} },
    bind: function () {
      var templates = { 'duration.seconds': '{seconds}s', 'duration.minutes': '{minutes}m {seconds}s', 'duration.hours': '{hours}h {minutes}m {seconds}s' }
      return function (key, params) {
        return (templates[key] || key).replace(/\{(\w+)\}/g, function (match, name) { return String(params[name]) })
      }
    },
  } : undefined
  var sessions = CASE === 'turn-status' ? {
    list: { getSnapshot: function () { return { current: undefined } } },
    binding: function (id) { return id === 'smoke-session' ? {} : undefined },
  } : CASE === 'sync-fault'
    ? { list: { getSnapshot: function () { throw new Error('session list unavailable') } }, binding: function () { return null } }
    : (permissionFixture !== undefined && permissionFixture.current !== null ? {
        list: { getSnapshot: function () { return { current: 'smoke-session' } } },
        binding: function () {
          return {
            session: {
              projections: {
                faceOf: function () {
                  return { getSnapshot: function () { return { currentValue: permissionFixture.current } } }
                },
              },
              command: function (line) { permissionCommands.push(line); return undefined },
            },
          }
        },
      } : undefined)
  // The served-namespace directory. The late-forms case starts empty and gains
  // the namespace after apply, the way a cold page sees the host's wire read
  // answer after this plugin has already installed.
  var formsView = { namespaces: CASE === 'late-forms' ? [] : [{ ns: 'ui-skin-claude-style' }] }
  var formsListeners = []
  var forms = {
    get: function () { return form },
    describe: function () {
      return {
        getSnapshot: function () { return { view: formsView } },
        subscribe: function (listener) {
          formsListeners.push(listener)
          return function () {
            var at = formsListeners.indexOf(listener)
            if (at !== -1) formsListeners.splice(at, 1)
          }
        },
        ensure: function () { return Promise.resolve() },
      }
    },
  }
  window.__serveNamespace = function () {
    formsView = { namespaces: [{ ns: 'ui-skin-claude-style' }] }
    for (var fi = 0; fi < formsListeners.length; fi++) formsListeners[fi]()
  }
  // The studio case needs the slot registry: the home panel is an entry in the
  // dock list seat (a list seat, so it carries an id), and the registration is
  // the whole wiring — the seat's own rendering is the host's. The component is
  // kept so the probe can render it the way the seat would.
  var slotRegistry = CASE === 'studio' ? {
    inject: function (key, callback) {
      return key === 'conversation.input.dock' ? callback() : function () {}
    },
    register: function (spec, component) {
      window.__slots = window.__slots || []
      window.__slots.push({ key: spec.name, id: spec.id, order: spec.order, component: typeof component })
      window.__slotComponents = window.__slotComponents || {}
      window.__slotComponents[spec.id] = component
      return function () {}
    },
  } : undefined
  window.__permissionCommands = permissionCommands
  window.__ctx = {
    fiber: { entry: { id: 'ui-skin-claude-style' } },
    get: function (name) {
      if (name === 'configForms') return forms
      if (name === 'remote.account') return account
      if (name === 'remote.permissionPresets') return permissionPresets
      if (name === 'remote') return CASE === 'desktop' ? remote : undefined
      if (name === 'sessions') return sessions
      if (name === 'uiConversation') return turnStatusChat
      if (name === 'locale') return turnStatusLocale
      if (name === 'slots') return slotRegistry
      return undefined
    },
    effect: function (fn) { window.__dispose = fn() },
  }
  // The desktop account service mounts after this plugin does, so the skin waits
  // for it through ctx.inject; the studio case waits for the slot registry the
  // same way. The other cases keep no inject, which is what makes them read
  // synchronously at install (the install-fault case depends on that read
  // throwing).
  if (CASE === 'desktop' || CASE === 'studio') {
    window.__ctx.inject = function (deps, cb) {
      var disposers = []
      cb({
        effect: function (fn) {
          var dispose = fn()
          if (typeof dispose === 'function') disposers.push(dispose)
          return dispose
        },
        get: function (name) { return window.__ctx.get(name) },
      })
      return {
        dispose: function () {
          for (var i = disposers.length - 1; i >= 0; i--) {
            try { disposers[i]() } catch (error) { /* already stopped */ }
          }
        },
      }
    }
  }
  // The host's two statistics dialogs. They mount on the pill's own click, and
  // the host commits them on its own schedule: the delay here is longer than the
  // skin's read window used to be, so a read that gives up early loses the
  // section (the 'card drops to Token usage only' bug).
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
  var statsPills = document.querySelectorAll('[data-composer-stats] button[aria-haspopup="dialog"]')
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
  // Elements are inert unless the probe renders a registered component: then
  // function components run eagerly into a plain tree, and "states" stands in
  // for a click that moved a state off its initial value.
  var react = {
    rendering: false,
    states: null,
    createElement: function (type, props) {
      if (!react.rendering) return null
      var merged = Object.assign({}, props, { children: Array.prototype.slice.call(arguments, 2) })
      return typeof type === 'function' ? type(merged) : { type: type, props: merged }
    },
    useState: function (v) {
      var states = react.states
      return [states !== null && Object.prototype.hasOwnProperty.call(states, v) ? states[v] : v, function () {}]
    },
    useEffect: function () {},
    useRef: function (v) { return { current: v } },
    useLayoutEffect: function () {},
  }
  window.__react = react
  // The host's ui-primitives, as far as the skin uses them: the components its
  // own rows and notices render (inert here, like every element above).
  var primitive = function (type) { return function (props) { return { type: type, props: props } } }
  var primitives = {
    Tooltip: primitive('Tooltip'),
    Toast: primitive('Toast'),
    Modal: primitive('Modal'),
    IconUnarchiveOutlineRegular: primitive('IconUnarchiveOutlineRegular'),
    IconTrashOutlineRegular: primitive('IconTrashOutlineRegular'),
    IconWarningOutlineRegular: primitive('IconWarningOutlineRegular'),
  }
  // The host's react-dom/client. Each root records the element it was created
  // on, how many times it was asked to render and whether it was unmounted, so
  // the probe can follow a root the skin mounts on a seat of its own.
  window.__roots = []
  var reactDom = {
    createRoot: function (element) {
      var root = {
        element: element,
        renders: 0,
        unmounted: false,
        render: function () { root.renders++ },
        unmount: function () { root.unmounted = true },
      }
      window.__roots.push(root)
      return root
    },
  }
  window.__ModuleLoader__ = {
    load: function (def) {
      window.__skin = def.factory(function (name) {
        if (name === 'react') return react
        if (name === 'react-dom/client') return reactDom
        if (name === '@deepseek-ai/dsh-client-ui-primitives') return primitives
        throw new Error('no module ' + name)
      })
    },
  }
})()
