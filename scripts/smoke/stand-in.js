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

  // The host-palette case: the host's own palette and frame, and a theme plugin
  // that rewrites the host's tokens for a wallpaper the way
  // dsh-wallpaper-engine does (canvas and sidebar cleared, overlays and the
  // input turned to glass). Both load before the skin, as the host's do.
  if (CASE === 'host-palette') {
    var hostSheet = document.createElement('style')
    hostSheet.textContent = [
      'body { --dsw-alias-bg-base: rgb(250, 250, 252); --dsw-alias-bg-overlay: rgb(240, 241, 250); --dsw-alias-bg-layer-2: rgb(245, 246, 250);',
      '  --dsw-specific-sidebar-fill: rgb(244, 245, 250); --dsw-specific-input-major: rgb(251, 252, 253); --dsw-specific-selector: rgb(230, 231, 240);',
      '  --dsw-alias-interactive-bg-hover: rgba(10, 20, 30, 0.08); --dsw-alias-label-primary: rgb(17, 18, 19); --dsw-alias-label-secondary: rgb(80, 81, 90);',
      '  --dsw-alias-border-l1: rgb(220, 221, 230); --dsw-alias-link: rgb(30, 90, 200); --dsw-alias-markdown-inline-code: rgb(235, 236, 245);',
      '  --dsw-font-family: "Host Sans", sans-serif; --ds-font-family-code: "Host Mono", monospace; }',
      'body[data-ds-dark-theme] { --dsw-alias-bg-base: rgb(20, 22, 30); --dsw-alias-bg-overlay: rgb(36, 38, 48); --dsw-specific-sidebar-fill: rgb(24, 26, 34);',
      '  --dsw-specific-input-major: rgb(14, 15, 20); --dsw-alias-interactive-bg-hover: rgba(240, 240, 255, 0.08); --dsw-alias-label-primary: rgb(236, 238, 245); }',
      '[data-pane="sidebar"] { background: var(--dsw-specific-sidebar-fill); }',
      'body[data-we-wallpaper] { --dsw-alias-bg-base: transparent; --dsw-specific-sidebar-fill: transparent;',
      '  --dsw-alias-bg-overlay: rgba(255, 255, 255, 0.6); --dsw-specific-input-major: rgba(255, 255, 255, 0.5); }',
    ].join('\n')
    document.head.appendChild(hostSheet)
  }

  var menu = null
  var menuViewport = null
  var menuSizer = null
  var hostRowsHtml = ''
  /** The host's own placement: the card sits above its trigger, by its height. */
  function placeHostMenu() {
    if (!menu || !menu.parentElement || !accountTrigger) return
    var row = accountTrigger.getBoundingClientRect()
    menu.style.top = Math.round(row.top - menu.offsetHeight - 6) + 'px'
    window.__hostMenuTops.push({ at: Math.round(performance.now()), top: menu.style.top })
  }
  function closeHostMenu() {
    if (menuSizer) { menuSizer.disconnect(); menuSizer = null }
    if (menu && menu.parentElement) menu.parentElement.removeChild(menu)
    menu = null
    menuViewport = null
    // The host reports the menu state on its trigger (ui-primitives' Menu).
    if (accountTrigger) accountTrigger.setAttribute('aria-expanded', 'false')
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
    accountTrigger.setAttribute('aria-expanded', 'true')
    // The host's real Menu DOM (ui-primitives/Menu.tsx): a role=menu portal to
    // body, a role=presentation viewport, and itemWrap > button[role=menuitem].
    // Picking an item selects it and the menu closes itself (onSelect), so the
    // skin must not click the trigger again. The sign-out glyph copies
    // LogoutIcon.tsx's geometry: a 16px relative box holding a 13.664x13.571 svg
    // at (1.168, 1.214) absolute.
    hostRowsHtml = CASE === 'desktop'
      ? '<div class="itemWrap"><button type="button" role="menuitem" aria-keyshortcuts="Control+,">' +
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
    // The host's shared menu card carries this material marker (ui-primitives'
    // Menu), which is what the skin's card rules are keyed on.
    menu.setAttribute('data-menu-material', '')
    menuViewport = document.createElement('div')
    menuViewport.className = 'viewport'
    menuViewport.setAttribute('role', 'presentation')
    menu.appendChild(menuViewport)
    fillHostRows()
    // The host places the card from its own geometry when it mounts it, and
    // re-places it on the frame after its list changes (measured on the real
    // menu: the skin's container lands a frame after the mount, the card grows,
    // and the host follows one frame later). __hostMenuTops records every
    // placement so the probe can tell the frames apart.
    window.__hostMenuTops = []
    placeHostMenu()
    if (typeof ResizeObserver === 'function') {
      menuSizer = new ResizeObserver(function () { requestAnimationFrame(placeHostMenu) })
      menuSizer.observe(menu)
    }
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
  var formListeners = []
  var formValue = { username: username, collapseFooter: true, homeLayout: CASE === 'studio' ? 'studio' : 'classic', brand: CASE === 'deepy' ? 'off' : undefined }
  // The crab-states case picks the crab, whose states it walks through.
  if (CASE === 'crab-states') formValue.mascot = 'crab'
  // The switches-off case starts with every feature switch off.
  if (CASE === 'switches-off') {
    Object.assign(formValue, { permissionsControl: false, workspaceView: false, sidebarSearch: false, turnStatus: false, viewTabs: false, chatAnimations: false })
  }
  var form = {
    // The deepy case stores the DeepSeek brand under the value earlier builds
    // wrote for it ("off"), which has to read as the DeepSeek brand.
    getSnapshot: function () { return { status: 'ready', value: formValue } },
    subscribe: function (listener) {
      formListeners.push(listener)
      return function () {}
    },
    set: function () { return Promise.resolve(true) },
  }
  // The settings store, driven by hand: __pushForm writes a value and notifies
  // the skin's subscription, which is what the settings page's own writes do.
  window.__pushForm = function (patch) {
    Object.assign(formValue, patch)
    for (var i = 0; i < formListeners.length; i++) formListeners[i]()
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
  /** The cases that carry the turn-status chat fixture: the turn-status case, and the two feature-switch cases. */
  var turnFixtureCase = CASE === 'turn-status' || CASE === 'switches' || CASE === 'switches-off'
  // The turn-status case: one bound session whose chat snapshot (ui-chat's
  // `chat` target of uiConversation) has a failed first turn that ran 12s and
  // reported 300 output tokens, then a running turn — a settled first step
  // that reported its usage, and a second step streaming its reasoning — and
  // the host's chat wording (English).
  var turnStatusChat = turnFixtureCase ? (function () {
    function stepData(value) { return { get: function (kind) { return kind === 'assistant-step' ? value : undefined } } }
    var failed = {
      turn: 1,
      status: 'closed',
      start: { time: 1000 },
      end: { time: 13000, data: { reason: { kind: 'error' } } },
      steps: [
        { step: 1, data: stepData({ status: 'settled', step: 1, blocks: [{ kind: 'text' }], usage: { outputTokens: 300 } }) },
      ],
    }
    var running = {
      turn: 2,
      status: 'open',
      start: { time: Date.now() - 65000 },
      steps: [
        { step: 1, data: stepData({ status: 'settled', step: 1, blocks: [{ kind: 'reasoning' }, { kind: 'tool-call' }], usage: { outputTokens: 1200 } }) },
        { step: 2, data: stepData({ status: 'running', step: 2, blocks: [{ kind: 'reasoning' }] }) },
      ],
    }
    var snapshot = { timeline: { turns: new Map([[1, failed], [2, running]]) }, legacy: { runningCalls: [] } }
    return {
      binding: function () { return { target: function () { return { getSnapshot: function () { return snapshot } } } } },
    }
  })() : undefined
  // The host's `chat` locale namespace, the one its own pills read: the skin's
  // context-popover block takes its labels and its duration / token templates
  // from here, so the fixture carries the same keys the host registers.
  var chatTemplates = {
    'duration.compactSeconds': '{seconds}s',
    'duration.compactMinutes': '{minutes}m{seconds}s',
    'number.groupSeparator': ',',
    'message.tokensPerSecond': '{tps} tok/s',
    'message.turnUsage.count': '{count} tok',
    'message.turnUsage.cacheHit': 'Cache hit',
    'message.turnUsage.input': 'Uncached input',
    'message.turnUsage.cacheRead': 'Cached input',
    'message.turnUsage.cacheWrite': 'Cache write',
    'message.turnUsage.output': 'Output',
    'stats.dialog.title': 'Session statistics',
    'stats.dialog.usageTitle': 'Token usage',
    'stats.dialog.llmTime': 'LLM time',
    'stats.dialog.toolTime': 'Tool call time',
    'stats.dialog.ttft': 'Avg time to first token (TTFT)',
    'stats.dialog.speed': 'Tokens per second (TPS)',
    'chat.turnNavigation.jump': 'Jump to turn {turn}',
    'chat.turnNavigation.turn': 'Turn {turn}',
  }
  /** The two cases that drive the skin's session-statistics block (detailed and compact rows). */
  var statsFixtureCase = CASE === 'context-stats' || CASE === 'stats-compact'
  var localeFixture = turnFixtureCase || statsFixtureCase || CASE === 'turn-nav' ? {
    getSnapshot: function () { return { active: 'en' } },
    subscribe: function () { return function () {} },
    bind: function () {
      var templates = Object.assign({
        'duration.seconds': '{seconds}s',
        'duration.minutes': '{minutes}m {seconds}s',
        'duration.hours': '{hours}h {minutes}m {seconds}s',
        'message.stopped': 'Stopped',
        'message.turnProcess.failed': 'Failed',
      }, chatTemplates)
      return function (key, params) {
        var template = templates[key] || key
        if (params === undefined) return template
        return template.replace(/\{(\w+)\}/g, function (match, name) { return String(params[name]) })
      }
    },
  } : undefined
  var turnStatusLocale = localeFixture
  // The turn-nav case: the turn rail's two sources, as the host merges them.
  // The whole-log outline (the `turnOutline` projection) names five turns, the
  // second opened by something other than a message; the chat snapshot's
  // loaded window holds the last two, whose own prompt wins over the outline's.
  // The probe builds the rail itself (one mark per turn) and presses through it.
  var turnNav = CASE === 'turn-nav' ? (function () {
    var outline = [
      { turn: 1, seq: 0, prompt: 'first question', response: '' },
      { turn: 2, seq: 10, prompt: '', response: '' },
      { turn: 3, seq: 20, prompt: 'third question', response: '' },
      { turn: 4, seq: 30, prompt: 'fourth question', response: '' },
      { turn: 5, seq: 40, prompt: 'fifth question', response: '' },
    ]
    var loaded = [
      { turn: 4, anchorKey: 'u4', prompt: 'fourth question, as loaded', response: '' },
      { turn: 5, anchorKey: 'u5', prompt: 'fifth question', response: '' },
    ]
    var snapshot = { navigation: { items: function () { return loaded } }, timeline: { turns: new Map() }, legacy: { runningCalls: [] } }
    var outlineFace = { getSnapshot: function () { return outline }, subscribe: function () { return function () {} } }
    return {
      conversation: { binding: function () { return { target: function () { return { getSnapshot: function () { return snapshot } } } } } },
      sessions: {
        list: {
          getSnapshot: function () { return { current: undefined, phase: 'ready', ids: [], byId: {}, projectionsBySession: {} } },
          subscribe: function () { return function () {} },
        },
        binding: function (id) {
          if (id !== 'smoke-nav') return undefined
          return { session: { projections: { faceOf: function (key) { return key === 'turnOutline' ? outlineFace : undefined } } } }
        },
      },
    }
  })() : undefined
  // The deepy and crab-states cases: the session the mascot follows, as the
  // host's services describe it — the session status (uiSession), the session
  // list with its subagent catalog, the chat snapshot's open turn and the
  // session's event feed. The probe drives all four through __deepy.
  var deepy = CASE === 'deepy' || CASE === 'crab-states' ? (function () {
    var statusListeners = []
    var feedListeners = []
    var status = new Map()
    var chatListeners = []
    var list = { ids: ['smoke-deepy'], byId: { 'smoke-deepy': { id: 'smoke-deepy', running: false } }, projectionsBySession: {} }
    // The feed's window, as the host's MutableSessionEventSource publishes it:
    // every entry so far, a revision per change, and the change itself.
    var feedEntries = []
    var feed = { entries: feedEntries, revision: 0, change: { kind: 'replace', entries: feedEntries } }
    function publishFeed(change) {
      feed = { entries: feedEntries, revision: feed.revision + 1, change: change }
      notify(feedListeners)
    }
    var snapshot = { timeline: { turnOrder: [], turns: new Map() }, legacy: { runningCalls: [] } }
    function notify(listeners) { listeners.slice().forEach(function (listener) { listener() }) }
    function subscribe(listeners) {
      return function (listener) {
        listeners.push(listener)
        return function () {
          var at = listeners.indexOf(listener)
          if (at !== -1) listeners.splice(at, 1)
        }
      }
    }
    window.__deepy = {
      /** One session's status entry; the whole map is replaced, as the host's is. */
      setStatus: function (id, entry) {
        status = new Map(status)
        status.set(id, Object.assign({ running: false, pendingInteraction: undefined, completionUnread: false }, entry))
        notify(statusListeners)
      },
      /** The open turn: `newest` is its streaming step's newest block kind, or null for a closed turn. */
      setTurn: function (newest) {
        var steps = newest === undefined ? [] : [{ step: 1, data: { get: function (kind) {
          return kind === 'assistant-step' ? { status: 'running', step: 1, blocks: newest === 'none' ? [] : [{ kind: newest }] } : undefined
        } } }]
        var turn = { turn: 1, status: newest === null ? 'closed' : 'open', steps: newest === null ? [] : steps }
        snapshot = { timeline: { turnOrder: [1], turns: new Map([[1, turn]]) }, legacy: { runningCalls: [] } }
        notify(chatListeners)
      },
      /** Whether anything subscribed to the chat target, the subscription that activates it on the host. */
      chatFollowed: function () { return chatListeners.length > 0 },
      /** More top-level sessions, for the working tiers. */
      addSessions: function (ids) {
        list = { ids: list.ids.concat(ids), byId: Object.assign({}, list.byId), projectionsBySession: list.projectionsBySession }
        ids.forEach(function (id) { list.byId[id] = { id: id, running: false } })
      },
      setSubagents: function (children) {
        list = {
          ids: list.ids,
          byId: Object.assign({}, list.byId),
          projectionsBySession: { 'smoke-deepy': { values: { subagentCatalog: children.map(function (id) { return { id: id } }) } } },
        }
        children.forEach(function (id) { list.byId[id] = { id: id, origin: 'subagent', running: false } })
      },
      /** Append one live event to the session's feed. */
      emit: function (event) {
        var entries = [{ type: 'event', event: event }]
        feedEntries = feedEntries.concat(entries)
        publishFeed({ kind: 'append', entries: entries })
      },
      /**
       * A reconnect: the feed sends its window again whole, with `events` the
       * connection missed at its end.
       */
      resend: function (events) {
        feedEntries = feedEntries.concat(events.map(function (event) { return { type: 'event', event: event } }))
        publishFeed({ kind: 'replace', entries: feedEntries })
      },
    }
    var eventSource = { getSnapshot: function () { return feed }, subscribe: subscribe(feedListeners) }
    var chatTarget = { getSnapshot: function () { return snapshot }, subscribe: subscribe(chatListeners) }
    return {
      sessions: {
        list: { getSnapshot: function () { return list } },
        binding: function (id) { return id === 'smoke-deepy' ? { sessionId: id, eventSource: eventSource } : undefined },
      },
      uiSession: { sessionStatus: { getSnapshot: function () { return status }, subscribe: subscribe(statusListeners) } },
      conversation: {
        binding: function () { return { target: function () { return chatTarget } } },
      },
    }
  })() : undefined
  // The context-popover case: the host's two session projections, served as
  // key-addressed read faces on the session binding — the seat the host's own
  // useProjection resolves (window.__pushStats writes a new whole value and
  // notifies the subscribed face, the way a projection frame lands).
  var statsCase = statsFixtureCase ? (function () {
    // Both projections start absent, the way a session whose baseline has not
    // landed yet answers: the skin's block holds the numbers' place until
    // __pushStats delivers the first frame.
    var values = { sessionStats: undefined, tokenUsage: undefined }
    var listeners = {}
    var faces = {}
    // Every key answers with a face — absence is an undefined snapshot, never a
    // missing face (the host's ProjectionValueStore contract), so a reader of a
    // key this fixture does not carry gets `undefined` instead of a crash.
    function faceOf(key) {
      if (faces[key] === undefined) {
        listeners[key] = []
        faces[key] = {
          getSnapshot: function () { return values[key] },
          subscribe: function (listener) {
            listeners[key].push(listener)
            return function () {
              var at = listeners[key].indexOf(listener)
              if (at !== -1) listeners[key].splice(at, 1)
            }
          },
        }
      }
      return faces[key]
    }
    window.__pushStats = function (key, patch) {
      values[key] = values[key] === undefined ? patch : Object.assign({}, values[key], patch)
      ;(listeners[key] || []).slice().forEach(function (listener) { listener() })
    }
    return {
      sessions: {
        list: { getSnapshot: function () { return { current: 'smoke-stats', ids: [], byId: {}, projectionsBySession: {} } } },
        binding: function (id) {
          if (id !== 'smoke-stats') return undefined
          return { sessionId: id, session: { projections: { faceOf: faceOf } } }
        },
      },
    }
  })() : undefined
  // The switch cases also need the sidebar workspace view, which follows the
  // host's two client lists: an empty archive set, ready.
  var switchCase = CASE === 'switches' || CASE === 'switches-off'
  var workspacesService = switchCase ? {
    list: {
      getSnapshot: function () { return { phase: 'ready', archivedSessionIds: [] } },
      subscribe: function () { return function () {} },
    },
  } : undefined
  var sessions = deepy !== undefined ? deepy.sessions : turnNav !== undefined ? turnNav.sessions : statsFixtureCase ? statsCase.sessions : turnFixtureCase ? {
    list: {
      getSnapshot: function () { return { current: undefined, phase: 'ready', ids: [], byId: {}, projectionsBySession: {} } },
      subscribe: function () { return function () {} },
    },
    binding: function (id) { return id === 'smoke-session' ? {} : undefined },
  } : CASE === 'sync-fault'
    ? { list: { getSnapshot: function () { throw new Error('session list unavailable') } }, binding: function () { return null } }
    : (permissionFixture !== undefined && permissionFixture.current !== null ? {
        list: { getSnapshot: function () { return { current: 'smoke-session', ids: [], byId: {}, projectionsBySession: {} } } },
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
  // The settings case declares the settings dialog's section slot and the
  // plugin page's config slot instead, so the probe can render the page. The
  // peer case declares those two plus the tool seat, so the probe can see both
  // the page it greys out and the seat keys the file rows must leave alone.
  var slotRegistry = CASE === 'studio' || CASE === 'settings' || CASE === 'chat-files' || CASE === 'peer-chat-ux' || CASE === 'skin-center-handoff' || CASE === 'skin-center-arrival' ? {
    inject: function (key, callback) {
      var declared = CASE === 'studio'
        ? key === 'conversation.input.dock'
        : CASE === 'chat-files'
          ? key === 'tool.call.toolview'
          : CASE === 'skin-center-handoff' || CASE === 'skin-center-arrival'
            ? key === 'settings.section' || key === 'plugins.bundle.config'
          : CASE === 'peer-chat-ux'
            ? key === 'tool.call.toolview' || key === 'settings.section' || key === 'plugins.bundle.config'
            : key === 'settings.section' || key === 'plugins.bundle.config'
      return declared ? callback() : function () {}
    },
    register: function (spec, component) {
      window.__slots = window.__slots || []
      var entry = { key: spec.name, id: spec.id, seat: spec.key, priority: spec.priority, order: spec.order, component: typeof component }
      window.__slots.push(entry)
      window.__slotComponents = window.__slotComponents || {}
      window.__slotComponents[spec.id === undefined ? spec.key : spec.id] = component
      // The host hands back a disposer and the skin calls it when a feature
      // comes down: the list is live, so a case can tell "registered" from
      // "handed back".
      var live = true
      return function () {
        if (!live) return
        live = false
        var at = window.__slots.indexOf(entry)
        if (at >= 0) window.__slots.splice(at, 1)
      }
    },
    // The host lists a slot's entries in render order (ui-slots' registry),
    // each with the options it was registered under.
    entries: function (key) {
      var out = []
      var all = window.__slots || []
      for (var i = 0; i < all.length; i++) {
        if (all[i].key !== key) continue
        out.push({ options: { id: all[i].id, order: all[i].order } })
      }
      return out
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
      if (name === 'workspaces') return workspacesService
      if (name === 'uiConversation') return deepy !== undefined ? deepy.conversation : turnNav !== undefined ? turnNav.conversation : turnStatusChat
      if (name === 'uiSession') return deepy !== undefined ? deepy.uiSession : undefined
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
  if (CASE === 'desktop' || CASE === 'studio' || CASE === 'settings' || CASE === 'chat-files' || CASE === 'peer-chat-ux' || CASE === 'skin-center-handoff' || CASE === 'skin-center-arrival') {
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
  // The host's context panel: the meter's own trigger opens and closes it, and
  // the host portals it to <body>. Its rows are a <dl> like the stats dialogs',
  // so the skin tells the three apart by their markers (the stats dialogs carry
  // data-session-stats-*, this one carries neither) — see
  // features/context-stats/session-stats.ts contextPanel().
  var meterTrigger = document.getElementById('context-meter')
  var contextPanel = null
  if (meterTrigger !== null) {
    meterTrigger.addEventListener('click', function () {
      if (contextPanel !== null) {
        if (contextPanel.parentElement) contextPanel.parentElement.removeChild(contextPanel)
        contextPanel = null
        meterTrigger.setAttribute('aria-expanded', 'false')
        return
      }
      meterTrigger.setAttribute('aria-expanded', 'true')
      contextPanel = document.createElement('div')
      contextPanel.id = 'context-panel'
      contextPanel.setAttribute('role', 'dialog')
      contextPanel.setAttribute('aria-label', '上下文已用')
      contextPanel.innerHTML = '<div class="_m_header_1"><span>上下文已用</span><span>42%</span></div>' +
        '<dl class="_m_rows_1">' +
          '<div class="_m_row_1"><dt>系统提示词</dt><dd>~1.5K</dd></div>' +
          '<div class="_m_row_1"><dt>工具定义</dt><dd>~7.8K</dd></div>' +
          '<div class="_m_row_1"><dt>对话消息</dt><dd>~242K</dd></div>' +
        '</dl>'
      document.body.appendChild(contextPanel)
    })
  }
  // Another plugin's popover, portaled to the same <body> before the host's
  // panel is: dsh-better-sidebar's agent node detail. Its wrapper only
  // positions, the card inside paints the surface, and the rows are a `dl` —
  // what a generation before this one took for the host's panel, leaving the
  // block and the panel marks behind when the client hot reloaded it.
  if (statsFixtureCase) {
    var foreignPopover = document.createElement('div')
    foreignPopover.id = 'foreign-popover'
    foreignPopover.setAttribute('role', 'dialog')
    foreignPopover.setAttribute('aria-label', '节点详情')
    foreignPopover.setAttribute('data-dsh-claude-context-panel', '')
    foreignPopover.setAttribute('data-dsh-claude-context-aligned', '')
    foreignPopover.style.position = 'fixed'
    foreignPopover.style.left = '8px'
    foreignPopover.style.top = '8px'
    var foreignCard = document.createElement('div')
    foreignCard.setAttribute('class', '_popCard_1')
    foreignCard.innerHTML = '<dl><dt>状态</dt><dd>运行中</dd></dl>'
    var strayBlock = document.createElement('div')
    strayBlock.id = 'stray-context-block'
    strayBlock.className = 'dsh-claude-context-stats'
    strayBlock.setAttribute('data-dsh-claude-context-stats', '')
    foreignCard.appendChild(strayBlock)
    foreignPopover.appendChild(foreignCard)
    document.body.appendChild(foreignPopover)
  }
  // Elements are inert unless the probe renders a registered component: then
  // function components run eagerly into a plain tree, and "states" stands in
  // for a click that moved a state off its initial value.
  var react = {
    rendering: false,
    states: null,
    createElement: function (type, props) {
      if (!react.rendering) return null
      // As React does, children passed as arguments replace props.children; with none passed, props.children stands.
      var children = arguments.length > 2 ? Array.prototype.slice.call(arguments, 2)
        : props && props.children !== undefined ? props.children : []
      var merged = Object.assign({}, props, { children: children })
      return typeof type === 'function' ? type(merged) : { type: type, props: merged }
    },
    useState: function (v) {
      var states = react.states
      return [states !== null && Object.prototype.hasOwnProperty.call(states, v) ? states[v] : v, function () {}]
    },
    useEffect: function () {},
    useMemo: function (fn) { return fn() },
    useCallback: function (fn) { return fn },
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
    // The file-change row's own share (features/chat-files/): the disclosure row,
    // the shimmer, the diff card and its two icons are the host's primitives, and
    // the totals helper counts one added and one removed line per hunk.
    DisclosureRow: primitive('DisclosureRow'),
    TextShimmer: primitive('TextShimmer'),
    DiffBlock: primitive('DiffBlock'),
    IconEditOutlineRegular: primitive('IconEditOutlineRegular'),
    IconInspectOutlineRegular: primitive('IconInspectOutlineRegular'),
    diffTotals: function (hunks) {
      var added = 0
      var removed = 0
      for (var i = 0; i < hunks.length; i += 1) {
        var before = hunks[i].oldText === null ? '' : String(hunks[i].oldText)
        var after = String(hunks[i].newText)
        if (after !== '') added += after.split('\n').length
        if (before !== '') removed += before.split('\n').length
      }
      return { added: added, removed: removed }
    },
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
  // A sibling plugin's stylesheet, mounted before this bundle's factory runs and
  // left untagged the way a plugin that injects from apply() leaves it (D33):
  // the host's claim sweep would attribute it to whichever package materializes
  // next, and that package's next reload would then remove it. The probe reads
  // its tag and plays that removal step.
  var siblingSheet = document.createElement('style')
  siblingSheet.id = 'smoke-sibling-sheet'
  siblingSheet.textContent = '.smoke-sibling-sheet{color:rgb(1, 2, 3)}'
  document.head.appendChild(siblingSheet)
})()
