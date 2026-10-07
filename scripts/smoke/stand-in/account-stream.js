/**
 * The desktop account stream, driven by hand: remote.$stream wraps
 * remote.account.watch, and __pushAccountFrame hands the skin one frame. A
 * frame's accept is a no-op, and the next next() pends until the next push, so
 * the stream never spins. The profile each case publishes hangs off the host
 * namespace for the account service.
 */
(function () {
  var host = window.__dshSmokeHost
  var CASE = host.CASE
  var MARKUP = host.MARKUP

  var profile = CASE === 'markup'
    ? { name: MARKUP, avatarUrl: 'https://cdn.example.invalid/a.png?"><img src=x onerror=window.__pwned=1> onmouseover=window.__pwned=1' }
    : { name: 'Ada', avatarUrl: 'https://cdn.example.invalid/a.png' }
  window.__profileReads = 0
  var accountFrameQueue = []
  var accountFramePending = null
  window.__pushAccountFrame = function (view) {
    var step = { done: false, value: { value: view, accept: function () {} } }
    if (accountFramePending !== null) {
      var resolve = accountFramePending
      accountFramePending = null
      resolve(step)
    } else {
      accountFrameQueue.push(step)
    }
  }
  function accountFrames() {
    return {
      next: function () {
        if (accountFrameQueue.length > 0) return Promise.resolve(accountFrameQueue.shift())
        return new Promise(function (resolve) { accountFramePending = resolve })
      },
    }
  }
  host.profile = profile
  host.accountFrames = accountFrames
})()
