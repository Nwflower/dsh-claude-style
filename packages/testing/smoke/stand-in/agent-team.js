/**
 * The Agent Teams seats the model picker's switch reads on the effort page: the
 * shown session's `agentTeam` and `modelSelection` projections, as key-addressed
 * faces, and the `remote.agentTeams` call that saves the selection. A spec
 * drives them through `window.__agentTeam`.
 */
(function () {
  var host = window.__dshSmokeHost
  if (host.CASE !== 'effort') return
  var SESSION = 'smoke-session'
  var state = { agentTeam: { enabled: false }, modelSelection: { lastUsed: null } }
  var listeners = { agentTeam: [], modelSelection: [] }
  var control = {
    /** Every `setEnabled` the picker made, as `[sessionId, enabled]`. */
    calls: [],
    /** The message the next save answers with as a failure; null answers with success. */
    failNext: null,
    /** Whether the session has recorded a model request (`modelSelection.lastUsed`). */
    start: function (started) {
      state.modelSelection = { lastUsed: started ? { provider: 'smoke', model: 'smoke' } : null }
      notify('modelSelection')
    },
    enabled: function () { return state.agentTeam.enabled },
  }
  function notify(key) {
    for (var i = 0; i < listeners[key].length; i++) listeners[key][i]()
  }
  function face(key) {
    return {
      getSnapshot: function () { return state[key] },
      subscribe: function (listener) {
        listeners[key].push(listener)
        return function () { listeners[key] = listeners[key].filter(function (entry) { return entry !== listener }) }
      },
    }
  }
  window.__agentTeam = control
  host.agentTeam = {
    sessions: Object.assign(host.emptySessions(function () {
      return { session: { projections: { faceOf: face }, command: function () { return undefined } } }
    }), { selected: SESSION }),
    remote: {
      setEnabled: function (sessionId, enabled) {
        control.calls.push([sessionId, enabled])
        if (control.failNext !== null) {
          var message = control.failNext
          control.failNext = null
          return Promise.resolve({ ok: false, error: { message: message } })
        }
        state.agentTeam = { enabled: enabled }
        notify('agentTeam')
        return Promise.resolve({ ok: true })
      },
    },
  }
})()
