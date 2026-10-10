/**
 * The settings store and the value each case starts it on: the plugin action
 * patched with the markup payload, the launcher contract three cases model, the
 * identity name, and the settings the case seeds before the bundle.
 */
(function () {
  var host = window.__dshSmokeHost
  var CASE = host.CASE
  var MARKUP = host.MARKUP

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
  // The stats-inline case drives the line of their own, which is the shipped
  // default; the two popover cases ask the numbers back into the panel.
  if (CASE === 'stats-inline') formValue.statsPosition = 'inline'
  if (CASE === 'context-stats' || CASE === 'stats-compact') formValue.statsPosition = 'context'
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
  host.LAUNCHER = LAUNCHER
  host.launcherCase = launcherCase
  host.form = form
  host.formValue = formValue
  host.formListeners = formListeners
})()
