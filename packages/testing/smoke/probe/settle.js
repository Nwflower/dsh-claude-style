/**
 * The page is left to settle, then the readings every case draws on: the idle
 * pass count, the host's hidden statistics figures and the session list's
 * leading seats.
 */
(function () {
  var probe = window.__dshSmokeProbe
  var sleep = probe.sleep
  var r = probe.report

  probe.step(async function () {
    // The reads below depend on the skin's first pass having landed, and the
    // full tier's idle check counts the frames the page asks for in one second
    // of wall clock: a renderer still coming up hands out a frame or two per
    // second, and a quiet window measured in wall clock alone would read those
    // frames as a page that never went idle. The settle rule waits on frames
    // and animations as well (prelude.js), and here also on a quarter second
    // with no pass: a timer that came due just behind a quiet run asks for its
    // frame a few milliseconds later, inside the second the check counts.
    await probe.settle(250)
    if (window.SMOKE_TIER !== 'quick') {
      // A pass inside the sample means the page had not settled yet: let that
      // activity finish, then take a fresh whole-second sample. A page that keeps
      // asking for passes still fails when no idle window arrives by the deadline.
      var deadline = performance.now() + 8000
      for (;;) {
        var from = window.__passes
        var mark = performance.now()
        await sleep(1000)
        r.idlePasses = window.__passes - from
        // Where the frames of that second landed, for the check's own detail.
        r.idlePassTimes = window.__passTimes
          .filter(function (t) { return t >= mark })
          .map(function (t) { return Math.round(t - mark) })
        if (r.idlePasses === 0 || performance.now() >= deadline) break
        await probe.settle(250)
      }
    }
    // The host's statistics are hidden outright: the figures stay in the
    // document as the read's own click targets, and their dialogs are read into
    // the context popover instead (the 'default' case below).
    var statsFigures = Array.prototype.slice.call(document.querySelectorAll('[data-composer-stat]'))
    r.statsHidden = statsFigures.length > 0 && statsFigures.every(function (el) { return getComputedStyle(el).display === 'none' })
    r.statsStrayCards = document.querySelectorAll('.dsh-claude-stats-popover').length
    // The host's idle outlet stays mounted without painting a decorative circle;
    // a native running indicator remains visible in its trailing cell.
    var seats = document.querySelectorAll('[data-dsh-claude-part~="session-row"] [data-dsh-claude-part~="row-slot"]')
    function seatState(seat) {
      if (!seat) return null
      var outlet = seat.querySelector(':scope > [data-slot]')
      var target = outlet !== null ? outlet : seat
      var after = getComputedStyle(target, '::after')
      return { visibility: getComputedStyle(seat).visibility, content: after.content, width: after.width, border: after.borderTopWidth, svgs: seat.querySelectorAll('svg').length }
    }
    r.seatIdle = seatState(seats[0])
    r.seatRunning = seatState(seats[1])
  })
})()
