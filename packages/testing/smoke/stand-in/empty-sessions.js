/**
 * The empty session list several cases stand on: nothing current, nothing
 * listed, and `binding` deciding which id answers. turn-nav.js and sessions.js
 * build their fixtures on it; page.cjs runs this part before both.
 */
(function () {
  window.__dshSmokeHost.emptySessions = function (binding) {
    return {
      list: {
        getSnapshot: function () { return { phase: 'ready', ids: [], byId: {}, projectionsBySession: {} } },
        subscribe: function () { return function () {} },
      },
      binding: binding,
    }
  }
})()
