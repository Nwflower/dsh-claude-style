/**
 * Runs in the page before the bundle: counts the scheduler's frames and records
 * the errors nothing caught, the two readings every case's report draws on. The
 * host stand-in itself is built by the faces beside this file, which share
 * window.__dshSmokeHost and nothing else.
 */
(function () {
  // The bundle exposes its pass entry only on a page carrying this marker.
  window.__dshStandIn = true
  var CASE = window.SMOKE_CASE
  var MARKUP = window.SMOKE_MARKUP
  window.__dshSmokeHost = { CASE: CASE, MARKUP: MARKUP }
  window.__pwned = 0
  window.__passes = 0
  // The skin's scheduler passes, which the settle rule reads: a feature painting
  // its own frames (the effort field's canvas) asks the page for a frame every
  // tick without asking the scheduler for one.
  window.__dshClaudePasses = 0
  window.__passTimes = []
  var raf = window.requestAnimationFrame.bind(window)
  // The settle probe drives the clock through this reference while it waits: the
  // frames it asks for are frame work the stand-in's own count must not see.
  window.__nativeRaf = raf
  window.requestAnimationFrame = function (cb) {
    return raf(function (t) {
      window.__passes++
      if (window.__passTimes.length === 32) window.__passTimes.shift()
      window.__passTimes.push(performance.now())
      cb(t)
    })
  }
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
