/**
 * The feature switches: each switched feature's own marks on the page, read
 * after a preference write and a pass. Off has to leave none of a feature's
 * marks (its teardown handed the surface back); on brings them back, live,
 * without touching the others.
 */
(function () {
  var probe = window.__dshSmokeProbe
  var sleep = probe.sleep
  var r = probe.report

  probe.step(async function () {
    await probe.onlyFor(['switches', 'switches-off'], async function () {
      // The host surfaces the three sidebar and header features take over:
      // the brand row (search), the workspace section with its tree
      // (workspace view) and the conversation's view-tab strip.
      var switchSidebar = document.createElement('div')
      switchSidebar.setAttribute('data-slot', 'sidebar')
      switchSidebar.innerHTML = '<div class="_n_root_1"><div class="_n_logoRow_1" data-window-drag="true">' +
        '<button type="button" class="_n_brand_1 _n_wide_1" aria-label="New session">brand</button>' +
        '<button type="button" class="_n_iconButton_1 _n_toggle_1" aria-label="Collapse sidebar">toggle</button></div>' +
        // One hash prefix for the section, its header, its label and its list
        // area, the way the host's CSS modules name them (the skin finds the
        // workspace section by that shared prefix, never by the label text).
        '<div class="_w1_root"><div class="_w1_sectionHeader"><span class="_w1_sectionLabel _w1_wide">Workspaces</span></div>' +
        '<div role="tree" class="_w1_listArea"><div data-row-key="w1" class="_w1_projectRow">project</div></div></div></div>'
      document.body.appendChild(switchSidebar)
      var switchHeader = document.createElement('div')
      switchHeader.className = '_c_header_1'
      switchHeader.innerHTML = '<div class="_c_tabs_1" role="tablist" data-conversation-tabs="">' +
        '<button type="button" role="tab" aria-selected="true" class="_c_tab_1 _c_tabActive_1">Chat</button>' +
        '<button type="button" role="tab" aria-selected="false" class="_c_tab_1">Trajectory</button></div>'
      document.body.appendChild(switchHeader)
      var switchMarks = function () {
        return {
          // The permission control and the context statistics switch together.
          permissionsControl: document.querySelectorAll('.dsh-claude-perm-container').length +
            (document.body.hasAttribute('data-dsh-claude-permissions') ? 1 : 0) +
            (document.body.hasAttribute('data-dsh-claude-session-stats') ? 1 : 0),
          workspaceView: document.querySelectorAll('.dsh-claude-ws-segments').length,
          sidebarSearch: document.querySelectorAll('[data-dsh-claude-search-row], .dsh-claude-search-trigger').length,
          turnStatus: document.querySelectorAll('[data-dsh-claude-turn-status], [style*="--dsh-claude-turn-order"]').length,
          viewTabs: document.querySelectorAll('[data-dsh-view-tabs]').length,
        }
      }
      var settleSwitch = async function (patch) {
        window.__pushForm(patch)
        document.body.appendChild(document.createElement('i'))
        await sleep(300)
        return switchMarks()
      }
      var switchKeys = ['permissionsControl', 'workspaceView', 'sidebarSearch', 'turnStatus', 'viewTabs']
      // The sixth switched feature, the file change rows, takes seat keys over
      // rather than drawing marks on the page, so its switch is driven and
      // checked in its own case ('chat-files': offSeats/backSeats).
      var allSwitches = function (value) {
        var patch = {}
        for (var ki = 0; ki < switchKeys.length; ki++) patch[switchKeys[ki]] = value
        return patch
      }
      await sleep(300)
      r.switches = { start: switchMarks(), steps: [] }
      await probe.onlyFor(['switches'], async function () {
        for (var si = 0; si < switchKeys.length; si++) {
          var offPatch = {}
          offPatch[switchKeys[si]] = false
          var off = await settleSwitch(offPatch)
          var onPatch = {}
          onPatch[switchKeys[si]] = true
          var on = await settleSwitch(onPatch)
          r.switches.steps.push({ key: switchKeys[si], off: off, on: on })
        }
        r.switches.allOff = await settleSwitch(allSwitches(false))
      })
      r.switches.allOn = await settleSwitch(allSwitches(true))
    })
  })
})()
