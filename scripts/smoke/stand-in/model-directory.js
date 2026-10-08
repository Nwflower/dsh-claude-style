/**
 * The model directory the model-meter page reads: two provider groups, with the
 * model in force sitting in the group level 1 does not list — the case that
 * makes the picker append the seat's own row at the bottom of that level.
 *
 * The ids are the ones the rate catalog's alias table knows, so one row of each
 * kind is on the page: a model a profile claims, a model no profile claims, and
 * the seat's own row.
 */
(function () {
  var host = window.__dshSmokeHost
  if (host.CASE !== 'model-meter') return

  var snapshot = {
    status: 'ready',
    current: { provider: 'zai', model: 'glm-5.3' },
    groups: [
      {
        id: 'deepseek-official',
        name: 'DeepSeek',
        models: [
          { id: 'deepseek-flash', name: 'V4.1 Flash' },
          // No profile claims this one, so its row carries no meter.
          { id: 'kimi-k3', name: 'Kimi K3' },
        ],
      },
      { id: 'zai', name: 'Z.ai', models: [{ id: 'glm-5.3', name: 'GLM-5.3' }] },
    ],
  }
  var directory = {
    load: function () { return Promise.resolve() },
    select: function () { return Promise.resolve() },
    store: {
      getSnapshot: function () { return snapshot },
      subscribe: function () { return function () {} },
    },
  }
  host.modelDirectories = {
    directoryFor: function (id) { return id === 'smoke-session' ? directory : undefined },
  }
  host.sessions = {
    list: {
      getSnapshot: function () { return { current: 'smoke-session', phase: 'ready', ids: [], byId: {}, projectionsBySession: {} } },
    },
    binding: function () { return undefined },
  }
})()
