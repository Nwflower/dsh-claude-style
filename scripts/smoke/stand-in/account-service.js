/**
 * The account service and the remote object the skin subscribes through: the
 * profile read a case may break at install, a signed-out answer for the launcher
 * cases, and the stream wrapper over the hand-driven frames.
 */
(function () {
  var host = window.__dshSmokeHost
  var CASE = host.CASE
  var launcherCase = host.launcherCase
  var profile = host.profile
  var accountFrames = host.accountFrames

  var account = {
    getProfile: CASE === 'install-fault'
      ? function () { return undefined } // host API drift: not a promise
      : launcherCase
        ? function () { return Promise.resolve({ ok: true, value: null }) } // signed out: the launcher's name wins
        : function () {
            if (CASE === 'desktop') window.__profileReads++
            return Promise.resolve({ ok: true, value: { profile: { status: 'ready', value: profile } } })
          },
    watch: CASE === 'desktop'
      ? function () { return { [Symbol.asyncIterator]: accountFrames } }
      : undefined,
  }
  var remote = {
    $stream: function () {
      var stream = { dispose: function () {} }
      stream[Symbol.asyncIterator] = function () { return accountFrames() }
      return stream
    },
    $on: function () { return function () {} },
  }
  host.account = account
  host.remote = remote
})()
