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
    // The wallets a signed-in account answers with; a spec sets
    // `window.__balanceFixture` to the whole answer it wants instead.
    getBalance: launcherCase
      ? function () { return Promise.resolve({ ok: true, value: null }) }
      : function () {
          if (window.__balanceFixture !== undefined) return Promise.resolve(window.__balanceFixture)
          return Promise.resolve({ ok: true, value: { status: 'ready', value: [{ currency: 'CNY', balance: '12.34' }], bonusWallets: [] } })
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
