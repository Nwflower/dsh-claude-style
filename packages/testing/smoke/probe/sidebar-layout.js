/**
 * The sidebar's own layout choice: "Relaxed" is the stylesheet as written and
 * "Compact" takes the same declarations down (D76's settings row for a look no * feature owns). Read off computed styles through the same preference write the
 * settings page makes, so the wiring preference → document attribute → rule is
 * what the case holds.
 */
(function () {
  var probe = window.__dshSmokeProbe
  var sleep = probe.sleep
  var r = probe.report

  probe.step(async function () {
    await probe.onlyFor(['sidebar-layout'], async function () {
      var snapshot = function () {
        var row = document.querySelector('[data-dsh-claude-part~="session-row"]')
        var foot = document.querySelector('[data-dsh-claude-part~="foot-area"]')
        var style = function (el) { return el === null ? null : getComputedStyle(el) }
        var rowStyle = style(row)
        var footStyle = style(foot)
        return {
          attr: document.body.getAttribute('data-dsh-claude-sidebar-layout'),
          rowHeight: row === null ? null : Math.round(row.getBoundingClientRect().height),
          rowMin: rowStyle === null ? null : rowStyle.minHeight,
          footPadding: footStyle === null ? null : footStyle.paddingTop + ' ' + footStyle.paddingBottom,
        }
      }
      r.sidebarLayout = { relaxed: snapshot() }
      window.__pushForm({ sidebarLayout: 'compact' })
      await sleep(50)
      r.sidebarLayout.compact = snapshot()
      window.__pushForm({ sidebarLayout: 'relaxed' })
      await sleep(50)
      r.sidebarLayout.back = snapshot()
    })
  })
})()
