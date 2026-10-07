/**
 * The page's first two collections: the served-namespace read the late-forms
 * case makes before the host's directory has answered, and the popovers case's
 * arbitration between the permission card, the account drawer and the hero
 * row's own host menus.
 */
(function () {
  var probe = window.__dshSmokeProbe
  var sleep = probe.sleep
  var r = probe.report

  probe.step(async function () {
    await probe.onlyFor(['late-forms'], async function () {
      // The directory has not answered yet: the skin holds the defaults.
      r.lateBefore = document.body.getAttribute('data-dsh-claude-home-layout')
      window.__serveNamespace()
      // A pass is driven by a mutation, the way the live page drives one.
      document.body.appendChild(document.createElement('i'))
      await sleep(200)
      r.lateAfter = document.body.getAttribute('data-dsh-claude-home-layout')
    })
    await probe.onlyFor(['popovers'], async function () {
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
  })
})()
