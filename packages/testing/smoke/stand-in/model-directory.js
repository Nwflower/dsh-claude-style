/**
 * The model directory the model-meter page reads: two provider groups, with the
 * model in force sitting in the group level 1 does not list — the case that
 * makes the picker append the seat's own row at the bottom of that level.
 *
 * The ids are the ones the rate catalog's alias table knows, so one row of each
 * kind is on the page: a model a profile claims, a model no profile claims, and
 * the seat's own row.
 *
 * The effort page (packages/testing/specs/behaviour/effort-picker/) reads the
 * same directory with a model that carries a reasoning ladder, its strongest
 * level in force: the trigger stands beside the model name and the card opens
 * on the top rung. A second provider stands beside the official one there, so
 * the picker's second level has rows of its own to search
 * (packages/testing/specs/behaviour/model-picker/), and each of its models
 * carries a ladder of its own, so a model pick changes the level with it.
 *
 * The directory answers a selection the way the host's own store does: `select`
 * holds the snapshot in `selecting`, empty of groups and seat, for the whole
 * round trip, and answers with the seat it landed on. `echoDelay` is how long
 * that round trip takes, so a spec that reads the window can stretch it to the
 * seconds a slow provider takes; zero answers in the same task.
 */
(function () {
  var host = window.__dshSmokeHost
  if (host.CASE !== 'model-meter' && host.CASE !== 'effort') return

  var reasoning = {
    defaultEffort: 'high',
    efforts: [{ id: 'low', name: 'Low' }, { id: 'medium', name: 'Medium' }, { id: 'high', name: 'High' }, { id: 'max', name: 'Max' }],
  }
  /** The reasoning ladder the second provider's flagship offers: its own default is what a reader lands on when they pick it. */
  var otherReasoning = {
    defaultEffort: 'low',
    efforts: reasoning.efforts,
  }
  var groups = host.CASE === 'effort' ? [
    { id: 'deepseek-official', name: 'DeepSeek', models: [{ id: 'deepseek-reasoner', name: 'DeepSeek V4 Reasoner Extended Context', description: 'The thinking one.', reasoning: reasoning }] },
    {
      id: 'zai',
      name: 'Z.ai',
      models: [
        { id: 'glm-5.3', name: 'GLM-5.3', description: 'The flagship one.', reasoning: otherReasoning },
        { id: 'glm-4.7', name: 'GLM-4.7', description: 'The older one.' },
      ],
    },
  ] : [
    {
      id: 'deepseek-official',
      name: 'DeepSeek',
      models: [
        // Every model carries the catalog's own description: that is the
        // third source the picker's description line draws from (the copy
        // document is not served to this page), and it is what makes the
        // switch's effect readable on these rows.
        { id: 'deepseek-flash', name: 'V4.1 Flash', description: 'The small, quick one.' },
        // No profile claims this one, so its row carries no meter.
        { id: 'kimi-k3', name: 'Kimi K3', description: 'The long-context one.' },
      ],
    },
    { id: 'zai', name: 'Z.ai', models: [{ id: 'glm-5.3', name: 'GLM-5.3', description: 'The flagship one.' }] },
  ]
  if (host.CASE === 'model-meter') {
    groups.push({ id: 'ocg', name: 'Gateway', models: [{ id: 'deepseek-flash', name: 'Gateway Flash' }] })
  }
  var current = host.CASE === 'effort'
    ? { provider: 'deepseek-official', model: 'deepseek-reasoner', reasoningEffort: 'max' }
    : { provider: 'zai', model: 'glm-5.3' }
  var snapshot = { status: 'ready', current: current, groups: groups }
  var listeners = []

  /** Tell the directory's subscribers the snapshot moved (the store's own notify). */
  function emit() {
    for (var i = 0; i < listeners.length; i++) listeners[i]()
  }

  /** The model one seat names, or null where no group holds it. */
  function modelOf(provider, id) {
    for (var g = 0; g < groups.length; g++) {
      if (groups[g].id !== provider) continue
      for (var m = 0; m < groups[g].models.length; m++) {
        if (groups[g].models[m].id === id) return groups[g].models[m]
      }
    }
    return null
  }

  /**
   * The seat a selection lands on. A selection that names no level keeps the
   * one in force when it picks the model already seated, and otherwise takes
   * the picked model's own default — the host's own rule.
   */
  function seatFor(selection) {
    var seat = { provider: selection.provider, model: selection.model }
    var level = selection.reasoningEffort
    if (level === undefined) {
      if (snapshot.current !== null && snapshot.current.provider === seat.provider && snapshot.current.model === seat.model) {
        level = snapshot.current.reasoningEffort
      } else {
        var model = modelOf(seat.provider, seat.model)
        level = model !== null && model.reasoning ? model.reasoning.defaultEffort : undefined
      }
    }
    if (level !== undefined) seat.reasoningEffort = level
    return seat
  }

  var directory = {
    /** How long the host's enumeration round trip takes, in milliseconds. */
    echoDelay: 0,
    load: function () { return Promise.resolve() },
    select: function (selection) {
      var answer = { status: 'ready', current: seatFor(selection), groups: groups }
      // The host marks the directory `selecting` for the whole selectModel
      // round trip, and the snapshot carries no groups and no seat in it.
      snapshot = { status: 'selecting', current: null, groups: [] }
      emit()
      if (!(directory.echoDelay > 0)) {
        snapshot = answer
        emit()
        return Promise.resolve()
      }
      return new Promise(function (resolve) {
        setTimeout(function () {
          snapshot = answer
          emit()
          resolve()
        }, directory.echoDelay)
      })
    },
    store: {
      getSnapshot: function () { return snapshot },
      subscribe: function (listener) {
        listeners.push(listener)
        return function () {
          var at = listeners.indexOf(listener)
          if (at >= 0) listeners.splice(at, 1)
        }
      },
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
