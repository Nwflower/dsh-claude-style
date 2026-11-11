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
      await probe.nextPass('the DeepSeek palette to be applied')
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
      await probe.nextPass('the brand palette to be applied')
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
        var written = greetSpan.textContent
        document.body.appendChild(greetHolder)
        // The welcome is written by the pass after the root arrives, and the
        // span still carries the host's line until that pass; waiting for the
        // line itself leaves the draw's random in place for it (D92).
        var lines
        try {
          lines = await probe.until(function () { return greetSpan.textContent },
            function (read) { return read[read.length - 1] !== written }, 'the classic hero welcome to be drawn')
        } finally {
          Math.random = greetRandom
        }
        return lines[lines.length - 1]
      }
      r.greeting = { low: await arrive(0) }
      // The classic hero's permission control is the segment group; the studio
      // hero's is the conversation's trigger
      // (packages/client/src/features/permissions/permissions.ts). The strip is
      // stamped one pass and the group drawn on the pass after it, so the
      // group's own composer-segments marker is the state this read waits for.
      var strips = await probe.until(function () {
        var strip = document.querySelector('[data-composer-card] [data-dsh-claude-part~="modes"]')
        return strip !== null && strip.querySelector('[data-composer-segments]') !== null ? strip : null
      }, function (read) { return read[read.length - 1] !== null }, 'the classic hero permission segments')
      var heroModes = strips[strips.length - 1]
      r.classicSegments = Array.prototype.map.call(heroModes.querySelectorAll('.dsh-claude-segments > .dsh-claude-segment'), function (item) { return item.textContent })
      r.classicPermTrigger = heroModes.querySelector(probe.surface('permissions.trigger')) !== null
      // The crab stands on the classic home page's card too, as Deepy does; the
      // mascot is a deferred feature, so its chunk and the pass after it decide
      // when the crab is there.
      var crabSelector = '[data-composer-card] > ' + probe.surface('mascot.crab')
      var crabs = await probe.until(function () { return document.querySelector(crabSelector) },
        function (read) { return read[read.length - 1] !== null }, 'the classic hero crab')
      r.classicCrab = crabs[crabs.length - 1] !== null
      // The glyph field stands in the hero root, under its content, and takes no
      // press; its switch, off as the page opens, mounts it and takes it back off.
      r.ripple = { off: greetRoot.querySelector('.dsh-claude-ripple-canvas') === null && !greetRoot.hasAttribute('data-dsh-claude-ripple') }
      window.__pushForm({ homeRipple: true })
      var mounted = await probe.until(function () { return greetRoot.querySelector(':scope > .dsh-claude-ripple-canvas') },
        function (read) { return read[read.length - 1] !== null }, 'the glyph field to mount on the hero root')
      var rippleCanvas = mounted[mounted.length - 1]
      r.ripple.stamped = greetRoot.hasAttribute('data-dsh-claude-ripple')
      r.ripple.canvas = true
      r.ripple.pointerEvents = getComputedStyle(rippleCanvas).pointerEvents
      r.ripple.order = getComputedStyle(rippleCanvas).zIndex
      window.__pushForm({ homeRipple: false })
      await probe.until(function () { return greetRoot.querySelector('.dsh-claude-ripple-canvas') },
        function (read) { return read[read.length - 1] === null }, 'the glyph field to leave the hero root')
      r.ripple.gone = !greetRoot.hasAttribute('data-dsh-claude-ripple') && greetRoot.querySelector('.dsh-claude-ripple-canvas') === null
      window.__pushForm({ homeRipple: true })
      await probe.until(function () { return greetRoot.querySelector(':scope > .dsh-claude-ripple-canvas') },
        function (read) { return read[read.length - 1] !== null }, 'the glyph field to mount on the hero root again')
      r.ripple.back = greetRoot.hasAttribute('data-dsh-claude-ripple') && greetRoot.querySelector(':scope > .dsh-claude-ripple-canvas') !== null
      // A further pass leaves the drawn welcome alone; the pass count is the
      // page's own record of one having run.
      document.body.appendChild(document.createElement('i'))
      await probe.nextPass('the classic hero to hold its welcome between passes')
      r.greeting.held = greetSpan.textContent
      greetHolder.remove()
      await probe.nextPass('the classic hero to leave the page')
      r.greeting.high = await arrive(0.999)
      greetHolder.remove()
      await probe.nextPass('the classic hero to leave the page again')
    })
    await probe.onlyFor(['view-tabs'], async function () {
      // The conversation view tabs (ConversationSession's strip), in the row the
      // host draws when it has no views beyond the pinned ones, so the row holds
      // the tablist alone: the pill is drawn under the active tab without sliding
      // in, then slides to the tab a switch selects. The strip stays until the
      // teardown, which must take the pill and the row's stamp back off.
      var viewHeader = document.createElement('div')
      viewHeader.className = '_header_c_1'
      // The host's own header anchor: the skin reads the tab strip's parts
      // inside it (D3).
      viewHeader.setAttribute('data-slot', 'conversation.header')
      viewHeader.innerHTML = '<div class="_tabs_c_1">' +
        '<div class="_viewTabs_c_1" role="tablist" data-conversation-tabs="">' +
        '<button type="button" role="tab" aria-selected="true" class="_tab_c_1 _tabActive_c_1">Chat</button>' +
        '<button type="button" role="tab" aria-selected="false" class="_tab_c_1">Trajectory</button>' +
        '<button type="button" role="tab" aria-selected="false" class="_tab_c_1">Context</button></div></div>'
      document.body.appendChild(viewHeader)
      var viewRow = viewHeader.firstElementChild
      probe.viewStrip = { row: viewRow, list: viewRow.firstElementChild }
      var viewTabs = probe.viewStrip.list.children
      // The pill is placed by the pass after the strip arrives; its mark is
      // the state the first reading waits for (D92).
      var placed = await probe.until(function () { return pillState(probe.viewStrip.list, viewTabs[0]) },
        function (read) { return read[read.length - 1].attr === true }, 'the view-tabs pill to be placed')
      r.viewPill = { stamped: viewRow.hasAttribute(probe.surface('view-tabs.strip')), first: placed[placed.length - 1] }
      r.viewPill.switched = await probe.pillSlide(probe.viewStrip.list, viewTabs[2], function () {
        viewTabs[0].setAttribute('aria-selected', 'false')
        viewTabs[0].className = '_tab_c_1'
        viewTabs[2].setAttribute('aria-selected', 'true')
        viewTabs[2].className = '_tab_c_1 _tabActive_c_1'
      }, 'the view-tabs pill to take the newly active tab')
      // The desktop attribute alone is not a Windows overlay: Linux shells carry
      // it too. The OS boundary is stubbed, while occlusion is a real DOM cover.
      var root = document.documentElement
      var oldOverlay = Object.getOwnPropertyDescriptor(navigator, 'windowControlsOverlay')
      var oldMark = root.hasAttribute('data-windows-titlebar')
      var overlay = null
      var cover = null
      try {
        root.setAttribute('data-windows-titlebar', '')
        Object.defineProperty(navigator, 'windowControlsOverlay', { configurable: true, value: undefined })
        document.body.appendChild(document.createElement('i'))
        await probe.nextPass('the desktop mark without an overlay to stay in the header')
        r.viewPill.nonOverlay = !viewHeader.hasAttribute('data-dsh-titlebar-tabs') && getComputedStyle(viewRow).position !== 'fixed'
        overlay = new EventTarget()
        overlay.visible = true
        overlay.getTitlebarAreaRect = function () { return new DOMRect(0, 0, window.innerWidth, 40) }
        Object.defineProperty(navigator, 'windowControlsOverlay', { configurable: true, value: overlay })
        document.body.appendChild(document.createElement('i'))
        overlay.dispatchEvent(new Event('geometrychange'))
        await probe.nextPass('the visible Windows overlay to take the caption band')
        await probe.frame()
        await probe.frame()
        r.viewPill.overlay = viewHeader.hasAttribute('data-dsh-titlebar-tabs') && getComputedStyle(viewRow).position === 'fixed'
        cover = document.createElement('div')
        cover.style.cssText = 'position:fixed;inset:0;z-index:2147483647;pointer-events:auto'
        document.body.appendChild(cover)
        overlay.dispatchEvent(new Event('geometrychange'))
        await probe.until(function () { return viewHeader.hasAttribute('data-dsh-titlebar-tabs') },
          function (read) { return read[read.length - 1] === false }, 'the covered caption band to fall back')
        await probe.frame()
        await probe.frame()
        r.viewPill.covered = !viewHeader.hasAttribute('data-dsh-titlebar-tabs') && getComputedStyle(viewRow).position !== 'fixed'
      } finally {
        if (cover !== null) cover.remove()
        if (oldOverlay === undefined) delete navigator.windowControlsOverlay
        else Object.defineProperty(navigator, 'windowControlsOverlay', oldOverlay)
        if (!oldMark) root.removeAttribute('data-windows-titlebar')
        document.body.appendChild(document.createElement('i'))
        await probe.nextPass('the desktop boundary to be restored')
      }
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
      // The row with the overflow button: the host's row holds the tablist and the
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
      // Read by the host's own structure: the row is the header's first box, the
      // tablist its marked tablist, and the overflow button the tablist's
      // neighbour (the skin's marks are what the assertions below see in styles).
      var row = rowHeader.firstElementChild
      var list = row.querySelector('[role="tablist"]')
      var more = list.nextElementSibling.querySelector('button')
      var rowTabs = list.children
      // The plate's class and the pill's placement are written by the pass
      // after the row arrives; the pill's mark is the state this read waits for.
      var placed = await probe.until(function () { return pillState(list, rowTabs[0]) },
        function (read) { return read[read.length - 1].attr === true }, 'the view-tabs row pill to be placed')
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
        pill: placed[placed.length - 1],
      }
      r.viewRow.pillSwitched = await probe.pillSlide(list, rowTabs[2], function () {
        rowTabs[0].setAttribute('aria-selected', 'false')
        rowTabs[0].className = '_tab_v_1'
        rowTabs[2].setAttribute('aria-selected', 'true')
        rowTabs[2].className = '_tab_v_1 _tabActive_v_1'
      }, 'the view-tabs row pill to take the newly active tab')
      probe.viewRow = { row: row, list: list }
    })
    await probe.onlyFor(['composer'], async function () {
      // The composer's host controls are marked by what they are, read from
      // the host's structure; the submit button turning into stop (its glyph
      // becomes a rect) moves its mark with it.
      var controlMark = probe.surface('composer.control')
      var controlOf = function (id) { var el = document.getElementById(id); return el && el.getAttribute(controlMark) }
      // The host's own access button, skipping the skin's controls by their own
      // class namespace, read as whole class tokens.
      var accessButton = document.querySelector('[data-slot="conversation.input.permission"] button:not([class^="dsh-claude-"], [class*=" dsh-claude-"])')
      r.controls = { commands: controlOf('commands'), send: controlOf('send'), access: accessButton && accessButton.getAttribute(controlMark) }
      var sendButton = document.getElementById('send')
      var sendSvg = sendButton.querySelector('svg')
      var sendGlyph = sendSvg.innerHTML
      // The mark follows the glyph on the pass after the swap; waiting for the
      // mark itself keeps a slow display from reading the old one (D92).
      sendSvg.innerHTML = '<rect x="3" y="3" width="10" height="10"></rect>'
      var stopping = await probe.until(function () { return controlOf('send') },
        function (read) { return read[read.length - 1] === 'stop' }, 'the submit button to be marked as the stop control')
      r.controls.stopping = stopping[stopping.length - 1]
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
      var sending = await probe.until(function () { return controlOf('send') },
        function (read) { return read[read.length - 1] === 'send' }, 'the submit button to be marked as the send control again')
      r.controls.back = sending[sending.length - 1]
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
      // The shell stamps the sidebar's parts on the pass after the subtree
      // arrives; the two this case reads are the state it waits for.
      var parts = await probe.until(function () {
        return {
          logo: sidebarSlot.querySelector('[data-dsh-claude-part~="logo-row"]'),
          search: sidebarSlot.querySelector('[data-dsh-claude-part~="search-button"]'),
        }
      }, function (read) {
        var last = read[read.length - 1]
        return last.logo !== null && last.search !== null
      }, 'the sidebar search parts to be stamped')
      var logoRow = parts[parts.length - 1].logo
      var hostSearchButton = parts[parts.length - 1].search
      // The search feature arrives in its own chunk; its registrations are read
      // once they land rather than on the first frame after the page boots.
      for (var waited = 0; waited < 3000 && !(window.__slots || []).some(function (entry) {
        return entry.id === 'dsh-claude-style.search'
      }); waited += 50) await sleep(50)
      // The takeover follows the host's button on a pass: the registration
      // above can land in the pass that stamps that part only afterwards. Ask
      // for the pass that follows the stamp through a child mutation, which is
      // the page's own pass source, so the listener is attached in a pass this
      // wait owns rather than a later one nothing promises.
      sidebarSlot.appendChild(document.createElement('i'))
      await probe.nextPass('the search takeover to follow the host control')
      var rootsBefore = window.__roots.length
      if (hostSearchButton) hostSearchButton.click()
      // The host modal is rendered through the skin's own root: the root's
      // first render is the state this read waits for.
      var roots = await probe.until(function () { return window.__roots[rootsBefore] || null },
        function (read) {
          var root = read[read.length - 1]
          return root !== null && root.renders > 0
        }, 'the search modal root to render')
      probe.searchRoot = roots[roots.length - 1]
      // One style at a time, through the form; the host registrations are read
      // back after each change.
      var styleOf = async function (style) {
        window.__pushForm({ searchStyle: style })
        sidebarSlot.appendChild(document.createElement('i'))
        await probe.nextPass('the search style to pass over the sidebar')
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
      // A click's listeners run inside the dispatch, so the host's count is
      // final when it returns; no pass is due for it.
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
