/**
 * Runs in the page after the bundle: applies the skin and reports.
 *
 * The reads run as one sequence. What no case names is the shared baseline —
 * the install, the account menu, the composer row, the session list, the
 * teardown — which every case's assertions draw on. A read only one case needs
 * sits in an `onlyFor([...])` step of its own, and that list is the step's
 * declaration of which cases read it. A page load may carry several cases (see
 * PAGES in shared.cjs), and then it runs their steps in this order.
 */
(function () {
  window.__applyError = null
  try { window.__skin.apply(window.__ctx) } catch (e) { window.__applyError = String((e && e.stack) || e) }
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms) }) }
  function attrs(el) { return el ? Array.prototype.map.call(el.attributes, function (a) { return a.name }) : null }
  // A segmented control's sliding pill (src/shared/sliding-pill.ts) against
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
    /**
     * One case's own collection: `body` runs when the cases this page load
     * carries include one of `names` (page.cjs sets window.SMOKE_GROUPS to
     * them, and window.SMOKE_CASE to the page's own name for the pages that
     * carry a single case). This is the only place that decides, and a list
     * that matches none of them leaves that case's assertions short of their
     * fields, so they fail.
     */
    async function onlyFor(names, body) {
      var running = window.SMOKE_GROUPS || [window.SMOKE_CASE]
      if (names.some(function (name) { return running.indexOf(name) !== -1 })) await body()
    }
    // Held across the plan: the shell cases' collection takes hold of the
    // view-tab strip and the search root, and the teardown tail reads them.
    var viewStrip = null
    var searchRoot = null
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
    await onlyFor(['late-forms'], async function () {
      // The directory has not answered yet: the skin holds the defaults.
      r.lateBefore = document.body.getAttribute('data-dsh-claude-home-layout')
      window.__serveNamespace()
      // A pass is driven by a mutation, the way the live page drives one.
      document.body.appendChild(document.createElement('i'))
      await sleep(200)
      r.lateAfter = document.body.getAttribute('data-dsh-claude-home-layout')
    })
    await onlyFor(['popovers'], async function () {
      // The shared popover rule (shared/popover.ts): the dwell keeps a pointer that
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
      /** Where the stamped card sits against its trigger, in the skin's own terms. */
      function heroCardPlacement() {
        var card = document.querySelector('[data-dsh-claude-hero-menu]')
        var row = document.getElementById('hero-workspace')
        if (card === null) return null
        var c = card.getBoundingClientRect()
        var t = row.getBoundingClientRect()
        return {
          side: c.bottom <= t.top + 1 ? 'above' : (c.top >= t.bottom - 1 ? 'below' : 'overlapping'),
          airAbove: Math.round(t.top - c.bottom),
          airBelow: Math.round(c.top - t.bottom),
          rightDelta: Math.round(t.right - c.right),
        }
      }
      r.presetCard = heroCardShape()
      heroTrigger.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }))
      await sleep(250)
      r.workspaceUpAfterCrossing = window.__heroMenuOpen('hero-workspace')
      r.presetFoldedBySibling = window.__heroMenuOpen('hero-preset')
      r.heroCardsUp = hostCards()
      r.workspaceCard = heroCardShape()
      r.workspacePlacement = heroCardPlacement()
      // Leaving the row folds the menu the hover opened, and only that one.
      heroTrigger.dispatchEvent(new MouseEvent('mouseout', { bubbles: true, relatedTarget: document.body }))
      await sleep(300)
      r.heroMenusLeft = window.__heroMenusOpen()
      // The row against the viewport's top edge leaves no room above: the card
      // flips below its trigger rather than leaving the screen.
      var heroRow = document.querySelector('[class*="heroWorkspaceRow"]')
      heroRow.style.bottom = 'auto'
      heroRow.style.top = '0px'
      heroTrigger.click()
      await sleep(250)
      r.workspacePlacementTight = heroCardPlacement()
      heroTrigger.click()
      await sleep(200)
      r.heroMenusLeftAfterFlip = window.__heroMenusOpen()
      heroRow.style.bottom = ''
      heroRow.style.top = ''
      permTrigger.dispatchEvent(new MouseEvent('mouseleave'))
      drawerTrigger.dispatchEvent(new MouseEvent('mouseleave'))
      await sleep(250)
      r.cardsLeftAfterLeave = permUp() + drawerUp()
    })
    await onlyFor(['sync-fault'], async function () {
      // A sync is retired after failing three passes in a row: drive four.
      for (var n = 0; n < 4; n++) { document.body.appendChild(document.createElement('i')); await sleep(80) }
    })
    await onlyFor(['desktop'], async function () {
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
      // Open the host's own menu: the card mounts with the host's rows, the skin
      // injects ours a frame later, and the host re-places the card a frame after
      // that. The card must stay unpainted until both have happened.
      var frame = function () { return new Promise(function (resolve) { requestAnimationFrame(function () { resolve() }) }) }
      var cardFrames = []
      if (hostRow) hostRow.click()
      for (var cardFrame = 0; cardFrame < 24; cardFrame++) {
        await frame()
        var card = document.querySelector('body > [role="menu"]')
        if (card === null) continue
        var cardRows = card.querySelector('.dsh-claude-account-inject')
        cardFrames.push({
          ready: card.hasAttribute('data-dsh-claude-account-ready'),
          rows: cardRows !== null && cardRows.childElementCount > 0,
          top: card.style.top,
          painted: getComputedStyle(card).visibility !== 'hidden',
        })
      }
      var revealedAt = -1
      for (var cf = 0; cf < cardFrames.length; cf++) { if (cardFrames[cf].ready) { revealedAt = cf; break } }
      var lastTop = cardFrames.length === 0 ? null : cardFrames[cardFrames.length - 1].top
      r.accountReveal = {
        frames: cardFrames.length,
        revealedAt: revealedAt,
        paintedWhileUnready: cardFrames.some(function (f) { return !f.ready && f.painted }),
        rowsAtReveal: revealedAt !== -1 && cardFrames[revealedAt].rows,
        placedAtReveal: revealedAt !== -1 && cardFrames[revealedAt].top === lastTop,
        mountTop: cardFrames.length === 0 ? null : cardFrames[0].top,
        topAtReveal: revealedAt === -1 ? null : cardFrames[revealedAt].top,
        topAtEnd: lastTop,
      }
      await sleep(400)
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
    })
    // The reads below depend on the skin's first pass having landed. Waiting
    // for the page to go quiet, rather than for a fixed delay, keeps that true
    // on a slow machine without spending the delay on a fast one; the full tier
    // then watches for a pass, which is the idle check, and the quick tier
    // leaves that check out.
    var quietSince = window.__passes
    for (var waited = 0, quiet = 0; waited < 30 && quiet < 6; waited += 1) {
      await sleep(50)
      if (window.__passes === quietSince) quiet += 1
      else { quiet = 0; quietSince = window.__passes }
    }
    if (window.SMOKE_TIER !== 'quick') {
      var from = window.__passes
      await sleep(1000)
      r.idlePasses = window.__passes - from
    }
    // The host's stats row is hidden outright, in both of its shapes: its pills
    // stay in the document as the read's own click targets, and their dialogs
    // are read into the context popover instead (the 'default' case below).
    var statsRoot = document.querySelector('[data-composer-stats]')
    r.statsHidden = statsRoot ? getComputedStyle(statsRoot).display === 'none' : null
    r.statsStrayCards = document.querySelectorAll('.dsh-claude-stats-popover').length
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
    await onlyFor(['brand'], async function () {
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
        raised: claudeDark.getPropertyValue('--dsh-claude-raised').trim(),
      }
      document.body.removeAttribute('data-ds-dark-theme')
    })
    await onlyFor(['hero'], async function () {
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
      // The crab stands on the classic home page's card too, as Deepy does.
      r.classicCrab = document.querySelector('[data-composer-card] > .dsh-claude-crab') !== null
      document.body.appendChild(document.createElement('i'))
      await sleep(150)
      r.greeting.held = greetSpan.textContent
      greetRoot.remove()
      await sleep(150)
      r.greeting.high = await arrive(0.999)
      greetRoot.remove()
      await sleep(150)
    })
    await onlyFor(['view-tabs'], async function () {
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
      viewStrip = viewHeader.firstChild
      var viewTabs = viewStrip.children
      r.viewPill = { stamped: viewStrip.hasAttribute('data-dsh-view-tabs'), first: pillState(viewStrip, viewTabs[0]) }
      viewTabs[0].setAttribute('aria-selected', 'false')
      viewTabs[0].className = '_c_tab_1'
      viewTabs[2].setAttribute('aria-selected', 'true')
      viewTabs[2].className = '_c_tab_1 _c_tabActive_1'
      await sleep(60)
      r.viewPill.switched = pillState(viewStrip, viewTabs[2])
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
    await onlyFor(['composer'], async function () {
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
    })
    await onlyFor(['search'], async function () {
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
      searchRoot = window.__roots[rootsBefore]
      r.search = {
        placed: !!searchTrigger && searchTrigger.previousElementSibling === logoRow.firstElementChild,
        rowMarked: logoRow.hasAttribute('data-dsh-claude-search-row'),
        resting: searchTrigger ? getComputedStyle(searchTrigger).visibility : null,
        modalRendered: !!searchRoot && searchRoot.renders > 0,
      }
    })
    await onlyFor(['context-stats', 'stats-compact'], async function () {
      // The shown conversation, marked the way the host marks it: the skin reads
      // the session id off the conversation column, so the card and its dock are
      // wrapped in the case's own phase/column pair (the dock stays the card's
      // next sibling, which is what the composer pass measures).
      var statsCard = document.querySelector('[data-composer-card]')
      var statsDock = statsCard.nextElementSibling
      var statsPhase = document.createElement('div')
      statsPhase.setAttribute('data-phase', 'active')
      var statsColumn = document.createElement('div')
      statsColumn.setAttribute('data-conversation-session', 'smoke-stats')
      statsCard.parentElement.insertBefore(statsPhase, statsCard)
      statsPhase.appendChild(statsColumn)
      statsColumn.appendChild(statsCard)
      statsColumn.appendChild(statsDock)
      await sleep(300)
      var statsMeter = document.querySelector('[data-dsh-claude-context-meter]')
      if (statsMeter !== null) statsMeter.dispatchEvent(new MouseEvent('mouseenter'))
      await sleep(700)
      // No projection frame yet: the block holds the numbers' place, under the
      // host's own headings, at a row's own size.
      var statsSkeleton = document.querySelector('[data-dsh-claude-context-skeleton]')
      r.context = {
        panelStamped: document.querySelector('[data-dsh-claude-context-panel]') !== null,
        skeletonSections: statsSkeleton === null ? null : Array.prototype.map.call(statsSkeleton.querySelectorAll('.dsh-claude-context-stats-section'), function (s) {
          return (s.textContent || '').trim()
        }),
        skeletonRows: statsSkeleton === null ? 0 : statsSkeleton.querySelectorAll('.dsh-claude-context-stats-skeleton-value').length,
        skeletonItemHeight: statsSkeleton === null ? null : Math.round(statsSkeleton.querySelector('.dsh-claude-context-stats-item').getBoundingClientRect().height),
      }
      // The first projection frame: the numbers replace the place, in full.
      window.__pushStats('sessionStats', { turns: 2, steps: 3, llmMs: 1200, toolMs: 400, ttftMs: 800, ttftSteps: 1, decodeMs: 2000, decodeTokens: 210 })
      window.__pushStats('tokenUsage', { uncachedInputTokens: 1000, outputTokens: 105, cacheReadTokens: 9000, cacheWriteTokens: 0 })
      await sleep(200)
      var statsBlock = document.querySelector('.dsh-claude-context-stats')
      var statsPanel = statsBlock === null ? null : statsBlock.closest('[role="dialog"]')
      r.context.opened = statsPanel !== null
      // Another plugin's popover is on the page, holding a `dl` of its own, and
      // it carries what a generation before this one left on it. The block is
      // the host's panel's, and none of that is left on the popover.
      r.context.panelId = statsPanel === null ? null : statsPanel.id
      r.context.strayBlockGone = document.getElementById('stray-context-block') === null
      var foreignPopover = document.getElementById('foreign-popover')
      r.context.foreignUnmarked = foreignPopover !== null &&
        !foreignPopover.hasAttribute('data-dsh-claude-context-panel') &&
        !foreignPopover.hasAttribute('data-dsh-claude-context-aligned')
      r.context.expanded = statsMeter === null ? null : statsMeter.querySelector('button').getAttribute('aria-expanded')
      r.context.hostRows = statsPanel === null ? 0 : statsPanel.querySelectorAll('dl dt').length
      // The panel is the host's and it places from the anchor's left edge; the
      // skin hands over the left value that puts the panel's right edge on the
      // meter's — or on the viewport margin when the panel is wider than the
      // room left of the window's edge.
      var statsWidth = statsPanel === null ? 0 : statsPanel.offsetWidth
      var statsMeterRight = statsMeter === null ? 0 : Math.round(statsMeter.getBoundingClientRect().right)
      var statsLeft = statsPanel === null ? NaN : parseInt(statsPanel.style.getPropertyValue('--dsh-claude-context-panel-left'), 10)
      r.context.aligned = statsPanel !== null && statsPanel.hasAttribute('data-dsh-claude-context-aligned')
      r.context.edgeAligned = statsPanel !== null && statsWidth > 0 && !isNaN(statsLeft) &&
        (statsLeft + statsWidth === statsMeterRight ||
          statsLeft === 12 ||
          statsLeft === window.innerWidth - statsWidth - 12)
      r.context.skeletonGone = statsBlock !== null && !statsBlock.hasAttribute('data-dsh-claude-context-skeleton')
      r.context.sections = statsBlock === null ? null : Array.prototype.map.call(statsBlock.querySelectorAll('.dsh-claude-context-stats-section'), function (s) {
        return (s.textContent || '').trim()
      })
      r.context.labels = statsBlock === null ? null : Array.prototype.map.call(statsBlock.querySelectorAll('.dsh-claude-context-stats-label'), function (s) {
        return (s.textContent || '').trim()
      })
      r.context.values = statsBlock === null ? null : Array.prototype.map.call(statsBlock.querySelectorAll('.dsh-claude-context-stats-value'), function (s) {
        return (s.textContent || '').trim()
      })
      // A projection frame while the popover is open: the block is rewritten
      // from the new value, with no pass and no second hover.
      window.__pushStats('sessionStats', { llmMs: 61000 })
      await sleep(150)
      var statsPushed = document.querySelector('.dsh-claude-context-stats .dsh-claude-context-stats-value')
      r.context.pushed = statsPushed === null ? null : (statsPushed.textContent || '').trim()
      if (statsMeter !== null) statsMeter.dispatchEvent(new MouseEvent('mouseleave'))
      await sleep(500)
      r.context.closedAfterLeave = document.querySelector('.dsh-claude-context-stats') === null
      // The room the skin keeps for the meter is what holds the model trigger
      // clear of the ring. A pass that measures the meter with no box — the seat
      // is display: none while another conversation tab is up — is no reading,
      // so the row keeps its room and the pass after the box returns measures
      // again. Taking the room away here left the trigger under the ring until
      // the reading itself moved.
      r.context.roomBefore = document.body.style.getPropertyValue('--dsh-claude-meter-room')
      // The host rewrites the reading beside the ring (ContextMeter's `<span>`).
      var meterReading = statsMeter === null ? null : statsMeter.querySelector('button > span')
      if (statsMeter !== null) statsMeter.style.display = 'none'
      if (meterReading !== null) meterReading.textContent = meterReading.textContent === '43%' ? '44%' : '43%'
      statsCard.appendChild(document.createElement('span'))
      await sleep(400)
      if (statsMeter !== null) statsMeter.style.display = ''
      statsCard.appendChild(document.createElement('span'))
      await sleep(400)
      r.context.roomAfter = document.body.style.getPropertyValue('--dsh-claude-meter-room')
    })
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
    // The skin's sheet wears this package's own module-system tags (D33): the
    // host's claim sweep reads untagged tags alone, so a tagged sheet cannot be
    // claimed by a sibling package and removed by that sibling's reload.
    var skinStyle = document.getElementById('dsh-claude-style-style')
    r.sheetPlugin = skinStyle ? skinStyle.getAttribute('data-plugin') : null
    r.sheetPluginCss = skinStyle ? skinStyle.getAttribute('data-plugin-css') : null
    r.sheetClaimable = skinStyle ? skinStyle.matches('style:not([data-plugin])') : null
    // The sibling's sheet (stand-in.js planted it before this bundle's factory
    // ran): this package must keep it out of its own bookkeeping, so no reload of
    // this package removes it (D33).
    var siblingSheet = document.getElementById('smoke-sibling-sheet')
    r.siblingSheetTag = siblingSheet ? siblingSheet.getAttribute('data-plugin') : null
    r.siblingSheetClaimable = siblingSheet ? siblingSheet.matches('style:not([data-plugin])') : null
    // A sibling's sheet that arrives after this bundle's factory ran, the way a
    // plugin mounting its sheet from apply() arrives: the head watch parks it
    // before the next package materializes (D33).
    var lateSheet = document.createElement('style')
    lateSheet.id = 'smoke-late-sibling-sheet'
    lateSheet.textContent = '.smoke-late-sibling-sheet{color:rgb(4, 5, 6)}'
    document.head.appendChild(lateSheet)
    await Promise.resolve()
    await sleep(0)
    r.lateSheetTag = lateSheet.getAttribute('data-plugin')
    r.lateSheetClaimable = lateSheet.matches('style:not([data-plugin])')
    lateSheet.remove()
    // This stand-in host never carries the Windows titlebar marker, so the
    // skin must leave the body marker off and keep its measured placement.
    r.titlebarTabs = document.body.hasAttribute('data-dsh-titlebar-tabs')
    r.footerTakeover = document.body.hasAttribute('data-dsh-claude-footer-takeover')
    r.homeLayoutAttr = document.body.getAttribute('data-dsh-claude-home-layout')
    r.homeLayoutExpected = window.SMOKE_CASE === 'studio' ? 'studio' : null
    // A copy, not the live list: the teardown at the end of this run hands every
    // registration back, and what this check is about is what was registered
    // while the page was up.
    r.slotRegistrations = window.__slots ? window.__slots.map(function (entry) { return Object.assign({}, entry) }) : null
    r.composerRestyle = document.body.hasAttribute('data-dsh-claude-composer-active')
    // The host's model seat inside an inline card, with a menu another plugin
    // nests in it (its hashed class says "model"). Read and removed within one
    // task, so no skin pass ever sees it: the trigger rule must reach the
    // host's trigger, leave the nested menu its block layout, and leave the
    // seat root hidden once the picker marks it.
    var modelCard = document.createElement('div')
    modelCard.setAttribute('data-composer-card', '')
    modelCard.setAttribute('data-composer-variant', 'inline')
    modelCard.innerHTML = '<div class="_x_trailing_2"><div data-slot="conversation.input.model" style="display:contents">' +
      '<div class="_m_root_1"><button type="button" class="_m_trigger_1">model-a</button>' +
      '<div class="_m_menu_1"><div class="_p_providerModelMenu_1"></div></div></div></div></div>'
    document.body.appendChild(modelCard)
    var modelSeatRoot = modelCard.querySelector('._m_root_1')
    r.modelSeat = {
      trigger: getComputedStyle(modelCard.querySelector('._m_trigger_1')).display,
      nestedMenu: getComputedStyle(modelCard.querySelector('._p_providerModelMenu_1')).display,
    }
    modelSeatRoot.setAttribute('data-dsh-claude-model-host', '')
    r.modelSeat.markedRoot = getComputedStyle(modelSeatRoot).display
    modelCard.remove()
    await onlyFor(['studio'], async function () {
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
      // The crab rides the hero card, idling, drawn from its inlined sheet and
      // ink mask. A click on its left half pokes it, and the poke plays out
      // back to idle on the browser's animation engine, so no frame wakes a
      // pass. With the animation choice on "reduced" it holds the idle
      // sheet's still frame; a click still plays the poke.
      var crab = document.querySelector('[data-composer-card] > .dsh-claude-crab')
      r.mascot = { mounted: crab !== null }
      if (crab !== null) {
        var crabStrip = crab.querySelector('.dsh-claude-crab-strip')
        var crabHit = crab.querySelector('.dsh-claude-crab-hit')
        r.mascot.ready = crab.hasAttribute('data-ready')
        r.mascot.animation = crab.getAttribute('data-animation')
        r.mascot.body = getComputedStyle(crabStrip).backgroundImage.indexOf('data:image/png') !== -1
        r.mascot.ink = getComputedStyle(crabStrip, '::after').maskImage.indexOf('data:image/png') !== -1
        // A real press has to reach the crab: nothing on the page may cover it.
        crab.scrollIntoView({ block: 'center' })
        var crabBox = crabHit.getBoundingClientRect()
        var topmost = document.elementFromPoint(crabBox.left + crabBox.width / 2, crabBox.top + crabBox.height / 2)
        r.mascot.reachable = topmost === crabHit
        var crabPress = { pointerId: 1, pointerType: 'mouse', isPrimary: true, button: 0, clientX: crabBox.left + 6, clientY: crabBox.top + crabBox.height / 2, bubbles: true }
        var pokeCrab = function () {
          crabHit.dispatchEvent(new PointerEvent('pointerdown', Object.assign({ buttons: 1 }, crabPress)))
          crabHit.dispatchEvent(new PointerEvent('pointerup', Object.assign({ buttons: 0 }, crabPress)))
        }
        // The press settles focus (and the caret motion's own frames with it),
        // so the count starts once that is over: what is measured is the poke's
        // animation running on the browser's engine.
        pokeCrab()
        await sleep(300)
        r.mascot.poked = crab.getAttribute('data-animation')
        var passesBefore = window.__passes
        await sleep(1150)
        r.mascot.afterPoke = crab.getAttribute('data-animation')
        r.mascot.passesDuring = window.__passes - passesBefore
        // The choice is pushed through the host form, which is what the
        // settings row does.
        window.__pushForm({ motion: 'reduced' })
        await sleep(150)
        r.mascot.reducedAttr = document.body.getAttribute('data-dsh-claude-motion')
        r.mascot.stillFrame = crabStrip.style.transform
        r.mascot.stillAnimations = crabStrip.getAnimations().length
        pokeCrab()
        await sleep(150)
        r.mascot.reducedClick = crab.getAttribute('data-animation')
        await sleep(1300)
        window.__pushForm({ motion: 'full' })
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
      r.mascot.afterHero = document.querySelector('.dsh-claude-crab') !== null
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
    })
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
    await onlyFor(['automode-roundtrip'], async function () {
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
    // The chat column (ui-chat ChatView) of a failed turn followed by a running
    // one: each turn's process control renders first, then the turn's work;
    // the failed turn has its error and its footer, and a queued message
    // follows the running turn. Each status line has to show below its turn's
    // work, above what follows.
    await onlyFor(['turn-status', 'switches', 'switches-off'], async function () {
      var chatSession = document.createElement('div')
      chatSession.setAttribute('data-conversation-session', 'smoke-session')
      chatSession.innerHTML = '<div data-chat-flow="" style="display:flex;flex-direction:column">' +
        '<div data-chat-flow-kind="user" data-chat-turn="1">first question</div>' +
        '<div data-chat-flow-kind="turn-process" data-chat-turn="1"><button type="button" data-turn-process="1" disabled>' +
        '<span class="_p_label_1">Failed</span></button></div>' +
        '<div data-chat-flow-kind="assistant-step" data-chat-turn="1">first work</div>' +
        '<div data-chat-flow-kind="turn-error" data-chat-turn="1">error</div>' +
        '<div data-chat-flow-kind="turn-tail" data-chat-turn="1">footer</div>' +
        '<div data-chat-flow-kind="user" data-chat-turn="2">second question</div>' +
        '<div data-chat-flow-kind="turn-process" data-chat-turn="2"><button type="button" data-turn-process="2" disabled>' +
        '<span class="_p_label_1">Deep diving for 1m 5s</span></button></div>' +
        '<div data-chat-flow-kind="assistant-step" data-chat-turn="2">second work</div>' +
        '<div class="_p_pending_1">queued</div></div>'
      document.body.appendChild(chatSession)
      await sleep(150)
      var chatRows = Array.prototype.slice.call(chatSession.querySelectorAll('[data-chat-flow] > *'))
      var statusButtons = chatSession.querySelectorAll('button[data-turn-process]')
      var seen = chatRows.slice().sort(function (a, b) { return a.getBoundingClientRect().top - b.getBoundingClientRect().top })
      var lineOf = function (button) {
        return {
          state: button.getAttribute('data-dsh-claude-turn-state'),
          text: button.getAttribute('data-dsh-claude-turn-status'),
          drawn: getComputedStyle(button, '::after').content,
          label: getComputedStyle(button.querySelector('span')).display,
          turning: getComputedStyle(button, '::before').animationName,
        }
      }
      r.turnStatus = {
        seen: seen.map(function (row) { return row.textContent }),
        failed: lineOf(statusButtons[0]),
        live: lineOf(statusButtons[1]),
      }
    })
    // The feature switches: each switched feature's own marks on the page,
    // read after a preference write and a pass. Off has to leave none of a
    // feature's marks (its teardown handed the surface back); on brings them
    // back, live, without touching the others.
    await onlyFor(['switches', 'switches-off'], async function () {
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
      await onlyFor(['switches'], async function () {
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
    // The conversation navigator: the host's turn rail, built the way ui-chat
    // renders it — a nav in its slot in the conversation's scroller, one mark
    // per turn carrying its list position, the reading position's mark
    // current, the marks inside a scroller whose content is count × 10 + 2
    // pixels tall — over chat rows that carry their turn. A press on the
    // host's mark is recorded, which is the whole of what the host's own jump
    // starts from. The skin's rail stands in the same slot.
    await onlyFor(['turn-nav'], async function () {
      var navPhase = document.createElement('div')
      navPhase.setAttribute('data-phase', 'active')
      var navMarks = ''
      for (var ni = 0; ni < 5; ni++) {
        navMarks += '<button type="button" data-index="' + ni + '"' + (ni === 4 ? ' aria-current="true"' : '') +
          ' style="position:absolute;left:0;right:0;height:10px;top:' + (1 + ni * 10) + 'px"></button>'
      }
      navPhase.innerHTML = '<div data-conversation-session="smoke-nav"><div data-conversation-scroll="" style="height:400px;overflow:auto">' +
        '<div class="_t_slot_1" style="position:relative;height:300px"><nav class="_t_frame_1" style="position:fixed;right:12px;top:100px;width:28px">' +
        '<div class="_t_scroller_1" style="position:relative;overflow:auto;max-height:200px"><div class="_t_marks_1" style="position:relative;height:52px">' + navMarks + '</div></div>' +
        '<div role="tooltip">host preview</div></nav></div>' +
        '<div data-chat-flow="" style="display:flex;flex-direction:column">' +
        '<div data-chat-flow-kind="user" data-chat-turn="4">fourth question</div>' +
        '<div data-chat-flow-kind="assistant-step" data-chat-turn="4">fourth answer</div>' +
        '<div data-chat-flow-kind="user" data-chat-turn="5">fifth question</div></div></div></div>'
      document.body.appendChild(navPhase)
      var navRail = navPhase.querySelector('nav')
      var navPresses = []
      navRail.addEventListener('click', function (event) {
        var mark = event.target.closest('button[data-index]')
        if (mark !== null) navPresses.push(Number(mark.dataset.index))
      })
      var pressKey = function (key, extra) {
        var event = new KeyboardEvent('keydown', Object.assign({ key: key, altKey: true, bubbles: true, cancelable: true }, extra || {}))
        document.body.dispatchEvent(event)
        return event.defaultPrevented
      }
      await sleep(150)
      var skinRail = navPhase.querySelector('.dsh-claude-turn-rail')
      var skinMarks = skinRail === null ? [] : Array.prototype.slice.call(skinRail.querySelectorAll('.dsh-claude-turn-rail-mark'))
      var skinCurrent = skinRail === null ? null : skinRail.querySelector('.dsh-claude-turn-rail-mark[data-current]')
      var navOut = {
        rail: {
          hostHidden: getComputedStyle(navRail).visibility,
          inSlot: skinRail !== null && skinRail.parentElement === navRail.parentElement,
          marks: skinMarks.length,
          unloaded: skinMarks.map(function (mark) { return mark.hasAttribute('data-unloaded') }),
          current: skinMarks.indexOf(skinCurrent),
        },
      }
      r.turnNav = navOut
      var skinRect = skinRail.getBoundingClientRect()
      var markTop = skinCurrent === null ? null : skinCurrent.getBoundingClientRect().top
      skinRail.dispatchEvent(new PointerEvent('pointerenter'))
      var navCard = document.querySelector('.dsh-claude-turn-nav')
      navOut.openAtOnce = navCard === null ? null : navCard.getAttribute('data-open')
      await sleep(250)
      var navRows = navCard === null ? [] : Array.prototype.slice.call(navCard.querySelectorAll('.dsh-claude-turn-nav-row'))
      var navCurrent = navCard === null ? null : navCard.querySelector('[data-current]')
      navOut.open = {
        open: navCard === null ? null : navCard.getAttribute('data-open'),
        // In the rail's slot, inside the conversation pane: a pointer on the card is on the pane.
        inSlot: navCard !== null && navCard.parentElement === navRail.parentElement,
        railMarked: skinRail.hasAttribute('data-dsh-claude-turn-nav-open'),
        marksFaded: getComputedStyle(skinRail.querySelector('.dsh-claude-turn-rail-track')).opacity,
        rows: navRows.map(function (row) { return row.textContent }),
        labels: navRows.map(function (row) { return row.getAttribute('aria-label') }),
        current: navCurrent === null ? null : navCurrent.dataset.index,
        rowGap: navCurrent === null || markTop === null ? null : Math.round(navCurrent.getBoundingClientRect().top - markTop),
        dashGap: navCurrent === null ? null : Math.round(navCurrent.querySelector('.dsh-claude-turn-nav-dash').getBoundingClientRect().right - skinRect.right),
      }
      navRows[3].click()
      await sleep(100)
      navOut.rowPress = navPresses.slice()
      var landed = document.querySelector('[data-dsh-claude-turn-nav-landed]')
      navOut.rowLanding = landed === null ? null : landed.textContent
      navCard.dispatchEvent(new MouseEvent('mouseleave'))
      await sleep(250)
      navOut.closed = { open: navCard.getAttribute('data-open'), railMarked: skinRail.hasAttribute('data-dsh-claude-turn-nav-open') }
      navPresses.length = 0
      navOut.keys = {
        // From the current mark (the fifth turn) one up is the fourth, whose rows are loaded.
        up: pressKey('ArrowUp'),
        // Pressed again at once: on from the turn the last key went to, not back from the reading position.
        upAgain: pressKey('ArrowUp'),
        shifted: pressKey('ArrowUp', { shiftKey: true }),
        bare: pressKey('ArrowUp', { altKey: false }),
      }
      await sleep(100)
      navOut.keys.presses = navPresses.slice()
      var landedByKey = document.querySelector('[data-dsh-claude-turn-nav-landed]')
      navOut.keys.landing = landedByKey === null ? null : landedByKey.textContent
      // A draft in the composer keeps the arrow keys.
      var navDraft = document.createElement('textarea')
      navDraft.value = 'draft'
      document.body.appendChild(navDraft)
      navOut.keys.draft = (function () {
        var event = new KeyboardEvent('keydown', { key: 'ArrowUp', altKey: true, bubbles: true, cancelable: true })
        navDraft.dispatchEvent(event)
        return event.defaultPrevented
      })()
      navDraft.remove()
      // The switch: off hands the host its rail back, on stands the skin's in again, live.
      var navSwitch = async function (on) {
        window.__pushForm({ turnNav: on })
        document.body.appendChild(document.createElement('i'))
        await sleep(300)
        return {
          rail: navPhase.querySelectorAll('.dsh-claude-turn-rail').length,
          hostReplaced: navRail.hasAttribute('data-dsh-claude-turn-nav-replaced'),
          hostShown: getComputedStyle(navRail).visibility,
        }
      }
      navOut.switchedOff = await navSwitch(false)
      navOut.switchedOn = await navSwitch(true)
      r.turnNav = navOut
    })
    // Following the host's colours and type: with the host's palette in the
    // page, the skin writes none of the host's tokens, paints none of the
    // host's frame, and its own surfaces read the host's tokens; a wallpaper
    // plugin's cleared canvas and glass then reach both. Back on Claude the
    // skin's own palette returns.
    await onlyFor(['host-palette'], async function () {
      var hostProbe = function (html) {
        var holder = document.createElement('div')
        holder.innerHTML = html
        document.body.appendChild(holder.firstChild)
        return document.body.lastChild
      }
      var hostNodes = {
        sidebar: hostProbe('<div data-pane="sidebar">s</div>'),
        conversation: hostProbe('<div data-pane="conversation">c</div>'),
        popover: hostProbe('<div class="dsh-claude-popover-card" data-open="true">p</div>'),
        search: hostProbe('<div class="dsh-claude-search-dialog">q</div>'),
        group: hostProbe('<span class="dsh-claude-model-group">g</span>'),
        heading: hostProbe('<h1>h</h1>'),
        code: hostProbe('<pre><code>c</code></pre>'),
      }
      var readHost = async function (patch, wallpaper) {
        if (patch !== null) window.__pushForm(patch)
        if (wallpaper) document.body.setAttribute('data-we-wallpaper', '')
        else document.body.removeAttribute('data-we-wallpaper')
        await sleep(120)
        var bodyStyle = getComputedStyle(document.body)
        return {
          base: bodyStyle.getPropertyValue('--dsw-alias-bg-base').trim(),
          family: bodyStyle.getPropertyValue('--dsw-font-family').trim(),
          body: bodyStyle.backgroundColor,
          html: getComputedStyle(document.documentElement).backgroundColor,
          sidebar: getComputedStyle(hostNodes.sidebar).backgroundColor,
          conversation: getComputedStyle(hostNodes.conversation).backgroundColor,
          popover: getComputedStyle(hostNodes.popover).backgroundColor,
          popoverBlur: getComputedStyle(hostNodes.popover).backdropFilter,
          // The account drawer the footer feature built (it sweeps any other copy).
          account: getComputedStyle(document.querySelector('.dsh-claude-account-popover')).backgroundColor,
          search: getComputedStyle(hostNodes.search).backgroundColor,
          group: getComputedStyle(hostNodes.group).backgroundColor,
          groupInk: getComputedStyle(hostNodes.group).color,
          heading: getComputedStyle(hostNodes.heading).fontFamily,
          code: getComputedStyle(hostNodes.code.firstChild).fontFamily,
        }
      }
      await sleep(300)
      r.hostPalette = {
        host: await readHost({ palette: 'host', typeface: 'host' }, false),
        wallpaper: await readHost(null, true),
        claude: await readHost({ palette: 'claude', typeface: 'claude' }, false),
      }
      for (var hostKey in hostNodes) hostNodes[hostKey].remove()
    })
    // The settings page, rendered through the stand-in React into a plain tree:
    // the tab strip, which rows each tab carries, and the sub-rows that grey
    // out while their parent is off. A tab is opened by standing the tab state
    // in for a click (the stand-in's `states`).
    await onlyFor(['settings'], async function () {
      var Section = (window.__slotComponents || {})['claude-style']
      var walk = function (node, visit) {
        if (node === null || node === undefined || typeof node !== 'object') return
        if (Array.isArray(node)) { node.forEach(function (child) { walk(child, visit) }); return }
        visit(node)
        walk(node.props && node.props.children, visit)
      }
      var renderTab = function (tabId) {
        var react = window.__react
        react.rendering = true
        react.states = tabId === 'general' ? null : { general: tabId }
        var tree = Section({})
        react.rendering = false
        react.states = null
        var out = { tabs: [], selected: null, rows: [], disabled: [] }
        walk(tree, function (node) {
          var props = node.props || {}
          if (props.role === 'tab') {
            out.tabs.push(props.key)
            if (props['aria-selected'] === 'true') out.selected = props.key
          }
          if (typeof props.className === 'string' && /(^| )dsh-claude-settings-row( |$)/.test(props.className)) {
            out.rows.push(props.key)
            if (props['data-disabled'] === '') out.disabled.push(props.key)
          }
        })
        return out
      }
      r.settings = { registered: typeof Section === 'function', pages: {} }
      if (r.settings.registered) {
        var tabIds = ['general', 'appearance', 'composer', 'sidebar', 'conversation']
        for (var ti = 0; ti < tabIds.length; ti++) r.settings.pages[tabIds[ti]] = renderTab(tabIds[ti])
        window.__pushForm({ modelPicker: false, mascot: 'off' })
        r.settings.parentsOff = { appearance: renderTab('appearance'), composer: renderTab('composer') }
        window.__pushForm({ modelPicker: true, mascot: 'brand' })
      }
    })
    // The DeepSeek brand, stored under its old name ("off"): the whale takes
    // the crab's place and the canvas turns sky white. On the home page it
    // stands on the card; on the conversation page it follows the session's
    // work from the top of the input area, and stands on the panel that takes
    // the card's place while the reader is asked for something.
    await onlyFor(['deepy', 'crab-states'], async function () {
      var mascotName = window.SMOKE_CASE === 'deepy' ? 'deepy' : 'crab'
      var driver = window.__deepy
      var whaleNow = function () {
        var node = document.querySelector('.dsh-claude-' + mascotName)
        if (node === null) return null
        // The frame is the strip's translation: read the computed matrix (a
        // running WAAPI animation has no inline style) as "Xpx Ypx".
        var strip = node.querySelector('.dsh-claude-' + mascotName + '-strip')
        var matrix = getComputedStyle(strip).transform
        var offsets = matrix === 'none' ? null : matrix.match(/matrix\([^,]+,[^,]+,[^,]+,[^,]+,\s*(-?[\d.]+),\s*(-?[\d.]+)\)/)
        return {
          animation: node.getAttribute('data-animation'),
          ready: node.hasAttribute('data-ready'),
          place: node.parentElement === null ? null : node.parentElement.getAttribute('data-dsh-claude-' + mascotName + '-anchor'),
          frame: offsets === null ? '0px 0px' : offsets[1] + 'px ' + offsets[2] + 'px',
          sheet: getComputedStyle(strip).backgroundImage,
        }
      }
      var wakeDeepyPass = function () {
        var node = document.createElement('span')
        document.body.appendChild(node)
        document.body.removeChild(node)
      }
      var bodyStyle = getComputedStyle(document.body)
      r.states = {
        brand: document.body.getAttribute('data-dsh-claude-brand'),
        canvas: bodyStyle.backgroundColor,
        accent: bodyStyle.getPropertyValue('--dsw-alias-brand-primary').trim(),
        link: bodyStyle.getPropertyValue('--dsw-alias-link').trim(),
      }
      // The dark palette, read with the host's dark marker set for a moment.
      document.body.setAttribute('data-ds-dark-theme', '')
      var darkStyle = getComputedStyle(document.body)
      r.states.dark = {
        canvas: darkStyle.backgroundColor,
        accent: darkStyle.getPropertyValue('--dsw-alias-brand-primary').trim(),
        raised: darkStyle.getPropertyValue('--dsh-claude-raised').trim(),
      }
      document.body.removeAttribute('data-ds-dark-theme')
      var deepyHero = document.createElement('div')
      deepyHero.setAttribute('data-phase', 'hero')
      document.body.appendChild(deepyHero)
      await sleep(500)
      r.states.home = whaleNow()
      r.states.crab = document.querySelector('.dsh-claude-crab') !== null
      // Frames change on the whale's own node, and no frame wakes a pass. The
      // caret motion's own frames are settled first (see the crab case).
      if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
      await sleep(250)
      var deepyPasses = window.__passes
      await sleep(600)
      r.states.idle = { before: r.states.home && r.states.home.frame, after: whaleNow().frame, passes: window.__passes - deepyPasses }
      if (mascotName === 'deepy') {
        // The motion choice holds the playing sheet's still frame: a looping
        // animation stops advancing, while a one-shot (the poke below) plays out.
        window.__pushForm({ motion: 'reduced' })
        await sleep(150)
        r.states.stillAttr = document.body.getAttribute('data-dsh-claude-motion')
        var whaleStill = whaleNow().frame
        await sleep(400)
        r.states.still = { before: whaleStill, after: whaleNow().frame }
        window.__pushForm({ motion: 'full' })
        await sleep(150)
        r.states.alwaysAttr = document.body.getAttribute('data-dsh-claude-motion')
      }
      // A click on its face pokes it.
      var hit = document.querySelector('.dsh-claude-' + mascotName + '-hit')
      var hitBox = hit.getBoundingClientRect()
      var press = { pointerId: 1, pointerType: 'mouse', isPrimary: true, button: 0, clientX: hitBox.left + 6, clientY: hitBox.top + hitBox.height / 2, bubbles: true }
      hit.dispatchEvent(new PointerEvent('pointerdown', Object.assign({ buttons: 1 }, press)))
      hit.dispatchEvent(new PointerEvent('pointerup', Object.assign({ buttons: 0 }, press)))
      await sleep(250)
      r.states.poke = whaleNow()
      if (mascotName === 'deepy') {
        // Two sheets are all this case asks for: the one it plays above, and the
        // one this state change switches to. It leaves with the page.
        deepyHero.remove()
        await sleep(200)
        r.states.gone = whaleNow() === null && document.querySelectorAll('[data-dsh-claude-deepy-anchor]').length === 0
        return
      }
      // The crab plays every state on the conversation page, and stands where
      // its scope puts it: the walk below is the crab case's alone.
      // The poke plays out (2s) before the page moves on.
      await sleep(1900)
      deepyHero.remove()
      // The conversation page: the host's composer seat, its chain wrapper and
      // the composer stack inside it.
      var deepyConversation = document.createElement('div')
      deepyConversation.setAttribute('data-phase', 'active')
      deepyConversation.innerHTML = '<div data-conversation-content data-conversation-session="smoke-deepy"><div data-composer-seat>' +
        '<div data-slot="conversation.composer" style="display:contents">' +
        '<div data-chain-overlay-fallback="conversation.composer" style="display:contents">' +
        '<div class="_x_composerStack_1"><div class="_x_inputBar_1">input</div></div></div></div></div></div>'
      document.body.appendChild(deepyConversation)
      // A pass moves the whale onto the conversation first: the home page reads
      // the whole workspace, where a running session is work.
      await sleep(200)
      driver.setStatus('smoke-deepy', { running: true })
      driver.setTurn('reasoning')
      wakeDeepyPass()
      await sleep(400)
      r.states.thinking = whaleNow()
      r.states.chatFollowed = driver.chatFollowed()
      driver.setTurn('text')
      wakeDeepyPass()
      await sleep(250)
      r.states.typing = whaleNow()
      // Two more sessions at work: the hard hat, once the typing whale has
      // held the stage for its second.
      driver.addSessions(['smoke-two', 'smoke-three'])
      driver.setStatus('smoke-two', { running: true })
      driver.setStatus('smoke-three', { running: true })
      await sleep(1300)
      r.states.building = whaleNow()
      // An approval: the host hides the composer and mounts its panel after it.
      var fallback = deepyConversation.querySelector('[data-chain-overlay-fallback]')
      var panel = document.createElement('div')
      panel.setAttribute('data-approval-key', 'smoke')
      panel.textContent = 'approve?'
      fallback.style.display = 'none'
      fallback.parentElement.appendChild(panel)
      driver.setStatus('smoke-deepy', { running: true, pendingInteraction: { kind: 'approval', key: 'smoke' } })
      await sleep(400)
      r.states.notification = whaleNow()
      // Answered and finished; a compaction starts, then ends.
      panel.remove()
      fallback.style.display = 'contents'
      driver.setTurn(null)
      driver.setStatus('smoke-deepy', { running: false })
      driver.setStatus('smoke-two', { running: false })
      driver.setStatus('smoke-three', { running: false })
      driver.emit({ type: 'compaction/start', seq: 1, time: Date.now(), data: { compactionId: 'c1', turn: null } })
      wakeDeepyPass()
      // Each state holds the stage for a second against a lesser one.
      await sleep(1100)
      r.states.compacting = whaleNow()
      await sleep(100)
      driver.emit({ type: 'compaction/end', seq: 2, time: Date.now(), data: { compactionId: 'c1', turn: null } })
      // The celebration's sheet converts on its first use (one of the biggest
      // sheets); the switch holds the current animation until the vector is
      // ready, so wait it out instead of landing on a fixed delay.
      for (var ci = 0; ci < 60 && (whaleNow() || {}).animation !== 'happy'; ci++) await sleep(50)
      r.states.celebrating = whaleNow()
      driver.emit({ type: 'tool/result', seq: 3, time: Date.now(), data: { turn: 2, step: 1, message: { isError: true } } })
      await sleep(400)
      r.states.failed = whaleNow()
      // Reduced motion: the settings page's animation choice, pushed through the
      // host form the way the settings row writes it. The choice resolves onto
      // <body> (src/core/prefs.ts) and the whale holds the state's still frame.
      window.__pushForm({ motion: 'reduced' })
      await sleep(150)
      r.states.stillAttr = document.body.getAttribute('data-dsh-claude-motion')
      var stillBefore = whaleNow().frame
      await sleep(400)
      r.states.still = { before: stillBefore, after: whaleNow().frame }
      window.__pushForm({ motion: 'full' })
      await sleep(150)
      r.states.alwaysAttr = document.body.getAttribute('data-dsh-claude-motion')
      // A compaction starts; the connection drops and the feed comes back
      // whole with the compaction's end in it. The shake above holds 4.8s.
      driver.emit({ type: 'compaction/start', seq: 4, time: Date.now(), data: { compactionId: 'c2', turn: null } })
      await sleep(4200)
      r.states.resendBefore = whaleNow()
      driver.resend([{ type: 'compaction/end', seq: 5, time: Date.now(), data: { compactionId: 'c2', turn: null } }])
      await sleep(1200)
      r.states.resent = whaleNow()
      // The quiet minute to sleep, with the page's clock moved ahead: a minute
      // of work is no quiet spell, a minute idle is, and a pointer move wakes it.
      var deepyClock = Date.now
      var deepyAhead = 0
      Date.now = function () { return deepyClock.call(Date) + deepyAhead }
      driver.setStatus('smoke-deepy', { running: true })
      driver.setTurn('text')
      await sleep(300)
      deepyAhead += 61000
      await sleep(200)
      driver.setTurn(null)
      driver.setStatus('smoke-deepy', { running: false })
      await sleep(1200)
      r.states.afterWork = whaleNow()
      deepyAhead += 61000
      // The probe's clock is fake while setTimeout runs on the real one: wake a
      // pass to stand in for the sleep deadline the whale's timer would fire.
      wakeDeepyPass()
      await sleep(400)
      r.states.asleep = whaleNow()
      // Asleep for its second on stage first, as any state holds it.
      await sleep(700)
      document.dispatchEvent(new PointerEvent('pointermove', { bubbles: true }))
      await sleep(400)
      for (var wi = 0; wi < 60 && (whaleNow() || {}).animation !== 'waking'; wi++) await sleep(50)
      r.states.woken = whaleNow()
      Date.now = deepyClock
      deepyConversation.remove()
      await sleep(200)
      r.states.gone = whaleNow() === null && document.querySelectorAll('[data-dsh-claude-' + mascotName + '-anchor]').length === 0
      if (mascotName === 'crab') {
        // Where it appears: kept to the home page, the crab stays off the
        // conversation; with the mascot off it leaves the home card as well.
        document.body.appendChild(deepyConversation)
        await sleep(300)
        r.states.backInConversation = whaleNow() !== null
        window.__pushForm({ mascotScope: 'home' })
        await sleep(300)
        r.states.homeOnly = whaleNow()
        deepyConversation.remove()
        var scopeHero = document.createElement('div')
        scopeHero.setAttribute('data-phase', 'hero')
        document.body.appendChild(scopeHero)
        await sleep(300)
        r.states.homeOnlyHero = whaleNow()
        window.__pushForm({ mascot: 'off' })
        await sleep(300)
        r.states.off = whaleNow()
        window.__pushForm({ mascot: 'deepy' })
        await sleep(300)
        r.states.deepyPicked = document.querySelector('.dsh-claude-deepy') !== null && document.querySelector('.dsh-claude-crab') === null
        window.__pushForm({ mascot: 'crab', mascotScope: 'all' })
        scopeHero.remove()
        await sleep(200)
      }
    })
    // The ported chat-follow feature (src/features/chat-follow/): a structural
    // moment hands the host's follow back, and a reader who took the scroll
    // over himself is left where he is.
    await onlyFor(['chat-follow'], async function () {
      var followScroller = document.querySelector('[data-conversation-scroll]')
      var followColumn = document.querySelector('[data-chat-flow]')
      var cappedBody = document.querySelector('[data-step-process]:not([data-group-expanded-mode]) [data-step-process-body]')
      var expandedBody = document.querySelector('[data-step-process][data-group-expanded-mode] [data-step-process-body]')
      var endGap = function () {
        return Math.round(followScroller.scrollHeight - followScroller.clientHeight - followScroller.scrollTop)
      }
      var structuralMoment = async function () {
        var node = document.createElement('div')
        node.setAttribute('data-chat-flow-key', 'probe')
        node.style.display = 'none'
        followColumn.appendChild(node)
        await sleep(250)
        followColumn.removeChild(node)
        await sleep(50)
      }
      r.chatFollow = {
        marked: document.body.hasAttribute('data-dsh-claude-chat-follow'),
        overflowX: cappedBody === null ? null : getComputedStyle(cappedBody).overflowX,
        expandedOverflowX: expandedBody === null ? null : getComputedStyle(expandedBody).overflowX,
      }
      // At the end, so any reader-took-over the guard is holding is dropped.
      followScroller.scrollTop = followScroller.scrollHeight
      await sleep(80)
      await structuralMoment()
      // 60px off the end, the way a structural moment leaves it.
      followScroller.scrollTop = Math.max(0, followScroller.scrollHeight - followScroller.clientHeight - 60)
      await sleep(30)
      r.chatFollow.before = endGap()
      await structuralMoment()
      r.chatFollow.after = endGap()
      // A wheel of the reader's own: the hand-back stops until he returns.
      followScroller.dispatchEvent(new WheelEvent('wheel', { bubbles: true }))
      followScroller.scrollTop = Math.max(0, followScroller.scrollHeight - followScroller.clientHeight - 60)
      await sleep(30)
      r.chatFollow.readerBefore = endGap()
      await structuralMoment()
      r.chatFollow.readerAfter = endGap()
      // The capped body's catch-up is walked in on a curve, not written in one
      // frame (scroll-ease.ts): grow the content well past the catch-up
      // threshold and sample what is left to go at three moments.
      if (cappedBody !== null) {
        var cappedContent = cappedBody.querySelector('[data-step-process-content]')
        var bodyGap = function () {
          return Math.round(cappedBody.scrollHeight - cappedBody.clientHeight - cappedBody.scrollTop)
        }
        cappedBody.scrollTop = 0
        await sleep(80)
        if (cappedContent !== null) cappedContent.style.height = '900px'
        await sleep(25)
        r.chatFollow.catchUpEarly = bodyGap()
        await sleep(110)
        r.chatFollow.catchUpMid = bodyGap()
        // A burst this size glides at the capped speed, so it takes about half a
        // second to arrive; the quiet stretch between bursts is what that fits in.
        await sleep(900)
        r.chatFollow.catchUpDone = bodyGap()
        await sleep(600)
        // Held at the end: the ease ended there rather than being left running.
        r.chatFollow.catchUpLate = bodyGap()
      }
      // The stream glide (chat-follow.ts): with the host's own streaming mark on
      // the page, the end the host's follow pins the position to is taken back
      // before the frame paints and handed to the spring, so the text walks there
      // instead of jumping. The mark is the host's; the pin is what its follow
      // does on every content change.
      followScroller.scrollTop = followScroller.scrollHeight
      await sleep(100)
      var streamingMark = document.createElement('div')
      streamingMark.setAttribute('data-streaming', '')
      followColumn.appendChild(streamingMark)
      var glideBlock = document.createElement('div')
      glideBlock.style.height = '300px'
      followColumn.appendChild(glideBlock)
      followScroller.scrollTop = followScroller.scrollHeight
      await sleep(30)
      r.chatFollow.glideEarly = endGap()
      r.chatFollow.glideDiag = {
        motion: document.body.getAttribute('data-dsh-claude-motion'),
        streamMark: document.querySelector('[data-streaming]') !== null,
        rolling: document.querySelector('[data-dsh-claude-rolling]') !== null,
        buttonMarked: document.querySelector('[data-dsh-claude-stream-glide]') !== null,
        followAttr: document.querySelector('[data-chat-following-tail]') !== null,
      }
      await sleep(120)
      r.chatFollow.glideMid = endGap()
      await sleep(900)
      r.chatFollow.glideDone = endGap()
      // The host's own button is kept out of sight while the glide follows: a
      // position held off the end reads to the host as a reader who left.
      r.chatFollow.glideButtonMarked = document.querySelector('[data-dsh-claude-stream-glide]') !== null
      // A message the reader has just sent is not streaming content: the host's
      // jump to it stands, and the glide stands down around it. The streaming
      // mark is still on the page here, so without the stand-down the glide
      // would take this jump back like any other.
      var userRow = document.createElement('div')
      userRow.setAttribute('data-chat-flow-key', 'sent')
      userRow.setAttribute('data-chat-flow-kind', 'user')
      userRow.style.height = '300px'
      followColumn.appendChild(userRow)
      followScroller.scrollTop = followScroller.scrollHeight
      await sleep(60)
      r.chatFollow.submitGap = endGap()
      await sleep(200)
      r.chatFollow.submitGapLate = endGap()
      userRow.remove()
      await sleep(60)
      streamingMark.remove()
      glideBlock.remove()
      await sleep(120)
      followScroller.scrollTop = followScroller.scrollHeight
      await sleep(200)
      r.chatFollow.glideButtonBack = document.querySelector('[data-dsh-claude-stream-glide]') === null
    })
    // The ported caret motion (src/features/caret/): the focused composer
    // surface gets a drawn caret and the native one gives way; switching the
    // feature off takes both away and gives the native one back.
    await onlyFor(['caret'], async function () {
      var caretEditor = document.querySelector('[data-composer-input]')
      var caretOf = function () {
        var layer = document.querySelector('[data-dsh-claude-caret-layer]')
        return {
          layer: layer !== null,
          visible: layer !== null && layer.hasAttribute('data-dsh-claude-caret-visible'),
          transform: layer === null ? null : layer.style.transform,
          marked: caretEditor.hasAttribute('data-dsh-claude-caret'),
          nativeHidden: getComputedStyle(caretEditor).caretColor === 'rgba(0, 0, 0, 0)',
        }
      }
      var caretSelect = function () {
        caretEditor.focus()
        var text = caretEditor.firstChild
        if (text !== null && text.nodeType === 3) {
          var selection = document.getSelection()
          selection.removeAllRanges()
          var range = document.createRange()
          range.setStart(text, text.data.length)
          range.collapse(true)
          selection.addRange(range)
        }
        document.dispatchEvent(new Event('selectionchange'))
      }
      caretSelect()
      await sleep(250)
      r.caret = { on: caretOf() }
      // The plain surface: a textarea under the seat is measured through the
      // hidden mirror, and taken over the same way.
      var answer = document.getElementById('debugAnswer')
      if (answer !== null) {
        answer.focus()
        answer.selectionStart = answer.value.length
        answer.selectionEnd = answer.value.length
        document.dispatchEvent(new Event('selectionchange'))
        await sleep(250)
        var answerLayer = answer.parentElement.querySelector('[data-dsh-claude-caret-layer]')
        r.caret.plain = {
          layer: answerLayer !== null,
          marked: answer.hasAttribute('data-dsh-claude-caret'),
          visible: answerLayer !== null && answerLayer.hasAttribute('data-dsh-claude-caret-visible'),
          nativeHidden: getComputedStyle(answer).caretColor === 'rgba(0, 0, 0, 0)',
        }
        caretSelect()
        await sleep(250)
      }
      window.__pushForm({ caretMotion: 'off' })
      await sleep(250)
      r.caret.off = caretOf()
      window.__pushForm({ caretMotion: 'typing' })
      await sleep(250)
      r.caret.back = caretOf()
      // The animation choice stills the drawn caret through its own stylesheet
      // rule (caret.css), which is what D26's resolved attribute is for.
      window.__pushForm({ motion: 'reduced' })
      await sleep(250)
      var reducedLayer = document.querySelector('[data-dsh-claude-caret-layer]')
      r.caret.reduced = reducedLayer === null ? null : {
        layer: true,
        transition: getComputedStyle(reducedLayer).transitionDuration,
        animation: getComputedStyle(reducedLayer).animationName,
      }
      window.__pushForm({ motion: 'system' })
      await sleep(250)
    })
    // The ported automatic folding (src/features/chat-fold/): a running thinking
    // row and a running process group are opened at install, both fold back when
    // their section ends, a tier that does not cap its body is never pressed, and
    // a group the reader opened himself in that phase stays open.
    await onlyFor(['chat-fold'], async function () {
      var foldThink = document.getElementById('debugThink')
      var foldGroup = document.getElementById('debugGroup')
      var foldHeader = document.getElementById('debugGroupHeader')
      var foldBody = document.getElementById('debugGroupBody')
      var foldExpandedBody = document.getElementById('debugExpandedBody')
      await sleep(350)
      r.fold = {
        thinkOpen: foldThink.hasAttribute('data-expanded'),
        groupOpen: !foldBody.hasAttribute('hidden'),
        openMark: foldGroup.hasAttribute('data-dsh-claude-open'),
        liveDetail: foldGroup.hasAttribute('data-dsh-claude-live-detail'),
        label: foldHeader.getAttribute('data-dsh-claude-label'),
        labelName: foldHeader.getAttribute('aria-label'),
        spread: foldHeader.style.getPropertyValue('--dsh-claude-label-spread'),
        expandedUntouched: !foldExpandedBody.hasAttribute('hidden'),
        clicks: Object.assign({}, window.__foldClicks),
      }
      // The reasoning stops and the process section ends: both fold back.
      foldThink.setAttribute('data-state', 'ok')
      var foldShimmer = foldHeader.querySelector('[data-shimmer]')
      if (foldShimmer !== null) foldShimmer.parentNode.removeChild(foldShimmer)
      // The host drops the live detail with the shimmer: what is left is the label
      // alone, with no separator in it.
      var foldText = foldHeader.textContent
      var foldCut = foldText.indexOf(' · ')
      if (foldCut >= 0) foldHeader.textContent = foldText.slice(0, foldCut)
      await sleep(450)
      r.fold.after = {
        thinkOpen: foldThink.hasAttribute('data-expanded'),
        groupOpen: !foldBody.hasAttribute('hidden'),
        openMark: foldGroup.hasAttribute('data-dsh-claude-open'),
        liveDetail: foldGroup.hasAttribute('data-dsh-claude-live-detail'),
        clicks: Object.assign({}, window.__foldClicks),
      }
      // The fold glide on the reader's own press: the click is intercepted, the
      // real element is pressed with the door marked, and the click is handed back
      // afterwards so the host collapses it.
      var disclosure = document.getElementById('debugDisclosure')
      var disclosureBody = function () { return document.getElementById('debugDisclosureBody') }
      var disclosureBefore = window.__disclosureClicks
      disclosure.click()
      await sleep(60)
      var rollingBody = disclosureBody()
      r.fold.glide = {
        rolling: rollingBody !== null && rollingBody.hasAttribute('data-dsh-claude-rolling'),
        clipped: rollingBody !== null && rollingBody.style.overflow === 'hidden',
        clicksDuringRoll: window.__disclosureClicks - disclosureBefore,
      }
      await sleep(500)
      r.fold.glide.after = {
        bodyGone: disclosureBody() === null,
        rollingAnywhere: document.querySelector('[data-dsh-claude-rolling]') !== null,
        clicks: window.__disclosureClicks - disclosureBefore,
      }
      // The opening direction: the press is remembered as an intent, the host
      // inserts the body, and the door rolls it open.
      disclosure.click()
      await sleep(80)
      var openingBody = disclosureBody()
      r.fold.glide.open = {
        inserted: openingBody !== null,
        rolling: openingBody !== null && openingBody.hasAttribute('data-dsh-claude-rolling'),
      }
      await sleep(450)
      var settledBody = disclosureBody()
      r.fold.glide.openAfter = {
        present: settledBody !== null,
        rolling: settledBody !== null && settledBody.hasAttribute('data-dsh-claude-rolling'),
      }
      // The reader's own press in this phase: the module leaves it alone.
      foldHeader.click()
      await sleep(350)
      r.fold.readerOpen = !foldBody.hasAttribute('hidden')
      // The switch covers the door and the entrance fade as well as the automatic
      // folding: off, a press reaches the host's own handler in the same turn and
      // an inserted body carries no transition (fold-motion.css rides
      // data-dsh-claude-chat-fold).
      var foldFlow = document.getElementById('debugFlow')
      var entranceOf = function () {
        var row = document.createElement('button')
        row.setAttribute('type', 'button')
        row.setAttribute('data-disclosure-row', '')
        var body = document.createElement('div')
        body.textContent = 'probe body'
        foldFlow.appendChild(row)
        foldFlow.appendChild(body)
        var value = getComputedStyle(body).transitionDuration
        row.remove()
        body.remove()
        return value
      }
      r.fold.entranceOn = entranceOf()
      window.__pushForm({ chatAnimations: false })
      await sleep(200)
      var offBefore = window.__disclosureClicks
      disclosure.click()
      var offImmediate = window.__disclosureClicks - offBefore
      await sleep(300)
      r.fold.animationsOff = {
        mark: document.body.hasAttribute('data-dsh-claude-chat-fold'),
        entrance: entranceOf(),
        immediateClicks: offImmediate,
        rolling: document.querySelector('[data-dsh-claude-rolling]') !== null,
      }
      window.__pushForm({ chatAnimations: true })
      await sleep(200)
      r.fold.animationsBack = { mark: document.body.hasAttribute('data-dsh-claude-chat-fold') }
    })
    // The ported token reveal (src/features/chat-reveal/): characters arriving in
    // a streaming container are registered as named highlights from the faintest
    // step, they are gone once faded, and the preference withdraws the engine
    // whole.
    await onlyFor(['chat-reveal'], async function () {
      var revealPeek = function () {
        var registry = window.CSS ? window.CSS.highlights : null
        var total = 0
        var steps = 0
        if (registry) {
          for (var step = 0; step < 24; step += 1) {
            var found = registry.get('dsh-claude-tok-' + step)
            var size = found ? found.size : 0
            total += size
            if (size > 0) steps += 1
          }
        }
        return { total: total, steps: steps, mark: document.body.hasAttribute('data-dsh-claude-chat-reveal') }
      }
      var revealContainer = document.createElement('div')
      revealContainer.setAttribute('data-streaming', '')
      revealContainer.textContent = 'Hello there'
      document.body.appendChild(revealContainer)
      await sleep(80)
      var revealOpening = revealPeek()
      revealContainer.firstChild.data = 'Hello there, more'
      await sleep(80)
      var revealGrown = revealPeek()
      await sleep(450)
      var revealSettled = revealPeek()
      window.__pushForm({ chatAnimations: false })
      await sleep(150)
      var revealOff = revealPeek()
      window.__pushForm({ chatAnimations: true })
      await sleep(150)
      var revealBack = revealPeek()
      // The animation choice: "reduced" withdraws the engine the same way the
      // preference does (D26 — the resolved choice, not the system query).
      window.__pushForm({ motion: 'reduced' })
      await sleep(150)
      var revealReduced = revealPeek()
      window.__pushForm({ motion: 'system' })
      await sleep(150)
      // And the system setting flipping underneath "follow the system": the
      // resolved attribute moves, the preference stream is re-run and a running
      // engine goes with it (src/core/prefs.ts, refreshMotionAttribute).
      window.__setSystemReduced(true)
      await sleep(250)
      var revealFlipReduced = revealPeek()
      window.__setSystemReduced(false)
      await sleep(250)
      var revealFlipBack = revealPeek()
      revealContainer.remove()
      r.reveal = {
        opening: revealOpening, grown: revealGrown, settled: revealSettled, off: revealOff, back: revealBack,
        reduced: revealReduced, systemFlip: { reduced: revealFlipReduced, back: revealFlipBack },
      }
    })
    // The ported file-change row (src/features/chat-files/): the two keyed seats
    // are claimed from the tool view slot, and one row renders its collapsed tail
    // and its expanded card from the call's own arguments and metadata.
    await onlyFor(['chat-files'], async function () {
      var slotEntries = (window.__slots || []).filter(function (entry) { return entry.key === 'tool.call.toolview' })
      var fileRow = (window.__slotComponents || {}).edit
      var t = function (key) { return 't:' + key }
      var walkTree = function (node, visit) {
        if (typeof node === 'string' || typeof node === 'number') { visit({ type: '#text', props: { children: String(node) } }); return }
        if (node === null || node === undefined || typeof node !== 'object') return
        if (Array.isArray(node)) { node.forEach(function (child) { walkTree(child, visit) }); return }
        visit(node)
        walkTree(node.props && node.props.children, visit)
        // The disclosure row hands its collapsed half to the primitive as a prop,
        // and the stand-in's primitive does not render it: the probe walks it here.
        walkTree(node.props && node.props.collapsedContent, visit)
      }
      var renderRow = function (toolName, block, options) {
        var state = { expanded: !!(options && options.expanded) }
        var react = window.__react
        react.rendering = true
        var tree
        try {
          tree = fileRow({
            t: t,
            toolName: toolName,
            block: block,
            cwd: 'C:\\work',
            home: 'C:\\Users\\dev',
            openFile: function () { window.__fileRowOpened = (window.__fileRowOpened || 0) + 1 },
            inspect: options && options.inspect ? function () {} : undefined,
            useDisclosure: function () { return { expanded: state.expanded, toggle: function () {} } },
          })
        } finally {
          react.rendering = false
        }
        var out = { classes: [], texts: [], root: null, diff: null, io: null, hidden: null, hiddenText: null }
        walkTree(tree, function (node) {
          var props = node.props || {}
          if (typeof props.className === 'string') {
            out.classes.push(props.className)
            if (props.className.indexOf('dsh-claude-file-root') >= 0) {
              out.root = { variant: props['data-variant'], tool: props['data-tool'], state: props['data-state'] }
            }
            if (props.className.indexOf('dsh-claude-file-summary') >= 0 || props.className.indexOf('dsh-claude-file-link') >= 0) out.summary = props.className
            if (props.className.indexOf('dsh-claude-file-diff') >= 0) out.diff = props
            if (props.className.indexOf('dsh-claude-file-io ') >= 0 || props.className === 'dsh-claude-file-io') out.io = props
            if (props.className.indexOf('dsh-claude-file-hidden') >= 0) {
              out.hidden = props
              out.hiddenText = Array.isArray(props.children) ? props.children[0] : props.children
            }
          }
          if (node.type === 'DisclosureRow') out.disclosure = props
          if (node.type === 'DiffBlock') out.diff = props
          if (node.type === '#text') out.texts.push(String(props.children))
        })
        return out
      }
      var argsRaw = JSON.stringify({ file_path: 'C:\\work\\app.js', old_string: 'const a = 1', new_string: 'const a = 2' })
      var settled = {
        kind: 'tool-result', callId: 'c1',
        call: { name: 'edit', argsRaw: argsRaw },
        content: [{ type: 'text', text: 'ok' }],
        isError: false,
        meta: { diffs: [{ path: 'C:\\work\\app.js', oldText: 'const a = 1', newText: 'const a = 2' }] },
      }
      r.files = { seats: slotEntries }
      r.files.collapsed = renderRow('edit', settled, {})
      r.files.expanded = renderRow('edit', settled, { expanded: true, inspect: true })
      // A failure: no diff, the summary holds the verdict, and the path link gives way.
      var failed = {
        kind: 'tool-result', callId: 'c2',
        call: { name: 'edit', argsRaw: argsRaw },
        content: [],
        isError: true,
        error: { name: 'ToolError', code: 'permission_denied' },
        meta: { diffs: [] },
      }
      r.files.failed = renderRow('edit', failed, { expanded: true })
      // A write whose escalation pair is incomplete: the host falls back to the IN/OUT card.
      var write = {
        phase: 'start', callId: 'c3', name: 'write',
        argsRaw: JSON.stringify({ file_path: 'C:\\work\\note.md', content: 'hello\nworld', sandbox_permissions: 'workspace-write', justification: 'x' }),
      }
      r.files.running = renderRow('write', write, { expanded: true })
      var escalated = {
        phase: 'start', callId: 'c4', name: 'write',
        argsRaw: JSON.stringify({ file_path: 'C:\\work\\note.md', content: 'hello', justification: 'why' }),
      }
      r.files.escalated = renderRow('write', escalated, { expanded: true })
      // The switch comes down whole: this feature takes the host's two seat keys
      // over, and a key cannot be handed back by reading a preference, so off
      // has to unregister them (D29/D32).
      window.__pushForm({ chatAnimations: false })
      await sleep(150)
      r.files.offSeats = (window.__slots || []).filter(function (entry) { return entry.key === 'tool.call.toolview' }).length
      window.__pushForm({ chatAnimations: true })
      await sleep(150)
      r.files.backSeats = (window.__slots || []).filter(function (entry) { return entry.key === 'tool.call.toolview' }).length
      // The other chat-behaviour plugin arriving and leaving while the page
      // runs: the presence watch re-takes the decision, so the chat-area features
      // stand down (here: the seat keys and the install-time marks) and come
      // back without a reload (src/shared/peer-plugin.ts).
      var fileSeats = function () {
        return (window.__slots || []).filter(function (entry) { return entry.key === 'tool.call.toolview' }).length
      }
      var filePeerStyle = document.createElement('style')
      filePeerStyle.id = 'dsh-chat-ux-style'
      document.head.appendChild(filePeerStyle)
      await sleep(250)
      r.files.peerOn = {
        seats: fileSeats(),
        foldMark: document.body.hasAttribute('data-dsh-claude-chat-fold'),
        revealMark: document.body.hasAttribute('data-dsh-claude-chat-reveal'),
      }
      filePeerStyle.remove()
      await sleep(250)
      r.files.peerOff = { seats: fileSeats(), foldMark: document.body.hasAttribute('data-dsh-claude-chat-fold') }
    })
    // The ported send flight (src/features/chat-send/): a submission lifts a
    // stand-in off the composer card, hides the real row while it flies, and puts
    // everything back when it lands.
    await onlyFor(['chat-send'], async function () {
      var sendInput = document.getElementById('editor')
      var sendFlow = document.createElement('div')
      sendFlow.setAttribute('data-chat-flow', '')
      sendFlow.id = 'sendFlow'
      sendFlow.style.cssText = 'display:block;min-height:120px'
      // Right above the composer card, so both ends of the flight are on one screen.
      var sendCard = document.querySelector('[data-composer-card]')
      if (sendCard !== null && sendCard.parentElement !== null) sendCard.parentElement.insertBefore(sendFlow, sendCard)
      else document.body.insertBefore(sendFlow, document.body.firstChild)
      r.send = { inputFound: sendInput !== null }
      // The reader presses Enter in the draft: that is where the origin is taken.
      if (sendInput !== null) sendInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }))
      await sleep(60)
      // The host mounts the echo bubble the moment the submission goes through.
      var sendEcho = document.createElement('div')
      sendEcho.setAttribute('data-submission-echo', '')
      sendEcho.innerHTML = '<div style="width:220px;height:44px;background:rgb(240,240,240);border-radius:18px;padding:8px 12px;font-size:15px;line-height:24px">hello world</div>'
      sendFlow.appendChild(sendEcho)
      await sleep(90)
      var sendGhost = document.querySelector('[data-dsh-claude-send-ghost]')
      r.send.flying = {
        ghost: sendGhost !== null,
        clone: sendGhost !== null && sendGhost.querySelector('[data-composer-card]') !== null,
        hidden: sendEcho.hasAttribute('data-dsh-claude-send-flight'),
        visibility: getComputedStyle(sendEcho).visibility,
        animations: sendGhost === null ? 0 : sendGhost.getAnimations({ subtree: true }).length,
      }
      await sleep(700)
      r.send.landed = {
        ghost: document.querySelector('[data-dsh-claude-send-ghost]') !== null,
        hidden: sendEcho.hasAttribute('data-dsh-claude-send-flight'),
        visibility: getComputedStyle(sendEcho).visibility,
      }
      sendEcho.remove()
      // The animation choice: with "reduced" in force the origin is not even
      // measured, so no stand-in goes up and the echo stays visible (D26 — the
      // resolved choice, read at each submission).
      window.__pushForm({ motion: 'reduced' })
      await sleep(150)
      if (sendInput !== null) sendInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }))
      await sleep(60)
      var reducedEcho = document.createElement('div')
      reducedEcho.setAttribute('data-submission-echo', '')
      reducedEcho.innerHTML = '<div style="width:220px;height:44px;background:rgb(240,240,240);border-radius:18px;padding:8px 12px">hello again</div>'
      sendFlow.appendChild(reducedEcho)
      await sleep(120)
      r.send.reduced = {
        ghost: document.querySelector('[data-dsh-claude-send-ghost]') !== null,
        hidden: reducedEcho.hasAttribute('data-dsh-claude-send-flight'),
        visibility: getComputedStyle(reducedEcho).visibility,
      }
      reducedEcho.remove()
      window.__pushForm({ motion: 'system' })
      await sleep(150)
      sendFlow.remove()
    })
    // The other chat-behaviour plugin installed (src/shared/peer-plugin.ts): the
    // ported features stand down whole, and the settings page shows their
    // switches off and disabled with the reason.
    await onlyFor(['peer-chat-ux'], async function () {
      var peerHighlights = function () {
        var registry = window.CSS && window.CSS.highlights
        if (!registry) return 0
        var count = 0
        for (var step = 0; step < 24; step++) if (registry.has('dsh-claude-tok-' + step)) count += 1
        return count
      }
      // A chat area and a focused composer: live features would mark, fold or
      // draw on them within a pass or two.
      var peerChat = document.createElement('div')
      peerChat.innerHTML = '<div data-chat-flow><div data-streaming><p>streaming text</p></div>' +
        '<div data-variant="think" data-state="running"><button type="button">Thinking</button></div>' +
        '<div data-step-process><button type="button" data-process-activity><span data-shimmer>Working</span></button>' +
        '<div data-step-process-body hidden="until-found"><div data-step-process-content>x</div></div></div></div>'
      document.body.appendChild(peerChat)
      var peerEditor = document.querySelector('[data-composer-input]')
      if (peerEditor !== null) {
        peerEditor.focus()
        document.dispatchEvent(new Event('selectionchange'))
      }
      await sleep(300)
      r.peer = {
        marks: {
          follow: document.body.hasAttribute('data-dsh-claude-chat-follow'),
          fold: document.body.hasAttribute('data-dsh-claude-chat-fold'),
          reveal: document.body.hasAttribute('data-dsh-claude-chat-reveal'),
          caretLayer: document.querySelector('[data-dsh-claude-caret-layer]') !== null,
          caretMark: peerEditor !== null && peerEditor.hasAttribute('data-dsh-claude-caret'),
        },
        seats: (window.__slots || []).filter(function (entry) { return entry.key === 'tool.call.toolview' }).length,
        highlights: peerHighlights(),
        thinkExpanded: document.querySelector('[data-variant="think"]').hasAttribute('data-expanded'),
        groupOpen: !document.querySelector('[data-step-process-body]').hasAttribute('hidden'),
      }
      // The settings page, through the same React-tree walk the settings case
      // uses: the Conversation tab's rows, which of them refuse input, which
      // carry the line naming the owner, and what answer each control shows.
      var PeerSection = (window.__slotComponents || {})['claude-style']
      var peerWalk = function (node, visit) {
        if (node === null || node === undefined || typeof node !== 'object') return
        if (Array.isArray(node)) { node.forEach(function (child) { peerWalk(child, visit) }); return }
        visit(node)
        peerWalk(node.props && node.props.children, visit)
      }
      var peerTexts = function (node, out) {
        if (typeof node === 'string') { out.push(node); return }
        if (node === null || node === undefined || typeof node !== 'object') return
        if (Array.isArray(node)) { node.forEach(function (child) { peerTexts(child, out) }); return }
        peerTexts(node.props && node.props.children, out)
      }
      var peerDisabled = function (node) {
        var found = false
        peerWalk(node, function (child) { if ((child.props || {}).disabled === true) found = true })
        return found
      }
      var peerManages = function (node) {
        var found = false
        peerWalk(node, function (child) {
          var className = (child.props || {}).className
          if (typeof className === 'string' && className.split(' ').indexOf('dsh-claude-settings-row-managed') >= 0) found = true
        })
        return found
      }
      // What the row's control shows: a switch's state, or the pressed option of
      // a segmented control. The reader's own stored answer, not a forced off.
      var peerAnswer = function (node) {
        var answer = { on: false, option: null }
        peerWalk(node, function (child) {
          var props = child.props || {}
          if (props['data-on'] === '') answer.on = true
          if (props['aria-pressed'] === 'true') answer.option = props.key
        })
        return answer
      }
      r.peer.settings = { registered: typeof PeerSection === 'function', rows: [], refusing: [], managed: [], answers: {}, texts: [] }
      if (r.peer.settings.registered) {
        var peerReact = window.__react
        peerReact.rendering = true
        peerReact.states = { general: 'conversation' }
        var peerTree = PeerSection({})
        peerReact.rendering = false
        peerReact.states = null
        peerWalk(peerTree, function (node) {
          var props = node.props || {}
          if (typeof props.className === 'string' && /(^| )dsh-claude-settings-row( |$)/.test(props.className)) {
            r.peer.settings.rows.push(props.key)
            if (peerDisabled(props.children)) r.peer.settings.refusing.push(props.key)
            if (peerManages(props.children)) r.peer.settings.managed.push(props.key)
            r.peer.settings.answers[props.key] = peerAnswer(props.children)
          }
        })
        peerTexts(peerTree, r.peer.settings.texts)
      }
      peerChat.remove()
    })
    // The other owner of the page, a skin, from the first frame (D49): the theme
    // stands its whole visual down and keeps the settings section, then takes
    // the page back when the skin leaves.
    await onlyFor(['skin-center-handoff'], async function () {
      // The settings section registers through ctx.inject, so its seat appears
      // on a later turn than apply() returns.
      await sleep(400)
      var owner = {
        sheet: document.getElementById('dsh-claude-style-style') !== null,
        live: document.body.hasAttribute('data-dsh-claude-style'),
        handoff: document.body.hasAttribute('data-dsh-claude-style-handoff'),
        bodyAttrs: attrs(document.body),
        settingsRegistered: typeof (window.__slotComponents || {})['claude-style'] !== 'undefined',
        uncaught: window.__uncaught.length,
      }
      // The owner leaves: the theme takes the page back in one observer turn.
      document.documentElement.removeAttribute('data-dsh-skin')
      await sleep(300)
      owner.afterRelease = {
        sheet: document.getElementById('dsh-claude-style-style') !== null,
        live: document.body.hasAttribute('data-dsh-claude-style'),
        handoff: document.body.hasAttribute('data-dsh-claude-style-handoff'),
      }
      // And it returns: the theme gives the page back without a reload.
      document.documentElement.setAttribute('data-dsh-skin', 'blue-fantasy')
      await sleep(300)
      owner.afterReturn = {
        sheet: document.getElementById('dsh-claude-style-style') !== null,
        live: document.body.hasAttribute('data-dsh-claude-style'),
      }
      r.owner = owner
    })
    // The other owner arriving after the theme took the page (D49): the watch
    // follows a flip whichever way the page booted.
    await onlyFor(['skin-center-arrival'], async function () {
      await sleep(400)
      var arrival = {
        before: {
          sheet: document.getElementById('dsh-claude-style-style') !== null,
          live: document.body.hasAttribute('data-dsh-claude-style'),
        },
      }
      document.documentElement.setAttribute('data-dsh-skin', 'blue-fantasy')
      await sleep(300)
      arrival.yielded = {
        sheet: document.getElementById('dsh-claude-style-style') !== null,
        live: document.body.hasAttribute('data-dsh-claude-style'),
        handoff: document.body.hasAttribute('data-dsh-claude-style-handoff'),
        settingsRegistered: typeof (window.__slotComponents || {})['claude-style'] !== 'undefined',
      }
      document.documentElement.removeAttribute('data-dsh-skin')
      await sleep(300)
      arrival.back = {
        sheet: document.getElementById('dsh-claude-style-style') !== null,
        live: document.body.hasAttribute('data-dsh-claude-style'),
      }
      r.arrival = arrival
    })
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
      r.leftMarkers = document.querySelectorAll('[data-dsh-claude-footer-entry], [data-dsh-claude-footer-hidden], [data-dsh-claude-footer-overlay], [data-dsh-claude-model-host], [data-dsh-claude-account-host-row], [data-dsh-claude-context-stats], [data-dsh-claude-motion], [data-dsh-claude-turn-state], [data-dsh-claude-turn-status], [style*="--dsh-claude-turn-order"], [data-dsh-claude-deepy-anchor], [data-dsh-claude-crab-anchor]').length
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
      // The host removes every tag carrying this package's id when the package
      // reloads (client-modules' `removeOwnedStyles`); the sibling's sheet must
      // not be among them, whether that step runs before or after the teardown.
      var tagsOwned = document.querySelectorAll('style[data-plugin]')
      for (var to = 0; to < tagsOwned.length; to++) {
        if (tagsOwned[to].getAttribute('data-plugin') === 'dsh-claude-style') tagsOwned[to].remove()
      }
      r.siblingSheetSurvives = !!siblingSheet && siblingSheet.isConnected
      if (siblingSheet) siblingSheet.remove()
    }
    return r
  })()
})()
