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
    // The names alone, out of the two-line rows: what the interface language
    // decides, as opposed to the line under each name.
    var presetNames = function () {
      return Array.prototype.map.call(document.querySelectorAll('.dsh-claude-perm-popover [data-preset]'), function (it) {
        var name = it.querySelector('.dsh-claude-popover-item-text')
        return name === null ? null : name.textContent
      })
    }
    // The line under each name, which the same switch decides.
    var presetDescs = function () {
      return Array.prototype.map.call(document.querySelectorAll('.dsh-claude-perm-popover [data-preset]'), function (it) {
        var desc = it.querySelector('.dsh-claude-popover-item-desc')
        return desc === null ? null : desc.textContent
      })
    }
    var triggerName = function () {
      var el = document.querySelector('.dsh-claude-perm-label')
      return el === null ? null : el.textContent
    }
    // The pick path, end to end: switch to the auto mode tier and read what the
    // control sent the session (the host permission command line).
    var autoModeRow = document.querySelector('.dsh-claude-perm-popover [data-preset="auto-mode"]')
    if (autoModeRow !== null) {
      autoModeRow.click()
      await sleep(80)
    }
    r.permissionCommands = window.__permissionCommands.slice()
    var hintOf = function (node) { return node === null ? null : node.textContent }
    var hints = function () {
      return {
        hosted: hintOf(document.getElementById('hostedHint')),
        synthetic: hintOf(document.querySelector('[data-dsh-synthetic-placeholder]')),
      }
    }
    // The interface language decides the tier names: the Chinese page reads the
    // host's own dictionary, and a switch repaints the rows and the trigger.
    // The composer's idle hint is the skin's own copy, so it follows the same
    // switch, in the host's own hint and in the stand-in the skin draws for a
    // card the host leaves without one.
    await probe.onlyFor(['permissions-locale'], async function () {
      var card = document.querySelector('[data-composer-card]')
      var editor = document.getElementById('editor')
      // The page's rail, as ui-attachment draws it.
      function mountRail() {
        var rail = document.createElement('div')
        rail.className = '_54WpYG_rail'
        rail.innerHTML = '<div class="JVDQca_rail"><div class="JVDQca_item _54WpYG_imageItem"><button type="button" class="JVDQca_thumbnail _54WpYG_thumbnail"><img alt=""></button></div></div>'
        return rail
      }
      // The host's own hint, as the host draws it for an empty draft.
      function mountHint() {
        var hint = document.createElement('div')
        hint.id = 'hostedHint'
        hint.setAttribute('data-composer-placeholder', '')
        hint.textContent = '输入 / 以使用命令'
        return hint
      }
      // The attachment form: the rail stands in the card and the host's own hint
      // is gone. The host leaves the field's own text in place when a file is
      // attached, so the card is what says the draft is empty.
      function attachmentForm() {
        card.querySelector(`[data-composer-placeholder]:not([${'data-dsh-synthetic-placeholder'}])`)?.remove()
        card.appendChild(mountRail())
        editor.setAttribute('data-placeholder', '发消息或创建任务, / 调用指令, @ 文件或对话')
        card.appendChild(document.createElement('i'))
      }
      // The host's reading of the card: its own hint is back and the rail has
      // gone.
      function plainForm() {
        card.querySelector('[class*="_rail"]')?.remove()
        card.querySelector(`[data-composer-placeholder]:not([${'data-dsh-synthetic-placeholder'}])`)?.remove()
        card.appendChild(mountHint())
        card.appendChild(document.createElement('i'))
      }
      r.permNamesZh = presetNames()
      r.permDescsZh = presetDescs()
      r.permTriggerZh = triggerName()
      r.hintsZh = hints()
      attachmentForm()
      await sleep(250)
      r.hintsDrawnZh = hintOf(document.querySelector('[data-dsh-synthetic-placeholder]'))
      plainForm()
      card.appendChild(document.createElement('i'))
      await sleep(250)
      card.appendChild(document.createElement('i'))
      await sleep(250)
      r.hintsPlainZh = hintOf(document.querySelector('[data-dsh-synthetic-placeholder]'))
      // The attachment form once more, for the switch: the words the skin shows
      // are its own copy, in the language the shell carries then.
      attachmentForm()
      await sleep(250)
      r.hintsBackZh = hintOf(document.querySelector('[data-dsh-synthetic-placeholder]'))
      window.__dshSmokeHost.setSmokeLocale('en')
      await sleep(250)
      r.permNamesEn = presetNames()
      r.permDescsEn = presetDescs()
      r.permTriggerEn = triggerName()
      r.hintsEn = hintOf(document.querySelector('[data-dsh-synthetic-placeholder]'))
    })
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

