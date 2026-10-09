/**
 * The right sidebar's docked panels: with "Float docked panels" on, each pane
 * is the skin's own card; with it off, no card rule matches, so the pane stands
 * in the host's own fill flush with the column and the split keeps the dock's
 * own resting line. Read off computed styles, through the same preference
 * write the settings page makes.
 */
(function () {
  var probe = window.__dshSmokeProbe
  var sleep = probe.sleep
  var r = probe.report

  probe.step(async function () {
    await probe.onlyFor(['dock-cards'], async function () {
      var read = function (id) {
        var el = document.getElementById(id)
        var s = getComputedStyle(el)
        return { margin: s.margin, radius: s.borderRadius, border: s.borderTopWidth, shadow: s.boxShadow, overflow: s.overflow }
      }
      var divider = function () {
        var line = document.querySelector('[data-dockkit-split] > [class*="_divider_"]')
        return getComputedStyle(line, '::before').backgroundColor
      }
      var snapshot = function () {
        return {
          look: document.body.getAttribute('data-dsh-claude-dock-look'),
          empty: read('debugDockEmpty'),
          pane: read('debugDockPane'),
          left: read('debugSplitLeft'),
          right: read('debugSplitRight'),
          divider: divider(),
        }
      }
      r.dock = { card: snapshot() }
      window.__pushForm({ dockCards: false })
      await sleep(50)
      r.dock.flush = snapshot()
      window.__pushForm({ dockCards: true })
      await sleep(50)
      r.dock.back = snapshot()
    })
  })
})()
