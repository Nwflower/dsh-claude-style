/**
 * The host-API cases: the sync-fault case drives a session list that throws, and
 * the desktop case walks the 0.1.7 footer — the host's own account row, the menu
 * it portals, the container the skin injects into that menu, and the settings
 * dialog the host's shortcut opens.
 */
(function () {
  var probe = window.__dshSmokeProbe
  var sleep = probe.sleep
  var r = probe.report

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

  probe.step(async function () {
    await probe.onlyFor(['sync-fault'], async function () {
      // A sync is retired after failing three passes in a row: drive four.
      for (var n = 0; n < 4; n++) { document.body.appendChild(document.createElement('i')); await sleep(80) }
    })
    await probe.onlyFor(['desktop'], async function () {
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
      // Read through the CSSOM: the sheet's text is minified, and the parsed
      // rules are what the page applies.
      var styleEl = document.getElementById('dsh-claude-style-style')
      var sheetRules = styleEl && styleEl.sheet ? Array.prototype.slice.call(styleEl.sheet.cssRules) : []
      r.menuEntryKeyframes = sheetRules.some(function (rule) { return rule instanceof CSSKeyframesRule && rule.name === 'dsh-claude-account-menu-in' })
      r.menuEntryAnimation = sheetRules.some(function (rule) {
        return rule instanceof CSSStyleRule && rule.style.animationName === 'dsh-claude-account-menu-in' &&
          rule.style.animationDuration === '0.15s' && rule.style.animationTimingFunction === 'ease'
      })
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
  })
})()
