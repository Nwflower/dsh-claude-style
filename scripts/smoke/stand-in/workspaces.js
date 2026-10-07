/**
 * The switch cases also need the sidebar workspace view, which follows the
 * host's two client lists: an empty archive set, ready.
 */
(function () {
  var host = window.__dshSmokeHost
  var CASE = host.CASE

  var switchCase = CASE === 'switches' || CASE === 'switches-off'
  var workspacesService = switchCase ? {
    list: {
      getSnapshot: function () { return { phase: 'ready', archivedSessionIds: [] } },
      subscribe: function () { return function () {} },
    },
  } : undefined
  host.workspacesService = workspacesService
})()
