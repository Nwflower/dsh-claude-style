/**
 * The turn-nav case: the turn rail's two sources, as the host merges them. The
 * whole-log outline (the `turnOutline` projection) names five turns, the second
 * opened by something other than a message; the chat snapshot's loaded window
 * holds the last two, whose own prompt wins over the outline's. The probe builds
 * the rail itself (one mark per turn) and presses through it.
 */
(function () {
  var host = window.__dshSmokeHost
  var CASE = host.CASE

  var turnNav = CASE === 'turn-nav' ? (function () {
    var outline = [
      { turn: 1, seq: 0, prompt: 'first question', response: '' },
      { turn: 2, seq: 10, prompt: '', response: '' },
      { turn: 3, seq: 20, prompt: 'third question', response: '' },
      { turn: 4, seq: 30, prompt: 'fourth question', response: '' },
      { turn: 5, seq: 40, prompt: 'fifth question', response: '' },
    ]
    var loaded = [
      { turn: 4, anchorKey: 'u4', prompt: 'fourth question, as loaded', response: '' },
      { turn: 5, anchorKey: 'u5', prompt: 'fifth question', response: '' },
    ]
    var snapshot = { navigation: { items: function () { return loaded } }, timeline: { turns: new Map() }, legacy: { runningCalls: [] } }
    var outlineFace = { getSnapshot: function () { return outline }, subscribe: function () { return function () {} } }
    // A second conversation, long enough that the card's list holds fewer rows
    // than the turns: twenty outline turns, whose loaded window is the same
    // snapshot's last two, so the two rails agree on every turn either way.
    var longOutline = []
    for (var li = 0; li < 20; li++) {
      longOutline.push({ turn: li + 1, seq: li * 10, prompt: 'turn ' + (li + 1) + ' question', response: '' })
    }
    var longFace = { getSnapshot: function () { return longOutline }, subscribe: function () { return function () {} } }
    return {
      conversation: { binding: function () { return { target: function () { return { getSnapshot: function () { return snapshot } } } } } },
      sessions: host.emptySessions(function (id) {
        if (id === 'smoke-nav') return { session: { projections: { faceOf: function (key) { return key === 'turnOutline' ? outlineFace : undefined } } } }
        if (id === 'smoke-nav-long') return { session: { projections: { faceOf: function (key) { return key === 'turnOutline' ? longFace : undefined } } } }
        return undefined
      }),
    }
  })() : undefined
  host.turnNav = turnNav
})()
