/** Runs in the page after the bundle: applies the skin and reports. */
(function () {
  window.__applyError = null
  try { window.__skin.apply(window.__ctx) } catch (e) { window.__applyError = String((e && e.stack) || e) }
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms) }) }
  function attrs(el) { return el ? Array.prototype.map.call(el.attributes, function (a) { return a.name }) : null }
  // A segmented control's sliding pill (src/shared/sliding-pill.js) against
  // the item it should sit under: its mark, its written placement, the item's
  // own fill (which gives way to the pill) and the transitions running on it.
  function pillState(control, item) {
    var box = control.getBoundingClientRect()
    var itemBox = item.getBoundingClientRect()
    var slides = control.getAnimations({ subtree: true }).filter(function (a) {
      return a.effect && a.effect.pseudoElement === '::before'
    })
    return {
      attr: control.hasAttribute('data-dsh-claude-pill'),
      content: getComputedStyle(control, '::before').content,
      x: parseFloat(control.style.getPropertyValue('--dsh-claude-pill-x')),
      w: parseFloat(control.style.getPropertyValue('--dsh-claude-pill-w')),
      itemX: itemBox.left - box.left - control.clientLeft,
      itemW: itemBox.width,
      itemFill: getComputedStyle(item).backgroundColor,
      slides: slides.map(function (a) { return a.transitionProperty }),
    }
  }
  window.__smoke = (async function () {
    var r = { applyError: window.__applyError, teardownRegistered: typeof window.__dispose === 'function' }
    // The account menu is counted by content (its Sign out row): a role=menu
    // portal exists only while its menu is open — ours included — so the row
    // the host itself renders is the stable test.
    function accountMenuOpen() {
      var menus = document.querySelectorAll('body > [role="menu"]')
      for (var mi = 0; mi < menus.length; mi++) {
        var items = menus[mi].querySelectorAll('[role="menuitem"]')
        for (var ii = 0; ii < items.length; ii++) {
          if ((items[ii].textContent || '').trim() === 'Sign out') return true
        }
      }
      return false
    }
    if (window.SMOKE_CASE === 'late-forms') {
      // The directory has not answered yet: the skin holds the defaults.
      r.lateBefore = document.body.getAttribute('data-dsh-claude-home-layout')
      window.__serveNamespace()
      // A pass is driven by a mutation, the way the live page drives one.
      document.body.appendChild(document.createElement('i'))
      await sleep(200)
      r.lateAfter = document.body.getAttribute('data-dsh-claude-home-layout')
    }
    if (window.SMOKE_CASE === 'popovers') {
      // The shared popover rule (shared/popover.js): the dwell keeps a pointer that
      // merely crosses a trigger from unfolding anything, and only one card is up
      // at a time — whichever opens last folds the one before it.
      // The controls are built by the first scheduler pass, not by apply().
      await sleep(500)
      var permTrigger = document.querySelector('.dsh-claude-perm-btn')
      var drawerTrigger = document.querySelector('.dsh-claude-account-btn')
      var heroTrigger = document.getElementById('hero-workspace')
      var presetTrigger = document.getElementById('hero-preset')
      function permUp() { return document.querySelectorAll('.dsh-claude-perm-popover[data-open="true"]').length }
      function drawerUp() { return document.querySelectorAll('.dsh-claude-account-popover[data-open="true"]').length }
      function hostCards() { return document.querySelectorAll('body > [role="menu"]:not([class*="dsh-claude"])').length }
      // The dwell is 100 ms: at 50 ms a crossing pointer has opened nothing, and
      // by 250 ms a pointer that stayed has the card.
      permTrigger.dispatchEvent(new MouseEvent('mouseenter'))
      await sleep(50)
      r.permOpenAtDwell = permUp()
      await sleep(200)
      r.permOpenPastDwell = permUp()
      // An open card is the one moment it may answer the host's menu role.
      var openPermCard = document.querySelector('.dsh-claude-perm-popover[data-open="true"]')
      r.permCardRole = openPermCard !== null ? openPermCard.getAttribute('role') : null
      // The drawer opens over the permission card and folds it.
      drawerTrigger.dispatchEvent(new MouseEvent('mouseenter'))
      await sleep(250)
      r.drawerUp = drawerUp()
      r.permFoldedByDrawer = permUp()
      // The hero row's host menu opens on the same dwell, over the drawer.
      heroTrigger.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }))
      await sleep(250)
      r.heroUp = window.__heroMenuOpen('hero-workspace')
      r.drawerFoldedByHero = drawerUp()
      // ...and the permission card folds the host menu on its way back.
      permTrigger.dispatchEvent(new MouseEvent('mouseenter'))
      await sleep(250)
      r.permReopened = permUp()
      r.heroFoldedByPerm = window.__heroMenuOpen('hero-workspace')
      // The row's two pickers are two host menus: crossing from the preset seat
      // straight to the workspace chip must fold the first, not leave both cards
      // up (with two cards up the skin stamps and places neither, and the pair
      // flickers as the hover-close path presses the wrong trigger).
      presetTrigger.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }))
      await sleep(250)
      r.presetUp = window.__heroMenuOpen('hero-preset')
      r.permFoldedByPreset = permUp()
      // The stamp names the picker, and only the workspace card is drawn as
      // Claude's folder menu: the preset card keeps its row glyph.
      function heroCardShape() {
        var card = document.querySelector('[data-dsh-claude-hero-menu]')
        if (card === null) return null
        var icons = card.querySelectorAll('[class*="_itemIcon_"]')
        var row = card.querySelector('[role="menuitem"]')
        return {
          kind: card.getAttribute('data-dsh-claude-hero-menu'),
          iconsShown: Array.prototype.filter.call(icons, function (icon) { return getComputedStyle(icon).display !== 'none' }).length,
          rowHeight: row === null ? null : Math.round(row.getBoundingClientRect().height),
        }
      }
      r.presetCard = heroCardShape()
      heroTrigger.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }))
      await sleep(250)
      r.workspaceUpAfterCrossing = window.__heroMenuOpen('hero-workspace')
      r.presetFoldedBySibling = window.__heroMenuOpen('hero-preset')
      r.heroCardsUp = hostCards()
      r.workspaceCard = heroCardShape()
      // Leaving the row folds the menu the hover opened, and only that one.
      heroTrigger.dispatchEvent(new MouseEvent('mouseout', { bubbles: true, relatedTarget: document.body }))
      await sleep(300)
      r.heroMenusLeft = window.__heroMenusOpen()
      permTrigger.dispatchEvent(new MouseEvent('mouseleave'))
      drawerTrigger.dispatchEvent(new MouseEvent('mouseleave'))
      await sleep(250)
      r.cardsLeftAfterLeave = permUp() + drawerUp()
    }
    if (window.SMOKE_CASE === 'sync-fault') {
      // A sync is retired after failing three passes in a row: drive four.
      for (var n = 0; n < 4; n++) { document.body.appendChild(document.createElement('i')); await sleep(80) }
    }
    if (window.SMOKE_CASE === 'desktop') {
      // The footer entries are hidden in place from the first pass: nothing in
      // this case has opened the drawer yet, so this read is the state a fresh
      // page shows beside the account row. (The first pass runs on a frame.)
      await sleep(500)
      r.footerEntriesBeforeOpen = Array.prototype.map.call(
        document.querySelectorAll('[class*="footerActions"] [data-slot] > *'),
        function (entry) {
          return {
            hidden: entry.hasAttribute('data-dsh-claude-footer-hidden'),
            display: getComputedStyle(entry).display,
          }
        })
      // The first login frame makes the skin read the profile once.
      window.__pushAccountFrame({ status: 'credential-stored', attempt: { phase: 'succeeded', id: 'smoke-1' } })
      await sleep(500)
      r.profileReadsAfterFirst = window.__profileReads
      // The same state again (a reconnect): no second read.
      window.__pushAccountFrame({ status: 'credential-stored', attempt: { phase: 'succeeded', id: 'smoke-1' } })
      await sleep(500)
      r.profileReadsAfterRepeat = window.__profileReads
      // The host's own account row is the entry: visible, and the skin builds
      // neither a trigger nor a popover of its own.
      var hostRow = document.getElementById('host-account')
      r.hostRowDisplay = hostRow ? getComputedStyle(hostRow).display : null
      r.hostRowVisible = !!(hostRow && hostRow.getBoundingClientRect().width > 0)
      r.syntheticBtn = !!document.querySelector('.dsh-claude-account-btn')
      var triggerRow = document.querySelector('[class*="footArea"] [class*="triggerRow"]')
      r.triggerRowDisplay = triggerRow ? getComputedStyle(triggerRow).display : null
      r.hostRowText = hostRow ? (hostRow.textContent || '').trim() : null
      r.hostRowWidth = hostRow ? hostRow.getBoundingClientRect().width : null
      r.accountWidthVar = document.body.style.getPropertyValue('--dsh-claude-account-width').trim()
      // The hover preference is on in this stand-in: a pointer dwelling on the
      // host's account row opens the host menu, and leaving it dismisses the
      // menu the host had mounted.
      if (hostRow) hostRow.dispatchEvent(new MouseEvent('mouseenter'))
      await sleep(250)
      r.hoverOpenedMenu = accountMenuOpen()
      if (hostRow) hostRow.dispatchEvent(new MouseEvent('mouseleave'))
      await sleep(350)
      r.hoverClosedMenu = !accountMenuOpen()
      var styleEl = document.getElementById('dsh-claude-style-style')
      var cssText = styleEl ? styleEl.textContent : ''
      r.menuEntryKeyframes = cssText.indexOf('@keyframes dsh-claude-account-menu-in') !== -1
      r.menuEntryAnimation = cssText.indexOf('animation: dsh-claude-account-menu-in 0.15s ease') !== -1
      // Open the host's own menu; the skin injects our container into its list.
      if (hostRow) hostRow.click()
      await sleep(500)
      var viewport = document.querySelector('body > [role="menu"] [role="presentation"]')
      var inject = document.querySelector('.dsh-claude-account-inject')
      // The marker the stylesheet hangs the skin's card on. It sits on the
      // host's own role=menu card, derived from the list it injected into so a
      // hidden menu portal elsewhere in the page cannot answer for it.
      var accountMenu = viewport ? viewport.closest('[role="menu"]') : null
      r.accountMenuMarked = !!(accountMenu && accountMenu.hasAttribute('data-dsh-claude-account-menu'))
      r.menuCardWidth = accountMenu ? accountMenu.getBoundingClientRect().width : null
      r.injectInViewport = !!(viewport && inject && inject.parentElement === viewport)
      r.injectFirst = !!(viewport && viewport.firstElementChild === inject)
      r.injectRows = inject ? Array.prototype.map.call(inject.children, function (c) {
        if (c.hasAttribute('data-dsh-claude-ban-row')) return 'header'
        if (c.hasAttribute('data-action-index')) return 'action'
        if (c.hasAttribute('data-embed-index')) return 'embed'
        return 'other'
      }) : null
      var injectName = inject ? inject.querySelector('.dsh-claude-account-popover-name') : null
      r.injectName = injectName ? injectName.textContent : null
      var htmlBefore = inject ? inject.innerHTML : null
      // React re-renders the list: the host empties the viewport and puts its own
      // rows back. The skin must re-insert our container, unchanged, first.
      window.__rerenderHostMenu()
      await sleep(400)
      var viewport2 = document.querySelector('body > [role="menu"] [role="presentation"]')
      var inject2 = document.querySelector('.dsh-claude-account-inject')
      r.injectHealedFirst = !!(viewport2 && inject2 && viewport2.firstElementChild === inject2)
      r.injectHealedSame = !!(inject2 && inject2.innerHTML === htmlBefore)
      // The host's keyboard walk reaches our injected button.
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }))
      await sleep(80)
      var focused = document.activeElement
      r.focusInInjected = !!(focused && inject2 && inject2.contains(focused) && focused.tagName === 'BUTTON')
      // The hold screen entered from the header: the overlay takes the pointer,
      // so the row and the card it covered report a leave without the pointer
      // moving, and with the hover preference on those leaves must neither
      // dismiss the host menu behind the page nor — through the footer's
      // synthetic Escape to that menu — the page itself.
      var banEntry = document.querySelector('.dsh-claude-account-inject [data-dsh-claude-ban-row]')
      if (banEntry) {
        banEntry.click()
        await sleep(80)
        r.banOpened = document.querySelectorAll('[data-dsh-ban]').length
        if (hostRow) hostRow.dispatchEvent(new MouseEvent('mouseleave'))
        var coveredMenu = document.querySelector('body > [role="menu"]')
        if (coveredMenu) coveredMenu.dispatchEvent(new MouseEvent('mouseleave'))
        await sleep(300)
        r.banSurvivesLeave = document.querySelectorAll('[data-dsh-ban]').length
        r.menuBehindBan = accountMenuOpen()
        var banDismiss = document.querySelector('.dsh-claude-ban [data-dsh-ban-dismiss]')
        if (banDismiss) banDismiss.click()
        await sleep(80)
        r.banAfterDismiss = document.querySelectorAll('[data-dsh-ban]').length
      }
      // Closing the host's menu (its own Escape) leaves no container behind.
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }))
      await sleep(400)
      r.injectAfterClose = document.querySelectorAll('.dsh-claude-account-inject').length
      r.accountMenuMarkAfterClose = document.querySelectorAll('[data-dsh-claude-account-menu]').length
      // The account menu is counted by content (its Sign out row): a role=menu
      // portal exists only while its menu is open, ours included.
      r.hostMenuAfterClose = Array.prototype.filter.call(document.querySelectorAll('body > [role="menu"]'), function (m) {
        var items = m.querySelectorAll('[role="menuitem"]')
        for (var mi = 0; mi < items.length; mi++) {
          if ((items[mi].textContent || '').trim() === 'Sign out') return true
        }
        return false
      }).length
      // Ctrl+, opens the host's settings dialog through the account menu.
      document.dispatchEvent(new KeyboardEvent('keydown', { key: ',', ctrlKey: true, bubbles: true, cancelable: true }))
      await sleep(700)
      r.dialogAfterShortcut = document.querySelectorAll('[class*="settingsArea"] [role="dialog"]').length
    }
    await sleep(1200)
    var from = window.__passes
    await sleep(1000)
    r.idlePasses = window.__passes - from
    // The stats row's host mode and the two structures' treatment. Detailed
    // gets the merged sentence (icons hidden, our separator); compact keeps the
    // host's icon readings and spacing and opens no card.
    var statsRoot = document.querySelector('[data-composer-stats]')
    r.statsMode = statsRoot ? statsRoot.getAttribute('data-dsh-claude-stats-mode') : null
    r.statsIcons = statsRoot ? Array.prototype.map.call(statsRoot.querySelectorAll('svg'), function (svg) {
      return getComputedStyle(svg).display
    }) : null
    var statsSpans = statsRoot ? statsRoot.children : null
    r.statsSep = statsSpans && statsSpans.length > 1 ? getComputedStyle(statsSpans[1], '::before').content : null
    if (window.SMOKE_CASE === 'stats-compact' && statsRoot) {
      // Dwell past the 300 ms hover delay: a compact row has no trigger to read.
      statsRoot.dispatchEvent(new MouseEvent('mouseenter'))
      await sleep(450)
    }
    r.statsOpen = document.querySelectorAll('.dsh-claude-stats-popover[data-open="true"]').length
    if (window.SMOKE_CASE === 'stats-compact' && statsRoot) {
      statsRoot.dispatchEvent(new MouseEvent('mouseleave'))
      await sleep(150)
    }
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
    if (window.SMOKE_CASE === 'default') {
      // The classic hero's welcome is drawn on arrival and holds between
      // passes: the draw pinned to either end of its pool gives two different
      // lines, and a further pass leaves the drawn one alone.
      var greetRoot = document.createElement('div')
      greetRoot.className = '_x_root_1'
      greetRoot.setAttribute('data-phase', 'hero')
      var greetGroup = document.createElement('div')
      greetGroup.className = '_x_titleGroup_1'
      var greetSpan = document.createElement('span')
      greetSpan.textContent = 'Host greeting'
      greetGroup.appendChild(greetSpan)
      greetRoot.appendChild(greetGroup)
      var greetRandom = Math.random
      var arrive = async function (draw) {
        Math.random = function () { return draw }
        document.body.appendChild(greetRoot)
        await sleep(150)
        Math.random = greetRandom
        return greetSpan.textContent
      }
      r.greeting = { low: await arrive(0) }
      // The crab belongs to the studio home page alone.
      r.classicCrab = document.querySelector('.dsh-claude-mascot') !== null
      document.body.appendChild(document.createElement('i'))
      await sleep(150)
      r.greeting.held = greetSpan.textContent
      greetRoot.remove()
      await sleep(150)
      r.greeting.high = await arrive(0.999)
      greetRoot.remove()
      await sleep(150)
      // The conversation view tabs (ConversationSession's strip): the pill is
      // drawn under the active tab without sliding in, then slides to the tab a
      // switch selects. The strip stays until the teardown, which must take the
      // pill back off it.
      var viewHeader = document.createElement('div')
      viewHeader.className = '_c_header_1'
      viewHeader.innerHTML = '<div class="_c_tabs_1" role="tablist" data-conversation-tabs="">' +
        '<button type="button" role="tab" aria-selected="true" class="_c_tab_1 _c_tabActive_1">Chat</button>' +
        '<button type="button" role="tab" aria-selected="false" class="_c_tab_1">Trajectory</button>' +
        '<button type="button" role="tab" aria-selected="false" class="_c_tab_1">Context</button></div>'
      document.body.appendChild(viewHeader)
      await sleep(150)
      var viewStrip = viewHeader.firstChild
      var viewTabs = viewStrip.children
      // The composer's host controls are marked by what they are, read from
      // the host's structure; the submit button turning into stop (its glyph
      // becomes a rect) moves its mark with it.
      var controlOf = function (id) { var el = document.getElementById(id); return el && el.getAttribute('data-dsh-claude-control') }
      var accessButton = document.querySelector('[data-slot="conversation.input.permission"] button:not([class*="dsh-claude"])')
      r.controls = { commands: controlOf('commands'), send: controlOf('send'), access: accessButton && accessButton.getAttribute('data-dsh-claude-control') }
      var sendSvg = document.querySelector('#send svg')
      var sendGlyph = sendSvg.innerHTML
      sendSvg.innerHTML = '<rect x="3" y="3" width="10" height="10"></rect>'
      await sleep(60)
      r.controls.stopping = controlOf('send')
      sendSvg.innerHTML = sendGlyph
      await sleep(60)
      r.controls.back = controlOf('send')
      r.viewPill = { stamped: viewStrip.hasAttribute('data-dsh-view-tabs'), first: pillState(viewStrip, viewTabs[0]) }
      viewTabs[0].setAttribute('aria-selected', 'false')
      viewTabs[0].className = '_c_tab_1'
      viewTabs[2].setAttribute('aria-selected', 'true')
      viewTabs[2].className = '_c_tab_1 _c_tabActive_1'
      await sleep(60)
      r.viewPill.switched = pillState(viewStrip, viewTabs[2])
      // The sidebar's brand row (ui-sidebar SidebarRoot): the search box goes in
      // beside the wide brand, and pressing it renders the host's Modal through
      // a root of the skin's own.
      var sidebarSlot = document.createElement('div')
      sidebarSlot.setAttribute('data-slot', 'sidebar')
      sidebarSlot.innerHTML = '<div class="_n_root_1"><div class="_n_logoRow_1" data-window-drag="true">' +
        '<button type="button" class="_n_brand_1 _n_wide_1" aria-label="New session">brand</button>' +
        '<button type="button" class="_n_iconButton_1 _n_toggle_1" aria-label="Collapse sidebar">toggle</button></div></div>'
      document.body.appendChild(sidebarSlot)
      await sleep(150)
      var logoRow = sidebarSlot.querySelector('[class*="_logoRow"]')
      var searchTrigger = logoRow.querySelector('.dsh-claude-search-trigger')
      var rootsBefore = window.__roots.length
      if (searchTrigger) searchTrigger.click()
      await sleep(60)
      var searchRoot = window.__roots[rootsBefore]
      r.search = {
        placed: !!searchTrigger && searchTrigger.previousElementSibling === logoRow.firstElementChild,
        rowMarked: logoRow.hasAttribute('data-dsh-claude-search-row'),
        resting: searchTrigger ? getComputedStyle(searchTrigger).visibility : null,
        modalRendered: !!searchRoot && searchRoot.renders > 0,
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
    }
    if (window.SMOKE_CASE === 'default' && statsRoot) {
      // The host's panels mount on its own commit, later than the skin's old
      // read window: both sections must still reach the card.
      statsRoot.dispatchEvent(new MouseEvent('mouseenter'))
      await sleep(2600)
      r.statsCardOpen = document.querySelectorAll('.dsh-claude-stats-popover[data-open="true"]').length
      r.statsCardSections = Array.prototype.map.call(document.querySelectorAll('.dsh-claude-stats-popover-section'), function (s) {
        return (s.textContent || '').trim()
      })
      r.statsCardLabels = Array.prototype.map.call(document.querySelectorAll('.dsh-claude-stats-popover-label'), function (s) {
        return (s.textContent || '').trim()
      })
      statsRoot.dispatchEvent(new MouseEvent('mouseleave'))
      await sleep(300)
    }
    var drawer = document.querySelector('.dsh-claude-account-popover-body')
    r.drawer = drawer ? Array.prototype.map.call(drawer.children, function (c) {
      if (c.hasAttribute('data-action-index')) return 'action'
      if (c.hasAttribute('data-embed-index')) return 'embed'
      if (c.getAttribute('data-action') === 'settings') return 'settings'
      return 'other'
    }) : null
    var syntheticPopover = document.querySelector('.dsh-claude-account-popover')
    r.syntheticHeader = !!(syntheticPopover && syntheticPopover.querySelector('[data-dsh-claude-ban-row]'))
    // The closed drawer's rows are built and reconciled while it is closed, so
    // the panel sits over the account row with its icons in it: visibility has
    // to take that content out of the paint and hit-test tree.
    r.syntheticVisibility = syntheticPopover ? getComputedStyle(syntheticPopover).visibility : null
    r.syntheticRowVisibility = syntheticPopover && syntheticPopover.querySelector('.dsh-claude-popover-item')
      ? getComputedStyle(syntheticPopover.querySelector('.dsh-claude-popover-item')).visibility
      : null
    // offsetLeft/offsetWidth, not the rect: the closed drawer still carries its
    // translateY/scale transition, which would shrink a measured rect.
    var syntheticBtn = document.querySelector('.dsh-claude-account-btn')
    r.syntheticBox = (syntheticPopover && syntheticBtn) ? {
      popoverLeft: syntheticPopover.offsetLeft,
      popoverWidth: syntheticPopover.offsetWidth,
      buttonLeft: syntheticBtn.offsetLeft,
      buttonWidth: syntheticBtn.offsetWidth,
    } : null
    r.syntheticInject = document.querySelectorAll('.dsh-claude-account-inject').length
    var user = document.querySelector('.dsh-claude-account-user')
    r.accountUser = user ? user.textContent : null
    var avatar = document.querySelector('.dsh-claude-account-avatar')
    r.avatarAttrs = attrs(avatar)
    var photo = avatar ? avatar.querySelector('img') : null
    r.photo = photo ? { attrs: attrs(photo), referrerPolicy: photo.referrerPolicy } : null
    r.photoSrc = photo ? photo.getAttribute('src') : null
    r.photoHidden = photo ? photo.hidden : null
    // The launcher's own picture is a texture sheet, so the row crops the head
    // into a canvas instead of handing the sheet to the <img>. Sampled at the
    // fixture's landmarks: red face inside the inset, green hat at the box's
    // corners, nothing in the margin between them.
    r.skinFlag = r.avatarAttrs !== null && r.avatarAttrs.indexOf('data-dsh-claude-skin') !== -1
    r.avatarRadius = avatar ? getComputedStyle(avatar).borderRadius : null
    var skinHead = avatar ? avatar.querySelector('canvas.dsh-claude-account-skin') : null
    r.skinCanvas = skinHead ? { width: skinHead.width, height: skinHead.height } : null
    r.skinPixels = null
    if (skinHead) {
      var skinContext = skinHead.getContext('2d')
      var pixelAt = function (x, y) {
        var data = skinContext.getImageData(x, y, 1, 1).data
        return [data[0], data[1], data[2], data[3]]
      }
      r.skinPixels = { face: pixelAt(32, 32), hatTop: pixelAt(2, 2), hatBottom: pixelAt(62, 62), margin: pixelAt(62, 30) }
    }
    var mirrored = drawer ? drawer.querySelector('[data-action-index]') : null
    r.mirroredText = mirrored ? mirrored.querySelector('.dsh-claude-popover-item-text').textContent : null
    var badge = mirrored ? mirrored.querySelector('.dsh-claude-popover-item-badge') : null
    r.mirroredBadge = badge ? badge.textContent : null
    r.stylesheet = !!document.getElementById('dsh-claude-style-style')
    // This stand-in host never carries the Windows titlebar marker, so the
    // skin must leave the body marker off and keep its measured placement.
    r.titlebarTabs = document.body.hasAttribute('data-dsh-titlebar-tabs')
    r.footerTakeover = document.body.hasAttribute('data-dsh-claude-footer-takeover')
    r.homeLayoutAttr = document.body.getAttribute('data-dsh-claude-home-layout')
    r.homeLayoutExpected = window.SMOKE_CASE === 'studio' ? 'studio' : null
    r.slotRegistrations = window.__slots || null
    r.composerRestyle = document.body.hasAttribute('data-dsh-claude-composer-active')
    if (window.SMOKE_CASE === 'studio') {
      // Render the registered panel on the hero page, once per tab, the way
      // the dock seat would: a throw here is the slot's error boundary on the
      // live page, which leaves the new-conversation page without its panel.
      var heroRoot = document.createElement('div')
      heroRoot.className = '_x_root_1'
      heroRoot.setAttribute('data-phase', 'hero')
      // Arriving on the hero draws the yardstick book; the draw is pinned to the
      // last book on the shelf, which no window here has passed, so the line has
      // to step down to the longest book each window did pass.
      var random = Math.random
      Math.random = function () { return 0.999 }
      document.body.appendChild(heroRoot)
      await sleep(200)
      Math.random = random
      r.panelRenders = {}
      // The Overview tab twice — all time, and the 7d pill picked — and the
      // Models tab folded and open; each state is keyed by the initial value it
      // replaces.
      var tabs = {
        overview: null,
        'overview-7d': { all: '7d' },
        models: { overview: 'models' },
        'models-open': { overview: 'models', false: true },
      }
      for (var tab in tabs) {
        var react = window.__react
        react.rendering = true
        react.states = tabs[tab]
        try {
          var classes = []
          var texts = []
          ;(function collect(node) {
            if (typeof node === 'string') { if (node) texts.push(node); return }
            if (node === null || typeof node !== 'object') return
            if (Array.isArray(node)) { node.forEach(collect); return }
            if (node.props && typeof node.props.className === 'string') classes.push(node.props.className)
            if (node.props) collect(node.props.children)
          })(window.__slotComponents['claude-style-usage']({}))
          r.panelRenders[tab] = { error: null, classes: classes, texts: texts }
        } catch (e) {
          r.panelRenders[tab] = { error: String((e && e.stack) || e), classes: [], texts: [] }
        } finally {
          react.rendering = false
          react.states = null
        }
      }
      // The crab rides the hero card. The pointer leaving it starts the
      // routine: a quarter second in it is winking, and past the routine's
      // three seconds it faces front again — and no frame of it wakes a pass.
      var mascot = document.querySelector('[data-composer-card] > .dsh-claude-mascot')
      r.mascot = {
        mounted: mascot !== null,
        poses: mascot === null ? 0 : mascot.querySelectorAll('g[data-pose]').length,
        visiblePoses: mascot === null ? 0 : mascot.querySelectorAll('g[data-pose]:not([display])').length,
      }
      if (mascot !== null) {
        // A real press has to reach the crab: nothing on the page may cover it.
        mascot.scrollIntoView({ block: 'center' })
        var hitBox = mascot.querySelector('.dsh-claude-mascot-hit').getBoundingClientRect()
        var topmost = document.elementFromPoint(hitBox.left + hitBox.width / 2, hitBox.top + hitBox.height / 2)
        r.mascot.reachable = topmost !== null && topmost.classList.contains('dsh-claude-mascot-hit')
        var passesBefore = window.__passes
        mascot.querySelector('.dsh-claude-mascot-hit').dispatchEvent(new PointerEvent('pointerleave'))
        await sleep(250)
        r.mascot.early = mascot.getAttribute('data-pose')
        r.mascot.earlyVisible = mascot.querySelectorAll('g[data-pose]:not([display])').length
        await sleep(3000)
        r.mascot.settled = mascot.getAttribute('data-pose')
        r.mascot.passesDuring = window.__passes - passesBefore
        // Under reduced motion the pointer passing by leaves it still, and a
        // click still plays it.
        var matchMedia = window.matchMedia
        window.matchMedia = function (query) {
          return query === '(prefers-reduced-motion: reduce)' ? { matches: true } : matchMedia.call(window, query)
        }
        mascot.querySelector('.dsh-claude-mascot-hit').dispatchEvent(new PointerEvent('pointerleave'))
        await sleep(250)
        r.mascot.reducedLeave = mascot.getAttribute('data-pose')
        mascot.querySelector('.dsh-claude-mascot-hit').dispatchEvent(new MouseEvent('click', { bubbles: true }))
        await sleep(250)
        r.mascot.clicked = mascot.getAttribute('data-pose')
        await sleep(3000)
        r.mascot.clickSettled = mascot.getAttribute('data-pose')
        window.matchMedia = matchMedia
      }
      // The cold start screen: no session yet, so the host renders no dock
      // under the hero stack and no access button, and the card is the
      // workspace picker with an empty mode strip. The page's own access button
      // stands for a session, so it leaves the page for the length of this.
      var access = document.querySelector('button[aria-label^="Access mode"]')
      var accessParent = access.parentElement
      access.remove()
      var coldStack = document.createElement('div')
      coldStack.className = '_x_composerStack_1 _x_composerHero_1'
      coldStack.innerHTML = '<div data-composer-card class="_x_card_1 _x_cardWorkspaceTrigger_1">' +
        '<div class="_x_row_1"><div class="_x_tools_1"><div class="_x_modes_1"></div></div></div></div>'
      heroRoot.appendChild(coldStack)
      await sleep(200)
      var coldSeat = coldStack.querySelector(':scope > .dsh-claude-home-seat')
      var coldRoot = window.__roots.filter(function (root) { return root.element === coldSeat })[0]
      r.coldStart = {
        seat: coldSeat !== null,
        rendered: coldRoot !== undefined && coldRoot.renders > 0,
        segments: Array.prototype.map.call(coldStack.querySelectorAll('._x_modes_1 > .dsh-claude-segments > .dsh-claude-segment'), function (item) {
          return { label: item.textContent, disabled: item.disabled, active: item.hasAttribute('data-active') }
        }),
      }
      var coldGroup = coldStack.querySelector('._x_modes_1 > .dsh-claude-segments')
      var coldActive = coldGroup === null ? null : coldGroup.querySelector('[data-active]')
      r.coldStart.pill = coldActive === null ? null : pillState(coldGroup, coldActive)
      // The session arrives: the host renders its dock, and the skin's seat
      // gives the panel back.
      var coldDock = document.createElement('div')
      coldDock.setAttribute('data-slot', 'conversation.input.dock')
      coldStack.insertBefore(coldDock, coldStack.firstChild)
      await sleep(200)
      r.coldStart.seatAfterDock = coldStack.querySelector('.dsh-claude-home-seat') !== null
      r.coldStart.unmountedAfterDock = coldRoot !== undefined && coldRoot.unmounted
      coldStack.remove()
      accessParent.appendChild(access)
      await sleep(200)
      r.homeHero = { onHero: document.body.hasAttribute('data-dsh-claude-home-hero') }
      // The studio rules reach the hero stack through that mark: the stack
      // takes the studio column's 720px cap.
      var studioStack = document.createElement('div')
      studioStack.className = '_x_composerStack_1 _x_composerHero_1'
      document.body.appendChild(studioStack)
      r.homeHero.stackMaxWidth = getComputedStyle(studioStack).maxWidth
      studioStack.remove()
      heroRoot.remove()
      await sleep(200)
      r.homeHero.offHero = document.body.hasAttribute('data-dsh-claude-home-hero')
      r.mascot.afterHero = document.querySelector('.dsh-claude-mascot') !== null
      // The stylesheet alone decides where a panel may draw: under the hero
      // stack's dock it shows, and the moment the host drops the stack's hero
      // class (the first message sent) it is gone, before any pass runs.
      function panelDisplay(stackClass, coldStart) {
        var stack = document.createElement('div')
        stack.className = stackClass
        var dock = document.createElement('div')
        if (coldStart) dock.className = 'dsh-claude-home-seat'
        else dock.setAttribute('data-slot', 'conversation.input.dock')
        var panel = document.createElement('section')
        panel.className = 'dsh-claude-home-panel'
        dock.appendChild(panel)
        stack.appendChild(dock)
        document.body.appendChild(stack)
        var display = getComputedStyle(panel).display
        stack.remove()
        return display
      }
      r.panelDisplay = {
        hero: panelDisplay('_x_composerStack_1 _x_composerHero_1'),
        coldStart: panelDisplay('_x_composerStack_1 _x_composerHero_1', true),
        conversation: panelDisplay('_x_composerStack_1'),
      }
    }
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
    if (window.SMOKE_CASE === 'automode-roundtrip') {
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
    }
    // The chat column of a running turn (ui-chat ChatView): its process control
    // renders first, then the turn's work, then a queued message the host
    // keeps after the turn. The status line has to show below the work and
    // above the queued message.
    if (window.SMOKE_CASE === 'turn-status') {
      var chatSession = document.createElement('div')
      chatSession.setAttribute('data-conversation-session', 'smoke-session')
      chatSession.innerHTML = '<div data-chat-flow="" style="display:flex;flex-direction:column">' +
        '<div data-chat-flow-kind="user" data-chat-turn="1">question</div>' +
        '<div data-chat-flow-kind="turn-process" data-chat-turn="1"><button type="button" data-turn-process="1" disabled>' +
        '<span class="_p_label_1">Deep diving for 1m 5s</span></button></div>' +
        '<div data-chat-flow-kind="assistant-step" data-chat-turn="1">work</div>' +
        '<div class="_p_pending_1">queued</div></div>'
      document.body.appendChild(chatSession)
      await sleep(150)
      var chatRows = chatSession.querySelectorAll('[data-chat-flow] > *')
      var statusButton = chatSession.querySelector('button[data-turn-process]')
      var tops = Array.prototype.map.call(chatRows, function (row) { return row.getBoundingClientRect().top })
      r.turnStatus = {
        live: chatRows[1].hasAttribute('data-dsh-claude-turn-live'),
        trailing: chatRows[3].hasAttribute('data-dsh-claude-turn-trailing'),
        belowWork: tops[1] > tops[2],
        aboveQueued: tops[1] < tops[3],
        text: statusButton.getAttribute('data-dsh-claude-turn-status'),
        drawn: getComputedStyle(statusButton, '::after').content,
        label: getComputedStyle(chatRows[1].querySelector('span')).display,
      }
    }
    // The host's own account row, when the host has one: the skin marks it and
    // repaints it as a Claude row, so the teardown has to hand it back exactly as
    // the host rendered it (D12).
    r.hostRowPresent = document.getElementById('host-account') !== null
    var hostRowAtRest = document.getElementById('host-account')
    r.hostRowMarked = !!(hostRowAtRest && hostRowAtRest.hasAttribute('data-dsh-claude-account-host-row'))
    // The two host controls the skin's own colour rules must leave readable: the
    // chat's solid hover chip, and a filled anchor button whose ink comes from
    // the host's foreground token rather than from the link colour.
    var chip = document.querySelector('._h_older_1 button')
    var chipCS = chip ? getComputedStyle(chip) : null
    r.chipInk = chipCS ? chipCS.color : null
    r.chipFill = chipCS ? chipCS.backgroundColor : null
    var topUp = document.querySelector('._h_balance_1 a')
    var topUpCS = topUp ? getComputedStyle(topUp) : null
    r.topUpInk = topUpCS ? topUpCS.color : null
    r.topUpFill = topUpCS ? topUpCS.backgroundColor : null
    var banRow = document.querySelector('[data-dsh-claude-ban-row]')
    if (banRow) banRow.click()
    var toast = document.querySelector('.dsh-claude-ban-toast-text')
    r.banToast = toast ? toast.textContent : null
    var dismiss = document.querySelector('.dsh-claude-ban [data-dsh-ban-dismiss]')
    if (dismiss) dismiss.click()
    // A closed popover card must not answer the host's menu role: the host's
    // keyboard arbitration queries every [role=menu] in the document as a menu
    // that owns the foreground, so a hidden card silently disarms the shortcuts
    // behind it (the Esc-Esc stop, the close-page and dialog commands).
    r.closedMenuCards = document.querySelectorAll('.dsh-claude-popover-card[role="menu"]:not([data-open="true"])').length
    var editor = document.getElementById('editor')
    editor.focus()
    editor.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }))
    r.keys = window.__keys.slice()
    await sleep(50)
    r.pwned = window.__pwned
    r.errors = window.__errors.slice()
    r.uncaught = window.__uncaught.slice()
    if (r.teardownRegistered) {
      // Dispose with a pass pending, the way a live page is disposed mid-stream:
      // the mutation's observer callback runs before the await resumes, so a
      // frame is already requested when the teardown starts.
      document.body.appendChild(document.createElement('i'))
      await Promise.resolve()
      window.__dispose()
      var before = window.__passes
      document.body.appendChild(document.createElement('i'))
      await sleep(200)
      r.passesAfterTeardown = window.__passes - before
      r.leftNodes = document.querySelectorAll('[class*="dsh-claude-"]').length
      r.leftMarkers = document.querySelectorAll('[data-dsh-claude-footer-entry], [data-dsh-claude-footer-hidden], [data-dsh-claude-footer-overlay], [data-dsh-claude-model-host], [data-dsh-claude-account-host-row], [data-dsh-claude-stats-mode], [data-dsh-claude-turn-live], [data-dsh-claude-turn-trailing], [data-dsh-claude-turn-status]').length
      r.leftAttrs = Array.prototype.filter.call(document.body.attributes, function (a) { return /^data-dsh-(claude|window)/.test(a.name) }).map(function (a) { return a.name })
      r.leftStylesheet = !!document.getElementById('dsh-claude-style-style')
      if (viewStrip) r.viewPill.left = viewStrip.hasAttribute('data-dsh-claude-pill') || viewStrip.hasAttribute('data-dsh-view-tabs') || viewStrip.style.length > 0
      if (r.search) {
        r.search.left = document.querySelectorAll('[data-dsh-claude-search-row], .dsh-claude-search-trigger').length
        r.search.rootUnmounted = !!searchRoot && searchRoot.unmounted
      }
      r.leftDraftMarks = document.querySelectorAll('[data-dsh-claude-draft-empty]').length
      r.leftControlMarks = document.querySelectorAll('[data-dsh-claude-control]').length
      var hostRowEnd = document.getElementById('host-account')
      r.hostRowEnd = hostRowEnd === null ? null : {
        visibility: getComputedStyle(hostRowEnd).visibility,
        pointerEvents: getComputedStyle(hostRowEnd).pointerEvents,
        display: getComputedStyle(hostRowEnd).display,
        width: hostRowEnd.getBoundingClientRect().width,
      }
    }
    return r
  })()
})()
