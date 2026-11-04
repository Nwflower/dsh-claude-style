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
      switchSidebar.innerHTML = '<div class="_root_n_1"><div class="_logoRow_n_1" data-window-drag="true">' +
        '<button type="button" class="_brand_n_1 _wide_n_1" aria-label="New session">brand</button>' +
        '<button type="button" class="_iconButton_n_1 _toggle_n_1" aria-label="Collapse sidebar">toggle</button></div>' +
        // One hash suffix for the section, its header, its label and its list
        // area, the way the host's CSS modules name them.
        '<div class="_root_w1_1"><div class="_sectionHeader_w1_1"><span class="_sectionLabel_w1_1 _wide_w1_1">Workspaces</span></div>' +
        '<div role="tree" class="_listArea_w1_1"><div data-row-key="w1" class="_projectRow_w1_1">project</div></div></div></div>'
      document.body.appendChild(switchSidebar)
      var switchHeader = document.createElement('div')
      switchHeader.className = '_header_c_1'
      // The host's own header anchor: the strip's parts are read inside it (D3).
      switchHeader.setAttribute('data-slot', 'conversation.header')
      switchHeader.innerHTML = '<div class="_tabs_c_1" role="tablist" data-conversation-tabs="">' +
        '<button type="button" role="tab" aria-selected="true" class="_tab_c_1 _tabActive_c_1">Chat</button>' +
        '<button type="button" role="tab" aria-selected="false" class="_tab_c_1">Trajectory</button></div>'
      document.body.appendChild(switchHeader)
      var switchMarks = function () {
        return {
          // The permission control's own two marks. The context statistics took
          // the same switch over once; they answer to `statsPosition` now, and
          // their own case drives that choice.
          permissionsControl: document.querySelectorAll('.dsh-claude-perm-container').length +
            (document.body.hasAttribute('data-dsh-claude-permissions') ? 1 : 0),
          workspaceView: document.querySelectorAll('.dsh-claude-ws-segments').length,
          sidebarSearch: document.querySelectorAll('[data-dsh-claude-search-row], .dsh-claude-search-trigger').length,
          viewTabs: document.querySelectorAll('[data-dsh-view-tabs]').length,
          // The composer restyle's gate: the feature writes it on <body> and
          // takes it off again when its scope choice is off.
          composerScope: document.body.hasAttribute('data-dsh-claude-composer-active') ? 1 : 0,
        }
      }
      var settleSwitch = async function (patch) {
        window.__pushForm(patch)
        document.body.appendChild(document.createElement('i'))
        await sleep(300)
        return switchMarks()
      }
      var switchKeys = ['permissionsControl', 'workspaceView', 'sidebarSearch', 'viewTabs', 'composerScope']
      // The value each switch is off and on at: a boolean's false and true, and
      // a choice's own off beside the value the feature runs under.
      var switchValues = { composerScope: { off: 'off', on: 'all' } }
      var offValue = function (key) {
        var values = switchValues[key]
        return values === undefined ? false : values.off
      }
      var onValue = function (key) {
        var values = switchValues[key]
        return values === undefined ? true : values.on
      }
      // The sixth switched feature, the file change rows, takes seat keys over
      // rather than drawing marks on the page, so its switch is driven and
      // checked in its own case ('chat-files': offSeats/backSeats). The header
      // band needs the desktop caption row, which this page has not: its switch
      // is driven in its own case too ('header-band': off/back).
      var allSwitches = function (value) {
        var patch = {}
        for (var ki = 0; ki < switchKeys.length; ki++) patch[switchKeys[ki]] = value ? onValue(switchKeys[ki]) : offValue(switchKeys[ki])
        return patch
      }
      await sleep(300)
      r.switches = { start: switchMarks(), steps: [] }
      await probe.onlyFor(['switches'], async function () {
        for (var si = 0; si < switchKeys.length; si++) {
          var offPatch = {}
          offPatch[switchKeys[si]] = offValue(switchKeys[si])
          var off = await settleSwitch(offPatch)
          var onPatch = {}
          onPatch[switchKeys[si]] = onValue(switchKeys[si])
          var on = await settleSwitch(onPatch)
          r.switches.steps.push({ key: switchKeys[si], off: off, on: on })
        }
        // The segment control drives the host's own view store rather than a
        // list of the skin's: 已归档 asks for the archived-only filter and one
        // flat list, and 进行中 puts the filter back with the grouping that
        // stood before the visit. The store is the registration the stand-in
        // keeps under `sidebar.workspaces` (stand-in/slots.js), so the snapshot
        // read here is the host's answer, not the skin's mark.
        var readView = function (item) {
          var store = window.__dshSmokeHost.workspaceViewStore
          var snapshot = store === undefined ? null : store.getSnapshot()
          return {
            // A copy: the store's snapshot is its live state, which the next
            // click would otherwise rewrite under both readings.
            snapshot: snapshot === null ? null : { archivedFilter: snapshot.archivedFilter, groupBy: snapshot.groupBy },
            checked: item === null ? null : item.getAttribute('aria-checked'),
          }
        }
        var clickSegment = async function (view) {
          var item = document.querySelector('.dsh-claude-ws-segment[data-view="' + view + '"]')
          if (item !== null) item.click()
          document.body.appendChild(document.createElement('i'))
          await sleep(300)
          return readView(item)
        }
        r.switches.view = {
          archived: await clickSegment('archived'),
          active: await clickSegment('active'),
        }
        // 宿主自己的视图菜单也提供「单列表」（扁平）：读者在那里选的一档是他的分组，
        // 不是日期视图留下的痕迹，跟着走一遍已归档再回来也还是它。
        var hostStore = window.__dshSmokeHost.workspaceViewStore
        hostStore.actions.setGroupBy('flat')
        document.body.appendChild(document.createElement('i'))
        await sleep(300)
        r.switches.flat = {
          picked: readView(null),
          archived: await clickSegment('archived'),
          active: await clickSegment('active'),
        }
        hostStore.actions.setGroupBy('workspace')
        document.body.appendChild(document.createElement('i'))
        await sleep(200)
        r.switches.allOff = await settleSwitch(allSwitches(false))
      })
      r.switches.allOn = await settleSwitch(allSwitches(true))
      await probe.onlyFor(['switches'], async function () {
        // A browser left on 已归档 hands the next load a store already on
        // `only` + `flat`; the switch's teardown and install is the same pair a
        // reload runs, so the feature has to come back on that segment instead
        // of driving the store back to 进行中.
        var store = window.__dshSmokeHost.workspaceViewStore
        store.actions.setArchivedFilter('only')
        store.actions.setGroupBy('flat')
        await settleSwitch({ workspaceView: false })
        await settleSwitch({ workspaceView: true })
        var segment = document.querySelector('.dsh-claude-ws-segment[data-view="archived"]')
        var snapshot = store.getSnapshot()
        r.switches.reinstall = {
          snapshot: { archivedFilter: snapshot.archivedFilter, groupBy: snapshot.groupBy },
          checked: segment === null ? null : segment.getAttribute('aria-checked'),
        }
        // Hand the rail scenario a 进行中 section again.
        var active = document.querySelector('.dsh-claude-ws-segment[data-view="active"]')
        if (active !== null) active.click()
        await sleep(300)
      })
      // The collapsed rail: the host renders the section's heading only while
      // the sidebar is wide, so the feature's control has to leave with the
      // heading and come back with it. The list below is the host's own tree,
      // so its rows stay where the host drew them.
      var railMarks = function () {
        return {
          segments: document.querySelectorAll('.dsh-claude-ws-segments').length,
          rows: document.querySelectorAll('[data-row-key]').length,
        }
      }
      var sectionHeader = switchSidebar.querySelector('._sectionHeader_w1_1')
      var sectionLabel = switchSidebar.querySelector('._sectionLabel_w1_1')
      var wide = railMarks()
      sectionHeader.removeChild(sectionLabel)
      document.body.appendChild(document.createElement('i'))
      await sleep(300)
      var collapsed = railMarks()
      sectionHeader.insertBefore(sectionLabel, sectionHeader.firstChild)
      document.body.appendChild(document.createElement('i'))
      await sleep(300)
      r.switches.rail = { wide: wide, collapsed: collapsed, back: railMarks() }
    })
  })
})()
