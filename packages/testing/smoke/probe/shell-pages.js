/**
 * The shell cases' page reads: the Claude palette, the classic hero's welcome,
 * the conversation view tabs' pill, the composer's marked host controls and the
 * sidebar's search row. The strip the view-tabs case builds and the root the
 * search case mounts are handed to the probe for the teardown step.
 */
(function () {
  var probe = window.__dshSmokeProbe
  var sleep = probe.sleep
  var pillState = probe.pillState
  var r = probe.report

  probe.step(async function () {
    await probe.onlyFor(['brand'], async function () {
      // The Claude palette, light and dark: the ivory and warm-black canvases,
      // the clay accent, the raised card fill.
      var claudeLight = getComputedStyle(document.body)
      r.claudePalette = {
        canvas: claudeLight.backgroundColor,
        accent: claudeLight.getPropertyValue('--dsw-alias-brand-primary').trim(),
      }
      document.body.setAttribute('data-ds-dark-theme', '')
      var claudeDark = getComputedStyle(document.body)
      r.claudePalette.dark = {
        canvas: claudeDark.backgroundColor,
        accent: claudeDark.getPropertyValue('--dsw-alias-brand-primary').trim(),
        card: claudeDark.getPropertyValue('--dsh-claude-card').trim(),
      }
      document.body.removeAttribute('data-ds-dark-theme')
      // The DeepSeek card's light shell derives from its pale blue-white canvas;
      // its dark card keeps the blue-black steps it already had.
      window.__pushForm({ paletteColors: 'deepseek' })
      await sleep(250)
      var dsLight = getComputedStyle(document.body)
      r.deepseekPalette = {
        canvas: dsLight.backgroundColor,
        accent: dsLight.getPropertyValue('--dsw-alias-brand-primary').trim(),
      }
      document.body.setAttribute('data-ds-dark-theme', '')
      var dsDark = getComputedStyle(document.body)
      r.deepseekPalette.dark = {
        canvas: dsDark.backgroundColor,
        accent: dsDark.getPropertyValue('--dsw-alias-brand-primary').trim(),
      }
      document.body.removeAttribute('data-ds-dark-theme')
      window.__pushForm({ paletteColors: 'brand' })
      await sleep(150)
    })
    await probe.onlyFor(['hero'], async function () {
      // The classic hero's welcome is drawn on arrival and holds between
      // passes: the draw pinned to either end of its pool gives two different
      // lines, and a further pass leaves the drawn one alone.
      // The classic hero's welcome sits in the host's conversation anchor, the
      // subtree the skin reads its hero parts inside (D3).
      var greetHolder = document.createElement('div')
      greetHolder.setAttribute('data-conversation-scroll', '')
      var greetRoot = document.createElement('div')
      greetRoot.className = '_root_x_1'
      greetRoot.setAttribute('data-phase', 'hero')
      var greetGroup = document.createElement('div')
      greetGroup.className = '_titleGroup_x_1'
      var greetSpan = document.createElement('span')
      greetSpan.textContent = 'Host greeting'
      greetGroup.appendChild(greetSpan)
      greetRoot.appendChild(greetGroup)
      greetHolder.appendChild(greetRoot)
      var greetRandom = Math.random
      var arrive = async function (draw) {
        Math.random = function () { return draw }
        document.body.appendChild(greetHolder)
        await sleep(150)
        Math.random = greetRandom
        return greetSpan.textContent
      }
      r.greeting = { low: await arrive(0) }
      // The classic hero's permission control is the segment group; the studio
      // hero's is the conversation's trigger
      // (packages/client/src/features/permissions/permissions.ts).
      var heroModes = document.querySelector('[data-composer-card] [data-dsh-claude-part~="modes"]')
      r.classicSegments = heroModes === null ? null
        : Array.prototype.map.call(heroModes.querySelectorAll('.dsh-claude-segments > .dsh-claude-segment'), function (item) { return item.textContent })
      r.classicPermTrigger = heroModes !== null && heroModes.querySelector('.dsh-claude-perm-btn') !== null
      // The crab stands on the classic home page's card too, as Deepy does.
      r.classicCrab = document.querySelector('[data-composer-card] > .dsh-claude-crab') !== null
      // The glyph field stands in the hero root, under its content, and takes no
      // press; its switch, off as the page opens, mounts it and takes it back off.
      r.ripple = { off: greetRoot.querySelector('.dsh-claude-ripple-canvas') === null && !greetRoot.hasAttribute('data-dsh-claude-ripple') }
      window.__pushForm({ homeRipple: true })
      await sleep(150)
      var rippleCanvas = greetRoot.querySelector(':scope > .dsh-claude-ripple-canvas')
      r.ripple.stamped = greetRoot.hasAttribute('data-dsh-claude-ripple')
      r.ripple.canvas = rippleCanvas !== null
      r.ripple.pointerEvents = rippleCanvas === null ? null : getComputedStyle(rippleCanvas).pointerEvents
      r.ripple.order = rippleCanvas === null ? null : getComputedStyle(rippleCanvas).zIndex
      window.__pushForm({ homeRipple: false })
      await sleep(150)
      r.ripple.gone = !greetRoot.hasAttribute('data-dsh-claude-ripple') && greetRoot.querySelector('.dsh-claude-ripple-canvas') === null
      window.__pushForm({ homeRipple: true })
      await sleep(150)
      r.ripple.back = greetRoot.hasAttribute('data-dsh-claude-ripple') && greetRoot.querySelector(':scope > .dsh-claude-ripple-canvas') !== null
      document.body.appendChild(document.createElement('i'))
      await sleep(150)
      r.greeting.held = greetSpan.textContent
      greetHolder.remove()
      await sleep(150)
      r.greeting.high = await arrive(0.999)
      greetHolder.remove()
      await sleep(150)
    })
    await probe.onlyFor(['view-tabs'], async function () {
      // The conversation view tabs (ConversationSession's strip): the pill is
      // drawn under the active tab without sliding in, then slides to the tab a
      // switch selects. The strip stays until the teardown, which must take the
      // pill back off it.
      var viewHeader = document.createElement('div')
      viewHeader.className = '_header_c_1'
      // The host's own header anchor: the skin reads the tab strip's parts
      // inside it (D3).
      viewHeader.setAttribute('data-slot', 'conversation.header')
      viewHeader.innerHTML = '<div class="_tabs_c_1" role="tablist" data-conversation-tabs="">' +
        '<button type="button" role="tab" aria-selected="true" class="_tab_c_1 _tabActive_c_1">Chat</button>' +
        '<button type="button" role="tab" aria-selected="false" class="_tab_c_1">Trajectory</button>' +
        '<button type="button" role="tab" aria-selected="false" class="_tab_c_1">Context</button></div>'
      document.body.appendChild(viewHeader)
      await sleep(150)
      probe.viewStrip = viewHeader.firstChild
      var viewTabs = probe.viewStrip.children
      r.viewPill = { stamped: probe.viewStrip.hasAttribute('data-dsh-view-tabs'), first: pillState(probe.viewStrip, viewTabs[0]) }
      viewTabs[0].setAttribute('aria-selected', 'false')
      viewTabs[0].className = '_tab_c_1'
      viewTabs[2].setAttribute('aria-selected', 'true')
      viewTabs[2].className = '_tab_c_1 _tabActive_c_1'
      await sleep(60)
      r.viewPill.switched = pillState(probe.viewStrip, viewTabs[2])
      // The slide plays whatever the system's motion setting: no reduced-motion
      // block in the shipped stylesheets may reach the pill.
      r.viewPill.reducedMotionRules = 0
      for (var sheetIndex = 0; sheetIndex < document.styleSheets.length; sheetIndex++) {
        var sheetRules = document.styleSheets[sheetIndex].cssRules
        for (var ruleIndex = 0; ruleIndex < sheetRules.length; ruleIndex++) {
          var mediaRule = sheetRules[ruleIndex]
          if (mediaRule instanceof CSSMediaRule && /prefers-reduced-motion/.test(mediaRule.conditionText) &&
            mediaRule.cssText.indexOf('data-dsh-claude-pill') !== -1) r.viewPill.reducedMotionRules++
        }
      }
    })
    await probe.onlyFor(['view-tabs-row'], async function () {
      // The row shape 0.2.1-rc.3 draws: the host's row holds the tablist and the
      // overflow button, and counts the tabs it keeps from the row's own width.
      // The row must span the header for that count while the plate inside it
      // hugs the tabs, and the pill travels inside the plate.
      var rowHeader = document.createElement('div')
      // The host's text tabs use negative margins, and its overflow seat is flex.
      var rowHostStyle = document.createElement('style')
      rowHostStyle.textContent = '._tab_v_1 { margin: -10px -10px 0; }' +
        '._viewsMoreAnchor_v_1 { display: flex; }'
      document.head.appendChild(rowHostStyle)
      rowHeader.className = '_header_v_1'
      rowHeader.setAttribute('data-slot', 'conversation.header')
      rowHeader.innerHTML = '<div class="_tabs_v_1">' +
        '<div class="_viewTabs_v_1" role="tablist" data-conversation-tabs="">' +
        '<button type="button" role="tab" aria-selected="true" class="_tab_v_1 _tabActive_v_1">Chat</button>' +
        '<button type="button" role="tab" aria-selected="false" class="_tab_v_1">Trajectory</button>' +
        '<button type="button" role="tab" aria-selected="false" class="_tab_v_1">Context</button>' +
        '<button type="button" role="tab" aria-selected="false" class="_tab_v_1">Team</button></div>' +
        '<span class="_viewsMoreAnchor_v_1"><button type="button" class="_viewsMore_v_1" aria-haspopup="menu" aria-expanded="false">more</button></span>' +
        '</div>'
      document.body.appendChild(rowHeader)
      await sleep(150)
      // Read by the host's own structure: the row is the header's first box, the
      // tablist its marked tablist, and the overflow button the tablist's
      // neighbour (the skin's marks are what the assertions below see in styles).
      var row = rowHeader.firstElementChild
      var list = row.querySelector('[role="tablist"]')
      var more = list.nextElementSibling.querySelector('button')
      var rowTabs = list.children
      var rowBox = row.getBoundingClientRect()
      var listBox = list.getBoundingClientRect()
      var moreBox = more.getBoundingClientRect()
      var rowStyle = getComputedStyle(row)
      var listStyle = getComputedStyle(list)
      var moreStyle = getComputedStyle(more)
      var tabBoxes = Array.prototype.map.call(rowTabs, function (tab) {
        var box = tab.getBoundingClientRect()
        return { left: box.left, right: box.right }
      })
      r.viewRow = {
        justifyContent: rowStyle.justifyContent,
        pointerEvents: rowStyle.pointerEvents,
        // The lift rides the content, not the row: a translated row would put
        // its full-width box over the header's actions (#174).
        transform: { row: rowStyle.transform, list: listStyle.transform },
        width: Math.round(rowBox.width),
        headerWidth: rowHeader.clientWidth,
        counted: row.clientWidth,
        groupCentre: Math.round((listBox.left + moreBox.right) / 2 - rowBox.left),
        plate: {
          width: Math.round(listBox.width),
          centre: Math.round(listBox.top + listBox.height / 2 - rowBox.top),
          background: listStyle.backgroundColor,
          radius: listStyle.borderTopLeftRadius,
          padding: listStyle.paddingLeft,
          gap: listStyle.gap,
        },
        chip: {
          width: Math.round(moreBox.width),
          height: Math.round(moreBox.height),
          centre: Math.round(moreBox.top + moreBox.height / 2 - rowBox.top),
          marginTop: moreStyle.marginTop,
        },
        tabHeight: getComputedStyle(rowTabs[0]).height,
        tabBoxes: tabBoxes,
        underline: getComputedStyle(rowTabs[0], '::after').display,
        pill: pillState(list, rowTabs[0]),
      }
      rowTabs[0].setAttribute('aria-selected', 'false')
      rowTabs[0].className = '_tab_v_1'
      rowTabs[2].setAttribute('aria-selected', 'true')
      rowTabs[2].className = '_tab_v_1 _tabActive_v_1'
      await sleep(60)
      r.viewRow.pillSwitched = pillState(list, rowTabs[2])
      probe.viewRow = { row: row, list: list }
    })
    await probe.onlyFor(['composer'], async function () {
      // The composer's host controls are marked by what they are, read from
      // the host's structure; the submit button turning into stop (its glyph
      // becomes a rect) moves its mark with it.
      var controlOf = function (id) { var el = document.getElementById(id); return el && el.getAttribute('data-dsh-claude-control') }
      // The host's own access button, skipping the skin's controls by their own
      // class namespace, read as whole class tokens.
      var accessButton = document.querySelector('[data-slot="conversation.input.permission"] button:not([class^="dsh-claude-"], [class*=" dsh-claude-"])')
      r.controls = { commands: controlOf('commands'), send: controlOf('send'), access: accessButton && accessButton.getAttribute('data-dsh-claude-control') }
      var sendButton = document.getElementById('send')
      var sendSvg = sendButton.querySelector('svg')
      var sendGlyph = sendSvg.innerHTML
      sendSvg.innerHTML = '<rect x="3" y="3" width="10" height="10"></rect>'
      await sleep(60)
      r.controls.stopping = controlOf('send')
      // The stop glyph is the skin's own: the host's square is a scaled SVG glyph
      // whose rasterization lands on a subpixel phase of its own, so the ring and
      // the square are drawn as two boxes the browser snaps alike.
      var ring = getComputedStyle(sendButton, '::before')
      var square = getComputedStyle(sendButton, '::after')
      r.stopGlyph = {
        hostGlyph: getComputedStyle(sendSvg).display,
        ring: ring.width,
        squareWidth: square.width,
        squareHeight: square.height,
        fill: square.backgroundColor,
        ink: getComputedStyle(sendButton).color,
      }
      sendSvg.innerHTML = sendGlyph
      await sleep(60)
      r.controls.back = controlOf('send')
    })
    await probe.onlyFor(['search'], async function () {
      // The standalone style registers a host panel-list entry and its main
      // target; `icon` hands the entry back and leaves the host's workspace
      // search in place. Pressing that workspace control opens the host Modal
      // through a root of the skin's own in either style.
      var sidebarSlot = document.createElement('div')
      sidebarSlot.setAttribute('data-slot', 'sidebar')
      sidebarSlot.innerHTML = '<div class="_root_n_1"><div class="_logoRow_n_1" data-window-drag="true">' +
        '<button type="button" class="_brand_n_1 _wide_n_1" aria-label="New session">brand</button>' +
        '<button type="button" class="_iconButton_n_1 _toggle_n_1" aria-label="Collapse sidebar">toggle</button></div>' +
        // The row under the brand row, with the host's own shortcut markup: one
        // `kbd` per key and a `+` between them.
        '<button type="button" class="_newSession_n_1" aria-keyshortcuts="Control+N">' +
        '<span class="_newSessionLabelMask_n_1"><span class="_newSessionContent_n_1">' +
        '<span class="_newSessionLabel_n_1 _wide_n_1">New session</span></span></span>' +
        '<span class="_newSessionShortcut_n_1"><span class="_keys_n_1">' +
        '<kbd class="_key_n_1">Ctrl</kbd><kbd class="_separator_n_1">+</kbd><kbd class="_key_n_1">K</kbd>' +
        '</span></span></button>' +
        '<div class="_sectionHeader_n_1"><span class="_sectionLabel_n_1">Workspaces</span>' +
        '<div class="_searchSlot_n_1"><button type="button" class="_searchButton_n_1" aria-label="Search sessions">search</button>' +
        '<input class="_searchInput_n_1" type="text" tabindex="-1"></div></div></div>'
      document.body.appendChild(sidebarSlot)
      await sleep(150)
      // The search feature arrives in its own chunk; its registrations are read
      // once they land rather than on the first frame after the page boots.
      for (var waited = 0; waited < 3000 && !(window.__slots || []).some(function (entry) {
        return entry.id === 'dsh-claude-style.search'
      }); waited += 50) await sleep(50)
      var logoRow = sidebarSlot.querySelector('[data-dsh-claude-part~="logo-row"]')
      var hostSearchButton = sidebarSlot.querySelector('[data-dsh-claude-part~="search-button"]')
      var rootsBefore = window.__roots.length
      if (hostSearchButton) hostSearchButton.click()
      await sleep(60)
      probe.searchRoot = window.__roots[rootsBefore]
      // One style at a time, through the form; the host registrations are read
      // back after each change.
      var styleOf = async function (style) {
        window.__pushForm({ searchStyle: style })
        sidebarSlot.appendChild(document.createElement('i'))
        await sleep(200)
        var entries = (window.__slots || []).filter(function (entry) {
          return entry.id === 'dsh-claude-style.search' || entry.seat === 'dsh-claude-style.search'
        })
        var panel = entries.filter(function (entry) { return entry.key === 'sidebar.panellist' })[0]
        var slot = sidebarSlot.querySelector('[data-dsh-claude-part~="search-slot"]')
        return {
          panelRegistered: !!panel,
          panelOrder: panel ? panel.order : null,
          panelLabel: panel ? panel.label : null,
          iconComponent: panel ? panel.component : null,
          rowMarked: logoRow.hasAttribute('data-dsh-claude-search-row'),
          hostSlotPosition: getComputedStyle(slot).position,
          hostSlotWidth: Math.round(slot.getBoundingClientRect().width),
        }
      }
      r.search = {
        registered: (window.__slots || []).some(function (entry) { return entry.key === 'sidebar.panellist' && entry.id === 'dsh-claude-style.search' }),
        rowMarked: logoRow.hasAttribute('data-dsh-claude-search-row'),
        modalRendered: !!probe.searchRoot && probe.searchRoot.renders > 0,
      }
      r.search.standalone = await styleOf('standalone')
      r.search.icon = await styleOf('icon')
      // The host's own button is live again in the icon style; a listener on an
      // ancestor stands in for the host's own click handling, which the skin's
      // takeover must keep from running.
      var hostButton = sidebarSlot.querySelector('[data-dsh-claude-part~="search-button"]')
      var reachedHost = 0
      var countHost = function () { reachedHost++ }
      sidebarSlot.addEventListener('click', countHost)
      if (hostButton) hostButton.click()
      await sleep(60)
      sidebarSlot.removeEventListener('click', countHost)
      r.search.icon.hostClicksReachingHost = reachedHost
      r.search.back = await styleOf('standalone')
      // The New session row's shortcut hint and the search entry's own caps are
      // the same host markup. The button's caps are built from the host's shortcut
      // catalog, which this stand-in does not carry, so the comparison reads a
      // sample of the search sheet's own cap class instead, and takes both
      // field by field — the two looks cannot then drift apart.
      var capStyle = function (element) {
        var style = getComputedStyle(element)
        return {
          display: style.display, alignItems: style.alignItems, justifyContent: style.justifyContent,
          minWidth: style.minWidth, height: style.height, padding: style.padding, boxSizing: style.boxSizing,
          border: style.border, radius: style.borderRadius, background: style.backgroundColor,
          color: style.color, font: style.font, fontWeight: style.fontWeight, lineHeight: style.lineHeight,
        }
      }
      var sample = document.createElement('kbd')
      sample.className = 'dsh-claude-search-key'
      sample.textContent = 'Ctrl'
      sidebarSlot.appendChild(sample)
      var shortcutCaps = [].slice.call(sidebarSlot.querySelectorAll('[data-dsh-claude-part~="new-session-shortcut"] kbd'))
      r.search.keycaps = {
        shortcut: shortcutCaps.filter(function (cap) { return !/separator/.test(cap.className) }).map(capStyle),
        separators: shortcutCaps.filter(function (cap) { return /separator/.test(cap.className) }).map(function (cap) { return getComputedStyle(cap).display }),
        search: [capStyle(sample)],
      }
      sample.remove()
    })
  })
})()
