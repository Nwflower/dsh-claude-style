/**
 * The permission ladder read off the host's catalog: the rows a preset the host
 * does not serve leaves out, the row a plugin's preset adds, the pick path that
 * sends the host's permission command, and the home-view round trip that has to
 * fill a fresh control again.
 */
(function () {
  var probe = window.__dshSmokeProbe
  var sleep = probe.sleep
  var r = probe.report

  probe.step(async function () {
    // The host's own access-mode button: the permission control stands in for
    // it while installed, and hands it back when switched off.
    var hostAccess = document.querySelector('button[aria-label^="Access mode"]')
    r.hostAccessVisible = hostAccess !== null && getComputedStyle(hostAccess).display !== 'none'
    // The permission ladder follows the host's catalog: a preset it does not
    // serve has no row at all, and one a plugin adds (the auto mode plugin's)
    // gets its own. Each row's shape is read so names, the active mark and the
    // "no glyphs in this list" rule can be asserted.
    var permAutoPopoverRow = document.querySelector('.dsh-claude-perm-popover [data-preset="auto"]')
    var permAutoSegment = document.querySelector('.dsh-claude-segment[data-preset="auto"]')
    r.permAutoRowDisplay = permAutoPopoverRow !== null ? getComputedStyle(permAutoPopoverRow).display : null
    r.permAutoSegmentDisplay = permAutoSegment !== null ? getComputedStyle(permAutoSegment).display : null
    r.permRows = Array.prototype.map.call(document.querySelectorAll('.dsh-claude-perm-popover [data-preset]'), function (it) {
      return {
        preset: it.getAttribute('data-preset'),
        display: getComputedStyle(it).display,
        text: (it.textContent || '').trim(),
        active: it.hasAttribute('data-active'),
        glyphs: it.querySelectorAll('svg').length,
      }
    })
    var permLabelEl = document.querySelector('.dsh-claude-perm-label')
    r.permLabel = permLabelEl === null ? null : permLabelEl.textContent
    r.permSegments = Array.prototype.map.call(document.querySelectorAll('.dsh-claude-segment'), function (it) {
      return { preset: it.getAttribute('data-preset'), text: it.textContent, active: it.hasAttribute('data-active') }
    })
    // The pick path, end to end: switch to the auto mode tier and read what the
    // control sent the session (the host permission command line).
    var autoModeRow = document.querySelector('.dsh-claude-perm-popover [data-preset="auto-mode"]')
    if (autoModeRow !== null) {
      autoModeRow.click()
      await sleep(80)
    }
    r.permissionCommands = window.__permissionCommands.slice()
    // A round trip through the home view: the hero layout takes the trigger and
    // its popover out of the tree, and coming back builds a fresh, empty one
    // that has to be filled again.
    await probe.onlyFor(['automode-roundtrip'], async function () {
      var wakePass = function () {
        var node = document.createElement('span')
        document.body.appendChild(node)
        document.body.removeChild(node)
      }
      var composerCard = document.querySelector('[data-composer-card]')
      r.rowsBeforeHome = Array.prototype.map.call(document.querySelectorAll('.dsh-claude-perm-popover [data-preset]'), function (it) {
        return it.getAttribute('data-preset')
      })
      composerCard.setAttribute('data-phase', 'hero')
      wakePass()
      await sleep(250)
      r.segmentsInHome = Array.prototype.map.call(document.querySelectorAll('.dsh-claude-segment'), function (it) {
        return it.getAttribute('data-preset')
      })
      r.popoversInHome = document.querySelectorAll('.dsh-claude-perm-popover').length
      composerCard.removeAttribute('data-phase')
      wakePass()
      await sleep(250)
      r.rowsAfterReturn = Array.prototype.map.call(document.querySelectorAll('.dsh-claude-perm-popover [data-preset]'), function (it) {
        return it.getAttribute('data-preset')
      })
    })
  })
})()
