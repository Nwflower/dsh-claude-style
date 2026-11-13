/**
 * The cordis context the bundle is applied to: every service the skin reads
 * behind ctx.get, the disposer apply()'s effect hands back, and — for the cases
 * whose service mounts after this plugin — the inject the skin waits through.
 */
(function () {
  var host = window.__dshSmokeHost
  var CASE = host.CASE
  var forms = host.forms
  var account = host.account
  var permissionPresets = host.permissionPresets
  var remote = host.remote
  var sessions = host.sessions
  var workspacesService = host.workspacesService
  var deepy = host.deepy
  var turnNav = host.turnNav
  var waitChat = host.waitChat
  var localeService = host.localeService
  var slotRegistry = host.slotRegistry

  window.__permissionCommands = host.permissionCommands
  window.__ctx = {
    fiber: { entry: { id: 'ui-skin-claude-style' } },
    get: function (name) {
      if (name === 'configForms') return forms
      if (name === 'remote.account') return account
      if (name === 'remote.permissionPresets') return permissionPresets
      if (name === 'remote') return CASE === 'desktop' || CASE === 'session-title' ? remote : undefined
      if (name === 'remote.agentTeams') return host.agentTeam === undefined ? undefined : host.agentTeam.remote
      if (name === 'remote.session') return CASE === 'session-title' ? remote.session : undefined
      if (name === 'sessions') return sessions
      if (name === 'modelDirectories') return host.modelDirectories
      if (name === 'workspaces') return workspacesService
      if (name === 'uiConversation') return deepy !== undefined ? deepy.conversation : turnNav !== undefined ? turnNav.conversation : waitChat
      // The session the shell shows, as the host's uiSession publishes it; a fixture names it as `selected`.
      // The sync-fault case's selection throws the way its session list does.
      if (name === 'uiSession') {
        if (deepy !== undefined) return deepy.uiSession
        if (CASE === 'sync-fault') return { current: { get value() { throw new Error('session selection unavailable') } } }
        return { current: { value: { key: sessions !== undefined ? sessions.selected : undefined } } }
      }
      if (name === 'locale') return localeService
      // The effort case models the documented boundary (D75): the plugin's own context hands no registry out; only the injected scope serves it.
    if (name === 'slots') return CASE === 'effort' ? undefined : slotRegistry
      return undefined
    },
    effect: function (fn) { window.__dispose = fn() },
  }
  // The desktop account service mounts after this plugin does, so the skin waits
  // for it through ctx.inject; the studio case waits for the slot
  // registry the same way, the effort case too — its own context hands no
  // registry out, the way the documented boundary reads (D75), the chunk-late case for the settings section's seats,
  // the search case for its sidebar seat, and the switch cases
  // for the row-action seat their workspace delete action registers into.
  // The other cases keep no inject, which is what makes them
  // read synchronously at install (the install-fault case depends on that read
  // throwing).
  if (CASE === 'desktop' || CASE === 'effort' || CASE === 'search' || CASE === 'studio' || CASE === 'settings' || CASE === 'chunk-late' || CASE === 'chat-files' || CASE === 'peer-chat-ux' || CASE === 'switches' || CASE === 'switches-off' || CASE === 'skin-center-handoff' || CASE === 'skin-center-arrival' || CASE === 'composer' || CASE === 'permissions-locale') {
    window.__ctx.inject = function (deps, cb) {
      var disposers = []
      cb({
        effect: function (fn) {
          var dispose = fn()
          if (typeof dispose === 'function') disposers.push(dispose)
          return dispose
        },
        get: function (name) { if (name === 'slots') return slotRegistry; return window.__ctx.get(name) },
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
})()
