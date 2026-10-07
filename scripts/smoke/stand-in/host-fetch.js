/**
 * The identity routes and the OS-user probe, answered inside the page: the probe
 * for every case, the launcher's contract only for the case that models an HDSL
 * launch, the studio case's usage answer, and the launcher's atlas bytes. Three
 * different names — the custom nickname Tester, the account's Ada, the
 * launcher's HDSLPlayer — are what make the fallback order observable.
 */
(function () {
  var host = window.__dshSmokeHost
  var CASE = host.CASE
  var LAUNCHER = host.LAUNCHER

  var realFetch = window.fetch
  var PNG_1PX = Uint8Array.from(
    atob(window.SMOKE_PNG),
    function (c) { return c.charCodeAt(0) })
  function jsonResponse(payload) {
    return new Response(JSON.stringify(payload), { headers: { 'content-type': 'application/json' } })
  }
  window.fetch = function (input, init) {
    var url = typeof input === 'string' ? input : (input && input.url) || ''
    if (url === '/dsh-claude-style/username') return Promise.resolve(jsonResponse({ ok: true, username: 'Tester' }))
    if (url === '/dsh-claude-style/hdsl') {
      // Three launcher cases: the player's own atlas, a built-in figure (no
      // picture at all), and an atlas the player deleted before the page
      // loaded — the two fallbacks the account row has to survive.
      return Promise.resolve(jsonResponse(LAUNCHER[CASE] !== undefined
        ? {
            ok: true, contract: true, name: 'HDSLPlayer', vendor: 'deepseek', kind: 'official',
            skin: 'local', skinModel: 'default', hasSkinImage: LAUNCHER[CASE].hasSkinImage,
          }
        : { ok: true, contract: false }))
    }
    if (url === '/dsh-claude-style/usage' && CASE === 'studio') {
      // A folded answer with the model dimension, so both tabs draw their data.
      // The all-time figures reach past the one listed day (history older than
      // any range window): all time peaks at 3 AM over 500k tokens, today alone
      // peaks at 3 PM over 250k.
      var today = new Date()
      var pad = function (value) { return value < 10 ? '0' + value : String(value) }
      var date = today.getFullYear() + '-' + pad(today.getMonth() + 1) + '-' + pad(today.getDate())
      var dayHours = new Array(24).fill(0)
      dayHours[15] = 3
      var day = { date: date, input: 240000, output: 10000, cacheRead: 0, cacheWrite: 0, calls: 3, sessions: 1,
        sessionIds: ['s1'], models: { 'model-a': 175000, 'model-b': 75000 }, hours: dayHours }
      var hours = new Array(24).fill(0)
      hours[3] = 10
      hours[15] = 3
      return Promise.resolve(jsonResponse({ ok: true, computing: false, value: {
        source: 'local', computedAt: Date.now(), days: [day], firstDay: date, lastDay: date, hours: hours,
        // Eight models, two past the six rows the list shows before it folds.
        models: [
          { id: 'model-a', input: 165000, output: 10000, cacheRead: 0, cacheWrite: 0, calls: 2, tokens: 175000 },
          { id: 'model-b', input: 75000, output: 0, cacheRead: 0, cacheWrite: 0, calls: 1, tokens: 75000 },
        ].concat([6, 5, 4, 3, 2, 1].map(function (size) {
          return { id: 'model-small-' + size, input: size * 10, output: 0, cacheRead: 0, cacheWrite: 0, calls: 1, tokens: size * 10 }
        })),
        totals: { input: 490000, output: 10000, cacheRead: 0, cacheWrite: 0, calls: 9, sessions: 4, activeDays: 3 },
      } }))
    }
    if (url === '/dsh-claude-style/hdsl-skin.png') {
      // An <img> or a canvas source loads this outside the fetch stub, so the
      // HTTP stand-in serves the bytes; this branch only keeps a stray request
      // from reaching the real network.
      if (SKIN_CASES.indexOf(CASE) === -1) return Promise.resolve(new Response(null, { status: 404 }))
      return Promise.resolve(new Response(PNG_1PX, { headers: { 'content-type': 'image/png' } }))
    }
    return realFetch.apply(window, arguments)
  }
})()
