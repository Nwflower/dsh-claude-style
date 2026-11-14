/**
 * A tool body's output arriving (packages/client/src/features/chat-tool-lines/):
 * the rows a batch brings are marked with the offset their place in that batch
 * earns, the marks come off once the batch has landed, a line streaming in on
 * its own is drawn at once, and a conversation the page mounts on its own is
 * never replayed.
 */
(function () {
  var probe = window.__dshSmokeProbe
  var r = probe.report

  probe.step(async function () {
    await probe.onlyFor(['chat-tool-lines'], async function () {
      var rowSelector = '[' + probe.surface('chat.tool-line') + ']'
      // What the page is playing on the marked rows: the offset each arrival
      // starts from, as the browser itself holds it.
      var arrivalPeek = function () {
        var rows = Array.prototype.slice.call(document.querySelectorAll(rowSelector))
        return {
          marked: rows.length,
          delays: rows.map(function (row) {
            return row.getAnimations().map(function (animation) {
              var timing = animation.effect ? animation.effect.getComputedTiming() : null
              return timing === null ? null : Number(timing.delay)
            }).filter(function (delay) { return delay !== null })
          }).map(function (delays) { return delays.length === 0 ? null : delays[0] }),
        }
      }
      var addLines = function (id, count) {
        var holder = document.getElementById(id)
        for (var index = 0; index < count; index += 1) {
          var line = document.createElement('div')
          line.className = '_lineT_x_1'
          line.textContent = 'streamed line ' + index
          holder.appendChild(line)
        }
      }
      var press = function (id) { document.getElementById(id).click() }
      var landed = function (read) { return read[read.length - 1].marked === 0 }

      // A batch the page mounts on its own — nothing pressed, no turn running —
      // is a conversation already ended: its rows stand as the host drew them.
      addLines('debugTerminalRows', 2)
      var alone = await probe.watch(arrivalPeek)
      // A body the reader opens arrives whole: four rows in one batch, two at a
      // time.
      await probe.settle()
      press('debugTerminal')
      addLines('debugTerminalRows', 4)
      var sweep = await probe.watch(arrivalPeek)
      var afterSweep = await probe.until(arrivalPeek, landed, 'the arrivals to land and their marks to come off')
      // A line a running command appends on its own is drawn at once.
      press('debugTerminal')
      addLines('debugTerminalRows', 1)
      var single = await probe.watch(arrivalPeek)
      await probe.until(arrivalPeek, landed, 'the single arrival to land')
      // The read card's rows are a batch of their own, and a diff's rows are one
      // batch per side: the two sides of a hunk sweep together.
      press('debugRead')
      addLines('debugReadRows', 2)
      var read = await probe.watch(arrivalPeek)
      await probe.until(arrivalPeek, landed, 'the read card\u2019s rows to land')
      var left = document.getElementById('debugDiffLeft').firstElementChild
      var right = document.getElementById('debugDiffRight').firstElementChild
      var addDiffRow = function (section, kind) {
        var row = document.createElement('div')
        row.setAttribute('data-diff-line', kind)
        row.textContent = kind
        section.appendChild(row)
      }
      press('debugDiff')
      addDiffRow(left, 'del')
      addDiffRow(right, 'add')
      var diff = await probe.watch(arrivalPeek)
      await probe.until(arrivalPeek, landed, 'the diff\u2019s rows to land')
      // The animation choice takes the whole arrival with it (D40).
      window.__pushForm({ motion: 'reduced' })
      await probe.settle()
      press('debugTerminal')
      addLines('debugTerminalRows', 2)
      var reduced = await probe.watch(arrivalPeek)
      window.__pushForm({ motion: 'system' })
      await probe.settle()
      press('debugTerminal')
      addLines('debugTerminalRows', 2)
      var back = await probe.watch(arrivalPeek)

      r.toolLines = {
        alone: alone,
        sweep: sweep,
        landed: afterSweep[afterSweep.length - 1],
        single: single,
        read: read,
        diff: diff,
        reduced: reduced,
        back: back,
      }
    })
  })
})()
