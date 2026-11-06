/**
 * The session whose title the header shows, for the `session-title` page: one
 * current session the list carries a name for, and the host's own rename behind
 * `remote.session`, which records what it was asked to write so a case can read
 * it back.
 */
(function () {
  var host = window.__dshSmokeHost
  if (host.CASE !== 'session-title') return
  window.__renamed = []
  var snapshot = {
    phase: 'ready',
    ids: ['smoke-session'],
    byId: { 'smoke-session': { id: 'smoke-session', displayTitle: 'smoke session', updatedAt: 0 } },
    projectionsBySession: {},
  }
  host.sessions = {
    selected: 'smoke-session',
    list: {
      getSnapshot: function () { return snapshot },
      subscribe: function () { return function () {} },
    },
    binding: function () { return undefined },
    refresh: function () { return Promise.resolve() },
  }
  var remote = host.remote === undefined ? {} : host.remote
  remote.session = {
    // The host answers with the title it accepted, and its own title row follows
    // the name it now carries.
    rename: function (request) {
      window.__renamed.push(request)
      snapshot.byId['smoke-session'].displayTitle = request.title
      var words = document.querySelector('._crumbCurrent_s_1')
      if (words !== null) words.textContent = request.title
      return Promise.resolve({ ok: true, value: { title: request.title, seq: 1 } })
    },
  }
  host.remote = remote
})()

