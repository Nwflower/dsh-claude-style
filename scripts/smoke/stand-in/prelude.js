/**
 * Runs in the page before the bundle: counts the scheduler's frames and records
 * the errors nothing caught, the two readings every case's report draws on. The
 * host stand-in itself is built by the faces beside this file, which share
 * window.__dshSmokeHost and nothing else.
 */
(function () {
  var CASE = window.SMOKE_CASE
  var MARKUP = window.SMOKE_MARKUP
  window.__dshSmokeHost = { CASE: CASE, MARKUP: MARKUP }
  window.__pwned = 0
  window.__passes = 0
  var raf = window.requestAnimationFrame.bind(window)
  window.requestAnimationFrame = function (cb) { return raf(function (t) { window.__passes++; cb(t) }) }
  window.__errors = []
  // Errors nothing caught: thrown out of a callback, reported through
  // reportError(), or a promise rejection no one handled. The skin must leave
  // none behind in any case.
  window.__uncaught = []
  window.addEventListener('error', function (event) { window.__uncaught.push(String(event.error && event.error.stack || event.message)) })
  window.addEventListener('unhandledrejection', function (event) { window.__uncaught.push('unhandled rejection: ' + String(event.reason && event.reason.stack || event.reason)) })
  var consoleError = console.error
  console.error = function () {
    window.__errors.push(Array.prototype.map.call(arguments, String).join(' '))
    consoleError.apply(console, arguments)
  }
})()
