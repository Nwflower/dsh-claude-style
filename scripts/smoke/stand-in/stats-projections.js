/**
 * The context-popover case: the host's two session projections, served as
 * key-addressed read faces on the session binding — the seat the host's own
 * useProjection resolves (window.__pushStats writes a new whole value and
 * notifies the subscribed face, the way a projection frame lands).
 */
(function () {
  var host = window.__dshSmokeHost
  var statsFixtureCase = host.statsFixtureCase

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
  host.statsCase = statsCase
})()
