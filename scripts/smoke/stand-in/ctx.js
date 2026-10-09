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
  var turnStatusChat = host.turnStatusChat
  var turnStatusLocale = host.turnStatusLocale
  var slotRegistry = host.slotRegistry

  window.__permissionCommands = host.permissionCommands
  window.__ctx = {
    fiber: { entry: { id: 'ui-skin-claude-style' } },
    get: function (name) {
      if (name === 'configForms') return forms
      if (name === 'remote.account') return account
      if (name === 'remote.permissionPresets') return permissionPresets
      if (name === 'remote') return CASE === 'desktop' ? remote : undefined
      if (name === 'sessions') return sessions
      if (name === 'modelDirectories') return host.modelDirectories
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
  // for it through ctx.inject; the studio and reader cases wait for the slot
  // registry the same way, and the chunk-late case for the settings section's seats. The
  // other cases keep no inject, which is what makes them read
  // synchronously at install (the install-fault case depends on that read
  // throwing).
  if (CASE === 'desktop' || CASE === 'studio' || CASE === 'settings' || CASE === 'chunk-late' || CASE === 'chat-files' || CASE === 'chat-reader' || CASE === 'peer-chat-ux' || CASE === 'skin-center-handoff' || CASE === 'skin-center-arrival') {
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
})()
