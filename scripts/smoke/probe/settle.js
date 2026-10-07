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
    // The reads below depend on the skin's first pass having landed. Waiting
    // for the page to go quiet, rather than for a fixed delay, keeps that true
    // on a slow machine without spending the delay on a fast one; the full tier
    // then watches for a pass, which is the idle check, and the quick tier
    // leaves that check out.
    var quietSince = window.__passes
    for (var waited = 0, quiet = 0; waited < 30 && quiet < 6; waited += 1) {
      await sleep(50)
      if (window.__passes === quietSince) quiet += 1
      else { quiet = 0; quietSince = window.__passes }
    }
    if (window.SMOKE_TIER !== 'quick') {
      var from = window.__passes
      await sleep(1000)
      r.idlePasses = window.__passes - from
    }
    // The host's statistics are hidden outright, in both of its shapes: the
    // figures stay in the document as the read's own click targets, and their
    // dialogs are read into the context popover instead (the 'default' case
    // below). The host marks each figure since its 2026-09 update and marked the
    // container around them before, so both marks are checked.
    var statsFigures = Array.prototype.slice.call(document.querySelectorAll('[data-composer-stat], [data-composer-stats]'))
    r.statsHidden = statsFigures.length > 0 && statsFigures.every(function (el) { return getComputedStyle(el).display === 'none' })
    r.statsStrayCards = document.querySelectorAll('.dsh-claude-stats-popover').length
    // The session list's leading seat. The host's newer rows render it through a
    // slot outlet, so an idle row's seat is not :empty — the circle has to hang
    // on the empty outlet anchor. A seat carrying the running status dot keeps
    // its own paint and gets no circle.
    var seats = document.querySelectorAll('[class*="sessionRow"] [class*="slot"]')
    function seatState(seat) {
      if (!seat) return null
      var outlet = seat.querySelector(':scope > [data-slot]')
      var target = outlet !== null ? outlet : seat
      var after = getComputedStyle(target, '::after')
      return { content: after.content, width: after.width, border: after.borderTopWidth, svgs: seat.querySelectorAll('svg').length }
    }
    r.seatIdle = seatState(seats[0])
    r.seatRunning = seatState(seats[1])
  })
})()
